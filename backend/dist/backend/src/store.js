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
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const DATA_FILE = path.join(__dirname, '../../data.json');
// Simple in-memory data store with JSON file persistence
class DataStore {
    constructor() {
        this.guests = new Map();
        this.families = new Map();
        this.nextGuestId = 1;
        this.nextFamilyId = 1;
        this.loadFromFile();
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
    // Clear all data (useful for testing)
    clear() {
        this.guests.clear();
        this.families.clear();
        this.nextGuestId = 1;
        this.nextFamilyId = 1;
        if (fs.existsSync(DATA_FILE)) {
            fs.unlinkSync(DATA_FILE);
        }
    }
}
exports.store = new DataStore();
