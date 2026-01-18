/**
 * Permission middleware for event-level access control.
 */

import { Request, Response, NextFunction } from 'express';
import { PermissionLevel } from '../../../shared/types/index';
import { store } from '../store';
import { sendForbidden, sendUnauthorized } from '../apiResponse';

// Permission level hierarchy (higher index = more permissions)
const PERMISSION_LEVELS: PermissionLevel[] = ['none', 'viewer', 'admin'];

/**
 * Middleware to require owner access.
 * Owner is the user configured via AUTH_USERNAME/AUTH_PASSWORD env vars.
 */
export function requireOwner(req: Request, res: Response, next: NextFunction): void {
  if (!req.user) {
    sendUnauthorized(res, 'Authentication required');
    return;
  }

  if (!req.user.isOwner) {
    sendForbidden(res, 'Owner access required');
    return;
  }

  next();
}

/**
 * Middleware factory to require a minimum permission level for an event.
 * The eventId is extracted from req.params.eventId.
 *
 * @param minLevel - Minimum permission level required ('viewer' or 'admin')
 */
export function requireEventPermission(minLevel: PermissionLevel) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      sendUnauthorized(res, 'Authentication required');
      return;
    }

    // Owner has full access to all events
    if (req.user.isOwner) {
      next();
      return;
    }

    const eventId = req.params.eventId;
    if (!eventId) {
      sendForbidden(res, 'Event ID required');
      return;
    }

    // Check if event exists
    const event = store.getEvent(eventId);
    if (!event) {
      sendForbidden(res, 'Event not found');
      return;
    }

    // Get user's permission for this event
    const userPermission = store.getPermission(req.user.userId, eventId);
    const userLevel = PERMISSION_LEVELS.indexOf(userPermission);
    const requiredLevel = PERMISSION_LEVELS.indexOf(minLevel);

    if (userLevel < requiredLevel) {
      if (userPermission === 'none') {
        sendForbidden(res, 'You do not have access to this event. Please contact the owner to request access.');
      } else {
        sendForbidden(res, `This action requires ${minLevel} access. You have ${userPermission} access.`);
      }
      return;
    }

    next();
  };
}

/**
 * Middleware to check if user can edit (admin or owner).
 * Shorthand for requireEventPermission('admin').
 */
export const requireEventAdmin = requireEventPermission('admin');

/**
 * Middleware to check if user can view (viewer, admin, or owner).
 * Shorthand for requireEventPermission('viewer').
 */
export const requireEventViewer = requireEventPermission('viewer');
