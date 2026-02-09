/**
 * Backup service with automated scheduling and file management.
 * Provides backup creation, restoration, deletion, and listing.
 * Uses singleton pattern (like sessionStore.ts).
 */

import * as fs from 'fs/promises';
import * as path from 'path';
import { getConfig } from './config';
import { store } from './store';
import { BACKUP_FILENAME_REGEX } from './validation';

export interface BackupInfo {
  filename: string;
  timestamp: string;
  size: number;
}

class BackupService {
  private backupDir: string;
  private scheduledTimer: NodeJS.Timeout | null = null;
  private initialized = false;

  constructor() {
    const config = getConfig();
    this.backupDir = path.join(config.data.directory, 'backups');
  }

  async initialize(): Promise<void> {
    if (this.initialized) return;

    await fs.mkdir(this.backupDir, { recursive: true });
    this.scheduleNextBackup();
    this.initialized = true;
    console.log('Backup service initialized');
  }

  async createBackup(): Promise<BackupInfo> {
    await fs.mkdir(this.backupDir, { recursive: true });

    // Flush store to ensure data.json is current
    await store.flush();

    const config = getConfig();
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

  async listBackups(): Promise<BackupInfo[]> {
    try {
      await fs.mkdir(this.backupDir, { recursive: true });
      const files = await fs.readdir(this.backupDir);

      const backups: BackupInfo[] = [];
      for (const file of files) {
        if (!BACKUP_FILENAME_REGEX.test(file)) continue;

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
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        return [];
      }
      throw error;
    }
  }

  async restoreFromBackup(filename: string): Promise<void> {
    // Validate filename format (prevents path traversal)
    if (!BACKUP_FILENAME_REGEX.test(filename)) {
      throw new Error('Invalid backup filename');
    }

    const backupPath = path.join(this.backupDir, filename);

    // Read backup data into memory BEFORE creating safety backup,
    // because the safety backup triggers enforceMaxBackups() which
    // could delete this file if we're at the limit.
    let rawData: string;
    try {
      rawData = await fs.readFile(backupPath, 'utf-8');
    } catch {
      throw new Error('Backup file not found');
    }
    const data = JSON.parse(rawData);

    // Create safety backup before restoring
    await this.createBackup();

    // Use store's importData to restore
    store.importData({
      guests: data.guests || [],
      families: data.families || [],
      categories: data.categories || [],
      users: data.users || [],
      events: data.events || [],
      permissions: data.permissions || [],
    });

    // Restore backup settings if present
    if (data.backupSettings) {
      store.updateBackupSettings(data.backupSettings);
    }

    console.log(`Restored from backup: ${filename}`);
  }

  async deleteBackup(filename: string): Promise<void> {
    // Validate filename format (prevents path traversal)
    if (!BACKUP_FILENAME_REGEX.test(filename)) {
      throw new Error('Invalid backup filename');
    }

    const backupPath = path.join(this.backupDir, filename);
    await fs.unlink(backupPath);
    console.log(`Deleted backup: ${filename}`);
  }

  private async enforceMaxBackups(): Promise<void> {
    const settings = store.getBackupSettings();
    const backups = await this.listBackups();

    // Delete oldest backups beyond max
    while (backups.length > settings.maxBackups) {
      const oldest = backups.pop()!;
      const oldestPath = path.join(this.backupDir, oldest.filename);
      try {
        await fs.unlink(oldestPath);
        console.log(`Removed old backup: ${oldest.filename}`);
      } catch (error) {
        console.error(`Failed to remove old backup ${oldest.filename}:`, error);
      }
    }
  }

  scheduleNextBackup(): void {
    if (this.scheduledTimer) {
      clearTimeout(this.scheduledTimer);
      this.scheduledTimer = null;
    }

    const settings = store.getBackupSettings();
    if (!settings.enabled) return;

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
      } catch (error) {
        console.error('Scheduled backup failed:', error);
      }
      // Re-schedule for the next day
      this.scheduleNextBackup();
    }, delay);

    // Don't prevent process exit
    this.scheduledTimer.unref();
  }

  async shutdown(): Promise<void> {
    if (this.scheduledTimer) {
      clearTimeout(this.scheduledTimer);
      this.scheduledTimer = null;
    }

    const settings = store.getBackupSettings();
    if (settings.enabled) {
      try {
        await this.createBackup();
        console.log('Shutdown backup created');
      } catch (error) {
        console.error('Failed to create shutdown backup:', error);
      }
    }
  }
}

// Singleton instance
let serviceInstance: BackupService | null = null;

export function getBackupService(): BackupService {
  if (!serviceInstance) {
    serviceInstance = new BackupService();
  }
  return serviceInstance;
}

export function resetBackupService(): void {
  if (serviceInstance) {
    serviceInstance.shutdown().catch(console.error);
  }
  serviceInstance = null;
}
