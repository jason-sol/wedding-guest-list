"use strict";
/**
 * Backup service with automated scheduling and file management.
 * Provides backup creation, restoration, deletion, and listing.
 * Uses singleton pattern (like sessionStore.ts).
 */
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
exports.getBackupService = getBackupService;
exports.resetBackupService = resetBackupService;
const fs = __importStar(require("fs/promises"));
const path = __importStar(require("path"));
const config_1 = require("./config");
const store_1 = require("./store");
const validation_1 = require("./validation");
class BackupService {
    constructor() {
        this.scheduledTimer = null;
        this.initialized = false;
        const config = (0, config_1.getConfig)();
        this.backupDir = path.join(config.data.directory, 'backups');
    }
    async initialize() {
        if (this.initialized)
            return;
        await fs.mkdir(this.backupDir, { recursive: true });
        this.scheduleNextBackup();
        this.initialized = true;
        console.log('Backup service initialized');
    }
    async createBackup() {
        await fs.mkdir(this.backupDir, { recursive: true });
        // Flush store to ensure data.json is current
        await store_1.store.flush();
        const config = (0, config_1.getConfig)();
        const now = new Date();
        const timestamp = now.toISOString().replace(/[T:]/g, '-').replace(/\..+/, '');
        const filename = `data-backup-${timestamp}.json`;
        const backupPath = path.join(this.backupDir, filename);
        // Read current data file and write to backup
        const data = await fs.readFile(config.data.filePath, 'utf-8');
        await fs.writeFile(backupPath, data, 'utf-8');
        // Enforce max backups
        await this.enforceMaxBackups();
        const stat = await fs.stat(backupPath);
        return {
            filename,
            timestamp: now.toISOString(),
            size: stat.size,
        };
    }
    async listBackups() {
        try {
            await fs.mkdir(this.backupDir, { recursive: true });
            const files = await fs.readdir(this.backupDir);
            const backups = [];
            for (const file of files) {
                if (!validation_1.BACKUP_FILENAME_REGEX.test(file))
                    continue;
                const filePath = path.join(this.backupDir, file);
                const stat = await fs.stat(filePath);
                backups.push({
                    filename: file,
                    timestamp: stat.mtime.toISOString(),
                    size: stat.size,
                });
            }
            // Sort newest first
            backups.sort((a, b) => b.timestamp.localeCompare(a.timestamp));
            return backups;
        }
        catch (error) {
            if (error.code === 'ENOENT') {
                return [];
            }
            throw error;
        }
    }
    async restoreFromBackup(filename) {
        // Validate filename format (prevents path traversal)
        if (!validation_1.BACKUP_FILENAME_REGEX.test(filename)) {
            throw new Error('Invalid backup filename');
        }
        const backupPath = path.join(this.backupDir, filename);
        // Read backup data into memory BEFORE creating safety backup,
        // because the safety backup triggers enforceMaxBackups() which
        // could delete this file if we're at the limit.
        let rawData;
        try {
            rawData = await fs.readFile(backupPath, 'utf-8');
        }
        catch {
            throw new Error('Backup file not found');
        }
        const data = JSON.parse(rawData);
        // Create safety backup before restoring
        await this.createBackup();
        // Use store's importData to restore
        store_1.store.importData({
            guests: data.guests || [],
            families: data.families || [],
            categories: data.categories || [],
            users: data.users || [],
            events: data.events || [],
            permissions: data.permissions || [],
        });
        // Restore backup settings if present
        if (data.backupSettings) {
            store_1.store.updateBackupSettings(data.backupSettings);
        }
        console.log(`Restored from backup: ${filename}`);
    }
    async deleteBackup(filename) {
        // Validate filename format (prevents path traversal)
        if (!validation_1.BACKUP_FILENAME_REGEX.test(filename)) {
            throw new Error('Invalid backup filename');
        }
        const backupPath = path.join(this.backupDir, filename);
        await fs.unlink(backupPath);
        console.log(`Deleted backup: ${filename}`);
    }
    async enforceMaxBackups() {
        const settings = store_1.store.getBackupSettings();
        const backups = await this.listBackups();
        // Delete oldest backups beyond max
        while (backups.length > settings.maxBackups) {
            const oldest = backups.pop();
            const oldestPath = path.join(this.backupDir, oldest.filename);
            try {
                await fs.unlink(oldestPath);
                console.log(`Removed old backup: ${oldest.filename}`);
            }
            catch (error) {
                console.error(`Failed to remove old backup ${oldest.filename}:`, error);
            }
        }
    }
    scheduleNextBackup() {
        if (this.scheduledTimer) {
            clearTimeout(this.scheduledTimer);
            this.scheduledTimer = null;
        }
        const settings = store_1.store.getBackupSettings();
        if (!settings.enabled)
            return;
        const [hours, minutes] = settings.backupTime.split(':').map(Number);
        const now = new Date();
        const next = new Date();
        next.setHours(hours, minutes, 0, 0);
        // If the time has already passed today, schedule for tomorrow
        if (next.getTime() <= now.getTime()) {
            next.setDate(next.getDate() + 1);
        }
        const delay = next.getTime() - now.getTime();
        this.scheduledTimer = setTimeout(async () => {
            try {
                console.log('Running scheduled backup...');
                await this.createBackup();
                console.log('Scheduled backup completed');
            }
            catch (error) {
                console.error('Scheduled backup failed:', error);
            }
            // Re-schedule for the next day
            this.scheduleNextBackup();
        }, delay);
        // Don't prevent process exit
        this.scheduledTimer.unref();
    }
    async shutdown() {
        if (this.scheduledTimer) {
            clearTimeout(this.scheduledTimer);
            this.scheduledTimer = null;
        }
        const settings = store_1.store.getBackupSettings();
        if (settings.enabled) {
            try {
                await this.createBackup();
                console.log('Shutdown backup created');
            }
            catch (error) {
                console.error('Failed to create shutdown backup:', error);
            }
        }
    }
}
// Singleton instance
let serviceInstance = null;
function getBackupService() {
    if (!serviceInstance) {
        serviceInstance = new BackupService();
    }
    return serviceInstance;
}
function resetBackupService() {
    if (serviceInstance) {
        serviceInstance.shutdown().catch(console.error);
    }
    serviceInstance = null;
}
