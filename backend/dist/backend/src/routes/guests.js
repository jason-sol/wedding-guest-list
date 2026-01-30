"use strict";
/**
 * Event-scoped guest routes.
 * All routes are prefixed with /api/events/:eventId/guests
 * Read operations require viewer+ permission.
 * Write operations require admin+ permission.
 */
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const sync_1 = require("csv-parse/sync");
const store_1 = require("../store");
const capitalize_1 = require("../../../shared/utils/capitalize");
const validation_1 = require("../validation");
const apiResponse_1 = require("../apiResponse");
const permissions_1 = require("../middleware/permissions");
// Router with mergeParams to access :eventId from parent
const router = (0, express_1.Router)({ mergeParams: true });
// Helper function to sort guests by last name
function sortGuests(guests) {
    return [...guests].sort((a, b) => {
        // Handle guests without last names (put them at the end)
        const aLastName = a.lastName || '';
        const bLastName = b.lastName || '';
        return aLastName.localeCompare(bLastName);
    });
}
// GET /api/events/:eventId/guests - Get all guests for an event (viewer+)
router.get('/', permissions_1.requireEventViewer, (req, res) => {
    const eventId = req.params.eventId;
    const guests = store_1.store.getGuestsForEvent(eventId);
    const sortedGuests = sortGuests(guests);
    (0, apiResponse_1.sendSuccess)(res, sortedGuests);
});
// GET /api/events/:eventId/guests/presence - Get presence info for all guests in this event (viewer+)
router.get('/presence', permissions_1.requireEventViewer, (req, res) => {
    const eventId = req.params.eventId;
    const eventGuests = store_1.store.getGuestsForEvent(eventId);
    const allGuests = store_1.store.getAllGuests();
    const allEvents = store_1.store.getAllEvents();
    // Build a map of guest name -> array of guests in other events
    const guestNameToGuestsInOtherEvents = new Map();
    // First, group all guests by normalized name
    for (const guest of allGuests) {
        const key = `${guest.firstName.toLowerCase()} ${guest.lastName.toLowerCase()}`.trim();
        if (!key)
            continue;
        if (!guestNameToGuestsInOtherEvents.has(key)) {
            guestNameToGuestsInOtherEvents.set(key, []);
        }
        guestNameToGuestsInOtherEvents.get(key).push(guest);
    }
    // Convert to response format: guestId -> [{id: eventId, name: eventName, guestId: guestIdInThatEvent}]
    const result = {};
    // For each guest in the current event, find other events they're in (that user can view)
    for (const guest of eventGuests) {
        const key = `${guest.firstName.toLowerCase()} ${guest.lastName.toLowerCase()}`.trim();
        if (!key)
            continue;
        const guestsWithSameName = guestNameToGuestsInOtherEvents.get(key);
        if (!guestsWithSameName)
            continue;
        // Use a Map to deduplicate by event ID (keep only one guest per event)
        const otherEventEntriesMap = new Map();
        for (const otherGuest of guestsWithSameName) {
            if (otherGuest.eventId === eventId)
                continue; // Skip current event
            if (otherEventEntriesMap.has(otherGuest.eventId))
                continue; // Skip if we already have this event
            // Check if user has at least viewer permission on this event
            let hasAccess = false;
            if (req.user?.isOwner) {
                hasAccess = true;
            }
            else {
                const perm = store_1.store.getPermission(req.user.userId, otherGuest.eventId);
                if (perm !== 'none') {
                    hasAccess = true;
                }
            }
            if (hasAccess) {
                const event = allEvents.find(e => e.id === otherGuest.eventId);
                if (event) {
                    otherEventEntriesMap.set(otherGuest.eventId, {
                        id: event.id,
                        name: event.name,
                        guestId: otherGuest.id,
                    });
                }
            }
        }
        if (otherEventEntriesMap.size > 0) {
            result[guest.id] = Array.from(otherEventEntriesMap.values());
        }
    }
    (0, apiResponse_1.sendSuccess)(res, result);
});
// GET /api/events/:eventId/guests/:id - Get a specific guest (viewer+)
router.get('/:id', permissions_1.requireEventViewer, (req, res) => {
    const guest = store_1.store.getGuest(req.params.id);
    if (!guest) {
        return (0, apiResponse_1.sendNotFound)(res, 'Guest');
    }
    // Verify guest belongs to this event
    if (guest.eventId !== req.params.eventId) {
        return (0, apiResponse_1.sendNotFound)(res, 'Guest');
    }
    (0, apiResponse_1.sendSuccess)(res, guest);
});
// POST /api/events/:eventId/guests - Add a new guest (admin+)
router.post('/', permissions_1.requireEventAdmin, (req, res) => {
    const eventId = req.params.eventId;
    // Verify event exists
    const event = store_1.store.getEvent(eventId);
    if (!event) {
        return (0, apiResponse_1.sendNotFound)(res, 'Event');
    }
    const validation = (0, validation_1.validate)(validation_1.CreateGuestSchema, req.body);
    if (!validation.success) {
        return (0, apiResponse_1.sendValidationError)(res, validation.error, validation.details);
    }
    const { firstName, lastName, familyId, tags, rsvp, dietaryRequirements } = validation.data;
    // If familyId provided, verify it belongs to this event
    if (familyId) {
        const family = store_1.store.getFamily(familyId);
        if (!family || family.eventId !== eventId) {
            return (0, apiResponse_1.sendError)(res, 'Family not found or does not belong to this event', 400);
        }
    }
    // Check if a guest with the same name exists in other events to inherit tags
    // Tags represent relationship/location which should be consistent across events
    const normalizedFirstName = (0, capitalize_1.capitalizeWords)(firstName || '').toLowerCase();
    const normalizedLastName = (0, capitalize_1.capitalizeWords)(lastName || '').toLowerCase();
    let inheritedTags = tags || [];
    if (!tags || tags.length === 0) {
        const allGuests = store_1.store.getAllGuests();
        const existingGuest = allGuests.find(g => g.firstName.toLowerCase() === normalizedFirstName &&
            g.lastName.toLowerCase() === normalizedLastName);
        if (existingGuest && existingGuest.tags.length > 0) {
            inheritedTags = existingGuest.tags;
        }
    }
    // Capitalize names
    const guest = store_1.store.addGuest({
        eventId,
        firstName: (0, capitalize_1.capitalizeWords)(firstName || ''),
        lastName: (0, capitalize_1.capitalizeWords)(lastName || ''),
        familyId: familyId || null,
        tags: inheritedTags,
        rsvp,
        dietaryRequirements,
    });
    // If added to a family, update the family's member list
    if (familyId) {
        const family = store_1.store.getFamily(familyId);
        if (family && !family.members.includes(guest.id)) {
            store_1.store.updateFamily(familyId, {
                members: [...family.members, guest.id],
            });
        }
    }
    (0, apiResponse_1.sendCreated)(res, guest);
});
// PUT /api/events/:eventId/guests/:id - Update a guest (admin+)
router.put('/:id', permissions_1.requireEventAdmin, (req, res) => {
    const eventId = req.params.eventId;
    const guest = store_1.store.getGuest(req.params.id);
    if (!guest) {
        return (0, apiResponse_1.sendNotFound)(res, 'Guest');
    }
    // Verify guest belongs to this event
    if (guest.eventId !== eventId) {
        return (0, apiResponse_1.sendNotFound)(res, 'Guest');
    }
    const validation = (0, validation_1.validate)(validation_1.UpdateGuestSchema, req.body);
    if (!validation.success) {
        return (0, apiResponse_1.sendValidationError)(res, validation.error, validation.details);
    }
    const { firstName, lastName, familyId, tags, rsvp, dietaryRequirements } = validation.data;
    // If familyId provided, verify it belongs to this event
    if (familyId !== undefined && familyId !== null) {
        const family = store_1.store.getFamily(familyId);
        if (!family || family.eventId !== eventId) {
            return (0, apiResponse_1.sendError)(res, 'Family not found or does not belong to this event', 400);
        }
    }
    const updates = {};
    if (firstName !== undefined)
        updates.firstName = (0, capitalize_1.capitalizeWords)(firstName);
    if (lastName !== undefined)
        updates.lastName = (0, capitalize_1.capitalizeWords)(lastName);
    if (familyId !== undefined)
        updates.familyId = familyId;
    if (tags !== undefined)
        updates.tags = tags;
    if (rsvp !== undefined)
        updates.rsvp = rsvp;
    if (dietaryRequirements !== undefined)
        updates.dietaryRequirements = dietaryRequirements;
    // Handle family membership changes
    const oldFamilyId = guest.familyId;
    const newFamilyId = updates.familyId !== undefined ? updates.familyId : oldFamilyId;
    if (oldFamilyId !== newFamilyId) {
        // Remove from old family
        if (oldFamilyId) {
            const oldFamily = store_1.store.getFamily(oldFamilyId);
            if (oldFamily) {
                store_1.store.updateFamily(oldFamilyId, {
                    members: oldFamily.members.filter(id => id !== guest.id),
                });
            }
        }
        // Add to new family
        if (newFamilyId) {
            const newFamily = store_1.store.getFamily(newFamilyId);
            if (newFamily && !newFamily.members.includes(guest.id)) {
                store_1.store.updateFamily(newFamilyId, {
                    members: [...newFamily.members, guest.id],
                });
            }
        }
    }
    const updated = store_1.store.updateGuest(req.params.id, updates);
    if (!updated) {
        return (0, apiResponse_1.sendNotFound)(res, 'Guest');
    }
    // Sync tags across all events for guests with the same name
    // Tags represent relationship/location which should be consistent across events
    if (tags !== undefined) {
        const guestFirstName = updated.firstName.toLowerCase();
        const guestLastName = updated.lastName.toLowerCase();
        const allGuests = store_1.store.getAllGuests();
        for (const otherGuest of allGuests) {
            // Skip the guest we just updated and guests in the same event
            if (otherGuest.id === updated.id)
                continue;
            // Match by name (case-insensitive)
            if (otherGuest.firstName.toLowerCase() === guestFirstName &&
                otherGuest.lastName.toLowerCase() === guestLastName) {
                store_1.store.updateGuest(otherGuest.id, { tags });
            }
        }
    }
    (0, apiResponse_1.sendSuccess)(res, updated);
});
// PUT /api/events/:eventId/guests/:id/rsvp - Update guest RSVP (admin+)
router.put('/:id/rsvp', permissions_1.requireEventAdmin, (req, res) => {
    const eventId = req.params.eventId;
    const guest = store_1.store.getGuest(req.params.id);
    if (!guest) {
        return (0, apiResponse_1.sendNotFound)(res, 'Guest');
    }
    // Verify guest belongs to this event
    if (guest.eventId !== eventId) {
        return (0, apiResponse_1.sendNotFound)(res, 'Guest');
    }
    const { rsvp } = req.body;
    if (!['pending', 'accepted', 'declined'].includes(rsvp)) {
        return (0, apiResponse_1.sendValidationError)(res, 'RSVP must be pending, accepted, or declined');
    }
    const updated = store_1.store.updateGuest(req.params.id, { rsvp });
    if (!updated) {
        return (0, apiResponse_1.sendNotFound)(res, 'Guest');
    }
    (0, apiResponse_1.sendSuccess)(res, updated);
});
// POST /api/events/:eventId/guests/bulk-rsvp - Update RSVP for multiple guests (admin+)
router.post('/bulk-rsvp', permissions_1.requireEventAdmin, (req, res) => {
    const eventId = req.params.eventId;
    const validation = (0, validation_1.validate)(validation_1.BulkRsvpUpdateSchema, req.body);
    if (!validation.success) {
        return (0, apiResponse_1.sendValidationError)(res, validation.error, validation.details);
    }
    const { guestIds, rsvp } = validation.data;
    const updatedGuests = [];
    const errors = [];
    for (const guestId of guestIds) {
        const guest = store_1.store.getGuest(guestId);
        if (!guest) {
            errors.push(`Guest ${guestId} not found`);
            continue;
        }
        if (guest.eventId !== eventId) {
            errors.push(`Guest ${guestId} does not belong to this event`);
            continue;
        }
        const updated = store_1.store.updateGuest(guestId, { rsvp });
        if (updated) {
            updatedGuests.push(updated);
        }
        else {
            errors.push(`Failed to update guest ${guestId}`);
        }
    }
    (0, apiResponse_1.sendSuccess)(res, {
        updated: updatedGuests.length,
        guests: updatedGuests,
        errors: errors.length > 0 ? errors : undefined,
    });
});
// POST /api/events/:eventId/guests/:id/copy - Copy a guest to another event (admin+ on target)
router.post('/:id/copy', permissions_1.requireEventViewer, (req, res) => {
    const sourceEventId = req.params.eventId;
    const guestId = req.params.id;
    const validation = (0, validation_1.validate)(validation_1.CopyGuestSchema, req.body);
    if (!validation.success) {
        return (0, apiResponse_1.sendValidationError)(res, validation.error, validation.details);
    }
    const { targetEventId } = validation.data;
    // Verify source guest exists and belongs to source event
    const sourceGuest = store_1.store.getGuest(guestId);
    if (!sourceGuest || sourceGuest.eventId !== sourceEventId) {
        return (0, apiResponse_1.sendNotFound)(res, 'Guest');
    }
    // Verify target event exists
    const targetEvent = store_1.store.getEvent(targetEventId);
    if (!targetEvent) {
        return (0, apiResponse_1.sendError)(res, 'Target event not found', 400);
    }
    // Check permission on target event (need admin to add guests there)
    if (!req.user?.isOwner) {
        const targetPermission = store_1.store.getPermission(req.user.userId, targetEventId);
        if (targetPermission !== 'admin') {
            return (0, apiResponse_1.sendError)(res, 'You need admin permission on the target event to copy guests there', 403);
        }
    }
    const copiedGuest = store_1.store.copyGuestToEvent(guestId, targetEventId);
    if (!copiedGuest) {
        return (0, apiResponse_1.sendError)(res, 'Failed to copy guest', 500);
    }
    (0, apiResponse_1.sendCreated)(res, copiedGuest);
});
// GET /api/events/:eventId/guests/:id/presence - Get which other events this guest appears in (by name)
router.get('/:id/presence', permissions_1.requireEventViewer, (req, res) => {
    const eventId = req.params.eventId;
    const guestId = req.params.id;
    const guest = store_1.store.getGuest(guestId);
    if (!guest || guest.eventId !== eventId) {
        return (0, apiResponse_1.sendNotFound)(res, 'Guest');
    }
    // Find other events with a guest of the same name
    const guestKey = `${guest.firstName.toLowerCase()} ${guest.lastName.toLowerCase()}`.trim();
    const allGuests = store_1.store.getAllGuests();
    const allEvents = store_1.store.getAllEvents();
    const otherEventIds = new Set();
    for (const otherGuest of allGuests) {
        if (otherGuest.eventId === eventId)
            continue; // Skip current event
        const otherKey = `${otherGuest.firstName.toLowerCase()} ${otherGuest.lastName.toLowerCase()}`.trim();
        if (otherKey === guestKey) {
            // Check if user has at least viewer permission on this event
            if (req.user?.isOwner) {
                otherEventIds.add(otherGuest.eventId);
            }
            else {
                const perm = store_1.store.getPermission(req.user.userId, otherGuest.eventId);
                if (perm !== 'none') {
                    otherEventIds.add(otherGuest.eventId);
                }
            }
        }
    }
    // Map event IDs to names
    const otherEvents = Array.from(otherEventIds)
        .map(id => allEvents.find(e => e.id === id))
        .filter((e) => e !== undefined)
        .map(e => ({ id: e.id, name: e.name }));
    (0, apiResponse_1.sendSuccess)(res, otherEvents);
});
// DELETE /api/events/:eventId/guests/:id - Delete a guest (admin+)
router.delete('/:id', permissions_1.requireEventAdmin, (req, res) => {
    const eventId = req.params.eventId;
    const guest = store_1.store.getGuest(req.params.id);
    if (!guest) {
        return (0, apiResponse_1.sendNotFound)(res, 'Guest');
    }
    // Verify guest belongs to this event
    if (guest.eventId !== eventId) {
        return (0, apiResponse_1.sendNotFound)(res, 'Guest');
    }
    const deleted = store_1.store.deleteGuest(req.params.id);
    if (!deleted) {
        return (0, apiResponse_1.sendNotFound)(res, 'Guest');
    }
    (0, apiResponse_1.sendNoContent)(res);
});
// Calculate similarity between two strings using Levenshtein distance
function calculateSimilarity(str1, str2) {
    const s1 = str1.toLowerCase();
    const s2 = str2.toLowerCase();
    if (s1 === s2)
        return 1;
    if (s1.length === 0 || s2.length === 0)
        return 0;
    // Create matrix
    const matrix = [];
    for (let i = 0; i <= s1.length; i++) {
        matrix[i] = [i];
    }
    for (let j = 0; j <= s2.length; j++) {
        matrix[0][j] = j;
    }
    // Fill matrix
    for (let i = 1; i <= s1.length; i++) {
        for (let j = 1; j <= s2.length; j++) {
            const cost = s1[i - 1] === s2[j - 1] ? 0 : 1;
            matrix[i][j] = Math.min(matrix[i - 1][j] + 1, // deletion
            matrix[i][j - 1] + 1, // insertion
            matrix[i - 1][j - 1] + cost // substitution
            );
        }
    }
    const distance = matrix[s1.length][s2.length];
    const maxLength = Math.max(s1.length, s2.length);
    return 1 - distance / maxLength;
}
// Find potential matches for a name with similarity scores
function findPotentialMatches(firstName, lastName, guests, threshold = 0.4) {
    const matches = [];
    const fullName = `${firstName} ${lastName}`.toLowerCase().trim();
    for (const guest of guests) {
        const guestFullName = `${guest.firstName} ${guest.lastName}`.toLowerCase().trim();
        // Calculate full name similarity
        const fullNameSimilarity = calculateSimilarity(fullName, guestFullName);
        // Calculate first name and last name similarities separately
        const firstNameSimilarity = calculateSimilarity(firstName.toLowerCase(), guest.firstName.toLowerCase());
        const lastNameSimilarity = calculateSimilarity(lastName.toLowerCase(), guest.lastName.toLowerCase());
        // Use the best of: full name match, or weighted first+last match
        const weightedPartsSimilarity = (firstNameSimilarity * 0.4 + lastNameSimilarity * 0.6);
        const similarity = Math.max(fullNameSimilarity, weightedPartsSimilarity);
        // Also check for substring matches (e.g., nickname in full name)
        const firstNameInGuest = guest.firstName.toLowerCase().includes(firstName.toLowerCase()) ||
            firstName.toLowerCase().includes(guest.firstName.toLowerCase());
        const lastNameInGuest = guest.lastName.toLowerCase().includes(lastName.toLowerCase()) ||
            lastName.toLowerCase().includes(guest.lastName.toLowerCase());
        // Boost similarity if there's a substring match
        let adjustedSimilarity = similarity;
        if (firstNameInGuest && firstName.length >= 2)
            adjustedSimilarity = Math.max(adjustedSimilarity, 0.5);
        if (lastNameInGuest && lastName.length >= 2)
            adjustedSimilarity = Math.max(adjustedSimilarity, 0.6);
        if (firstNameInGuest && lastNameInGuest)
            adjustedSimilarity = Math.max(adjustedSimilarity, 0.75);
        if (adjustedSimilarity >= threshold) {
            matches.push({
                guestId: guest.id,
                firstName: guest.firstName,
                lastName: guest.lastName,
                similarity: Math.round(adjustedSimilarity * 100) / 100,
            });
        }
    }
    // Sort by similarity descending, limit to top 5
    return matches
        .sort((a, b) => b.similarity - a.similarity)
        .slice(0, 5);
}
// Helper to map JOY RSVP status to our status
function mapJoyRsvpStatus(joyRsvp) {
    const normalized = (joyRsvp || '').toLowerCase().trim();
    if (normalized.includes('joyfully accept') ||
        normalized.includes('accept') ||
        normalized.includes('yes') ||
        normalized.includes('attending')) {
        return 'accepted';
    }
    if (normalized.includes('decline') ||
        normalized.includes('regretfully') ||
        normalized.includes('no') ||
        normalized.includes('not attending')) {
        return 'declined';
    }
    return 'pending';
}
// POST /api/events/:eventId/guests/import-joy - Import RSVP data from JOY CSV (admin+)
router.post('/import-joy', permissions_1.requireEventAdmin, (req, res) => {
    const eventId = req.params.eventId;
    // Verify event exists
    const event = store_1.store.getEvent(eventId);
    if (!event) {
        return (0, apiResponse_1.sendNotFound)(res, 'Event');
    }
    const validation = (0, validation_1.validate)(validation_1.JoyImportSchema, req.body);
    if (!validation.success) {
        return (0, apiResponse_1.sendValidationError)(res, validation.error, validation.details);
    }
    const { csvContent, dryRun } = validation.data;
    try {
        // Parse CSV with headers
        const records = (0, sync_1.parse)(csvContent, {
            columns: true,
            skip_empty_lines: true,
            trim: true,
            relax_column_count: true,
        });
        const guests = store_1.store.getGuestsForEvent(eventId);
        const results = {
            matched: [],
            unmatched: [],
            errors: [],
        };
        for (let rowIndex = 0; rowIndex < records.length; rowIndex++) {
            const row = records[rowIndex];
            // Handle various column name formats from JOY
            const firstName = (row['first name'] ||
                row['First Name'] ||
                row['firstName'] ||
                row['First_Name'] ||
                '').trim();
            const lastName = (row['last name'] ||
                row['Last Name'] ||
                row['lastName'] ||
                row['Last_Name'] ||
                '').trim();
            if (!firstName && !lastName) {
                // Skip rows without names (could be empty rows)
                continue;
            }
            // Get RSVP status from various possible column names
            const rsvpRaw = (row['rsvp'] ||
                row['RSVP'] ||
                row['Rsvp'] ||
                '').trim();
            // Get dietary requirements from various possible column names
            const dietaryRaw = (row['what are your dietary requirements? (allergies, gluten free, etc)'] ||
                row['dietary requirements'] ||
                row['Dietary Requirements'] ||
                row['dietary'] ||
                row['Dietary'] ||
                row['allergies'] ||
                row['Allergies'] ||
                '').trim();
            const rsvp = mapJoyRsvpStatus(rsvpRaw);
            // Find matching guest by name (case-insensitive)
            const matchingGuest = guests.find(g => g.firstName.toLowerCase() === firstName.toLowerCase() &&
                g.lastName.toLowerCase() === lastName.toLowerCase());
            if (matchingGuest) {
                results.matched.push({
                    guestId: matchingGuest.id,
                    name: `${firstName} ${lastName}`,
                    rsvp,
                    dietaryRequirements: dietaryRaw || undefined,
                    previousRsvp: matchingGuest.rsvp,
                });
                // Apply updates if not dry run
                if (!dryRun) {
                    const updates = { rsvp };
                    if (dietaryRaw) {
                        updates.dietaryRequirements = dietaryRaw;
                    }
                    store_1.store.updateGuest(matchingGuest.id, updates);
                }
            }
            else {
                // Find potential matches for manual resolution
                const potentialMatches = findPotentialMatches(firstName, lastName, guests);
                results.unmatched.push({
                    rowIndex,
                    firstName,
                    lastName,
                    rsvp,
                    dietaryRequirements: dietaryRaw || undefined,
                    potentialMatches,
                });
            }
        }
        (0, apiResponse_1.sendSuccess)(res, {
            dryRun,
            eventId,
            eventName: event.name,
            ...results,
            summary: {
                total: records.length,
                matched: results.matched.length,
                unmatched: results.unmatched.length,
                errors: results.errors.length,
            },
        });
    }
    catch (error) {
        console.error('CSV import error:', error);
        if (error instanceof Error) {
            (0, apiResponse_1.sendValidationError)(res, `Failed to parse CSV: ${error.message}`);
        }
        else {
            (0, apiResponse_1.sendServerError)(res, 'Failed to parse CSV file');
        }
    }
});
exports.default = router;
