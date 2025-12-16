"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.store = void 0;
const colors_1 = require("../../shared/utils/colors");
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const DATA_FILE = path.join(__dirname, '../../data/data.json');
// Default categories
const DEFAULT_CATEGORIES = [
    { name: 'Bridal Party', color: (0, colors_1.getCategoryColor)('Bridal Party') },
    { name: 'Bride Family', color: (0, colors_1.getCategoryColor)('Bride Family') },
    { name: 'Groom Family', color: (0, colors_1.getCategoryColor)('Groom Family') },
    { name: 'Church Friends', color: (0, colors_1.getCategoryColor)('Church Friends') },
    { name: 'Church Families', color: (0, colors_1.getCategoryColor)('Church Families') },
    { name: 'Sophie UTS', color: (0, colors_1.getCategoryColor)('Sophie UTS') },
    { name: 'Sophie High School', color: (0, colors_1.getCategoryColor)('Sophie High School') },
    { name: 'Sophie Other', color: (0, colors_1.getCategoryColor)('Sophie Other') },
    { name: 'Jason High School', color: (0, colors_1.getCategoryColor)('Jason High School') },
    { name: 'Jason UNSW', color: (0, colors_1.getCategoryColor)('Jason UNSW') },
    { name: 'Jason Other', color: (0, colors_1.getCategoryColor)('Jason Other') },
];
// Simple in-memory data store with JSON file persistence
class DataStore {
    constructor() {
        this.guests = new Map();
        this.families = new Map();
        this.categories = new Map();
        this.nextGuestId = 1;
        this.nextFamilyId = 1;
        this.initializeDefaultCategories();
        this.loadFromFile();
    }
    initializeDefaultCategories() {
        DEFAULT_CATEGORIES.forEach(cat => {
            this.categories.set(cat.name.toLowerCase(), cat);
        });
    }
    loadFromFile() {
        try {
            if (fs.existsSync(DATA_FILE)) {
                const data = JSON.parse(fs.readFileSync(DATA_FILE, 'utf-8'));
                // Load guests
                if (data.guests && Array.isArray(data.guests)) {
                    data.guests.forEach((guest) => {
                        this.guests.set(guest.id, guest);
                        const idNum = parseInt(guest.id.replace('guest-', ''));
                        if (idNum >= this.nextGuestId) {
                            this.nextGuestId = idNum + 1;
                        }
                    });
                }
                // Load families
                if (data.families && Array.isArray(data.families)) {
                    data.families.forEach((family) => {
                        this.families.set(family.id, family);
                        const idNum = parseInt(family.id.replace('family-', ''));
                        if (idNum >= this.nextFamilyId) {
                            this.nextFamilyId = idNum + 1;
                        }
                    });
                }
                // Load categories
                if (data.categories && Array.isArray(data.categories)) {
                    data.categories.forEach((category) => {
                        this.categories.set(category.name.toLowerCase(), category);
                    });
                }
                else {
                    // If no categories in file, use defaults
                    this.initializeDefaultCategories();
                }
            }
        }
        catch (error) {
            console.error('Error loading data from file:', error);
        }
    }
    saveToFile() {
        try {
            const dataDir = path.dirname(DATA_FILE);
            if (!fs.existsSync(dataDir)) {
                fs.mkdirSync(dataDir, { recursive: true });
            }
            const data = {
                guests: Array.from(this.guests.values()),
                families: Array.from(this.families.values()),
                categories: Array.from(this.categories.values()),
            };
            fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2), 'utf-8');
        }
        catch (error) {
            console.error('Error saving data to file:', error);
        }
    }
    // Guest operations
    addGuest(guest) {
        const id = `guest-${this.nextGuestId++}`;
        const newGuest = { ...guest, id };
        this.guests.set(id, newGuest);
        this.saveToFile();
        return newGuest;
    }
    getGuest(id) {
        return this.guests.get(id);
    }
    getAllGuests() {
        return Array.from(this.guests.values());
    }
    updateGuest(id, updates) {
        const guest = this.guests.get(id);
        if (!guest)
            return null;
        const updated = { ...guest, ...updates };
        this.guests.set(id, updated);
        this.saveToFile();
        return updated;
    }
    deleteGuest(id) {
        const deleted = this.guests.delete(id);
        if (deleted) {
            this.saveToFile();
        }
        return deleted;
    }
    // Family operations
    addFamily(family) {
        const id = `family-${this.nextFamilyId++}`;
        const newFamily = { ...family, id };
        this.families.set(id, newFamily);
        this.saveToFile();
        return newFamily;
    }
    getFamily(id) {
        return this.families.get(id);
    }
    getAllFamilies() {
        return Array.from(this.families.values());
    }
    updateFamily(id, updates) {
        const family = this.families.get(id);
        if (!family)
            return null;
        const updated = { ...family, ...updates };
        this.families.set(id, updated);
        this.saveToFile();
        return updated;
    }
    deleteFamily(id) {
        const deleted = this.families.delete(id);
        if (deleted) {
            this.saveToFile();
        }
        return deleted;
    }
    // Category operations
    getAllCategories() {
        return Array.from(this.categories.values()).sort((a, b) => a.name.localeCompare(b.name));
    }
    getCategory(name) {
        return this.categories.get(name.toLowerCase());
    }
    addCategory(category) {
        this.categories.set(category.name.toLowerCase(), category);
        this.saveToFile();
        return category;
    }
    deleteCategory(name) {
        const deleted = this.categories.delete(name.toLowerCase());
        if (deleted) {
            this.saveToFile();
        }
        return deleted;
    }
    // Clear all data (useful for testing)
    clear() {
        this.guests.clear();
        this.families.clear();
        this.categories.clear();
        this.nextGuestId = 1;
        this.nextFamilyId = 1;
        this.initializeDefaultCategories();
        if (fs.existsSync(DATA_FILE)) {
            fs.unlinkSync(DATA_FILE);
        }
    }
}
exports.store = new DataStore();
