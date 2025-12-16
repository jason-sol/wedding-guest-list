import { Guest, Family } from '../../shared/types/index';
import * as fs from 'fs';
import * as path from 'path';

const DATA_FILE = path.join(__dirname, '../../data.json');

// Simple in-memory data store with JSON file persistence
class DataStore {
  private guests: Map<string, Guest> = new Map();
  private families: Map<string, Family> = new Map();
  private nextGuestId = 1;
  private nextFamilyId = 1;

  constructor() {
    this.loadFromFile();
  }

  private loadFromFile(): void {
    try {
      if (fs.existsSync(DATA_FILE)) {
        const data = JSON.parse(fs.readFileSync(DATA_FILE, 'utf-8'));
        
        // Load guests
        if (data.guests && Array.isArray(data.guests)) {
          data.guests.forEach((guest: Guest) => {
            this.guests.set(guest.id, guest);
            const idNum = parseInt(guest.id.replace('guest-', ''));
            if (idNum >= this.nextGuestId) {
              this.nextGuestId = idNum + 1;
            }
          });
        }

        // Load families
        if (data.families && Array.isArray(data.families)) {
          data.families.forEach((family: Family) => {
            this.families.set(family.id, family);
            const idNum = parseInt(family.id.replace('family-', ''));
            if (idNum >= this.nextFamilyId) {
              this.nextFamilyId = idNum + 1;
            }
          });
        }
      }
    } catch (error) {
      console.error('Error loading data from file:', error);
    }
  }

  private saveToFile(): void {
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
    } catch (error) {
      console.error('Error saving data to file:', error);
    }
  }

  // Guest operations
  addGuest(guest: Omit<Guest, 'id'>): Guest {
    const id = `guest-${this.nextGuestId++}`;
    const newGuest: Guest = { ...guest, id };
    this.guests.set(id, newGuest);
    this.saveToFile();
    return newGuest;
  }

  getGuest(id: string): Guest | undefined {
    return this.guests.get(id);
  }

  getAllGuests(): Guest[] {
    return Array.from(this.guests.values());
  }

  updateGuest(id: string, updates: Partial<Omit<Guest, 'id'>>): Guest | null {
    const guest = this.guests.get(id);
    if (!guest) return null;
    const updated = { ...guest, ...updates };
    this.guests.set(id, updated);
    this.saveToFile();
    return updated;
  }

  deleteGuest(id: string): boolean {
    const deleted = this.guests.delete(id);
    if (deleted) {
      this.saveToFile();
    }
    return deleted;
  }

  // Family operations
  addFamily(family: Omit<Family, 'id'>): Family {
    const id = `family-${this.nextFamilyId++}`;
    const newFamily: Family = { ...family, id };
    this.families.set(id, newFamily);
    this.saveToFile();
    return newFamily;
  }

  getFamily(id: string): Family | undefined {
    return this.families.get(id);
  }

  getAllFamilies(): Family[] {
    return Array.from(this.families.values());
  }

  updateFamily(id: string, updates: Partial<Omit<Family, 'id'>>): Family | null {
    const family = this.families.get(id);
    if (!family) return null;
    const updated = { ...family, ...updates };
    this.families.set(id, updated);
    this.saveToFile();
    return updated;
  }

  deleteFamily(id: string): boolean {
    const deleted = this.families.delete(id);
    if (deleted) {
      this.saveToFile();
    }
    return deleted;
  }

  // Clear all data (useful for testing)
  clear(): void {
    this.guests.clear();
    this.families.clear();
    this.nextGuestId = 1;
    this.nextFamilyId = 1;
    if (fs.existsSync(DATA_FILE)) {
      fs.unlinkSync(DATA_FILE);
    }
  }
}

export const store = new DataStore();
