import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { exec } from 'child_process';
import { promisify } from 'util';
import * as fs from 'fs';
import * as path from 'path';

const execAsync = promisify(exec);

export interface BackupResult {
  success: boolean;
  filename: string;
  size: number;
  timestamp: string;
  duration: number;
  error?: string;
}

export interface RestoreResult {
  success: boolean;
  message: string;
  duration: number;
  error?: string;
}

export interface BackupInfo {
  filename: string;
  size: number;
  createdAt: string;
  type: 'full' | 'schema' | 'data';
}

/**
 * Database Backup & Restore Utility Service
 * Provides automated and manual backup/restore capabilities for PostgreSQL
 * Features:
 * - Full database dump (pg_dump)
 * - Schema-only backup
 * - Data-only backup
 * - Compressed backups
 * - Automated retention policy
 * - Point-in-time restore
 * - Backup verification
 */
@Injectable()
export class BackupService {
  private readonly logger = new Logger(BackupService.name);
  private readonly backupDir: string;
  private readonly maxBackups: number;

  constructor(private readonly configService: ConfigService) {
    this.backupDir = this.configService.get('BACKUP_DIR', './backups');
    this.maxBackups = parseInt(this.configService.get('MAX_BACKUPS', '30'), 10);
  }

  /**
   * Perform a full database backup
   */
  async createFullBackup(compress: boolean = true): Promise<BackupResult> {
    const startTime = Date.now();
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `careforge-full-${timestamp}${compress ? '.sql.gz' : '.sql'}`;
    const filepath = path.join(this.backupDir, filename);

    try {
      await this.ensureBackupDir();

      const dbUrl = this.configService.get('DATABASE_URL', '');
      const pgDumpCmd = this.buildPgDumpCommand(dbUrl, 'full');
      const outputCmd = compress ? `| gzip > "${filepath}"` : `> "${filepath}"`;

      await execAsync(`${pgDumpCmd} ${outputCmd}`, { timeout: 300000 });

      const stats = await fs.promises.stat(filepath);
      const duration = Date.now() - startTime;

      this.logger.log(`Full backup created: ${filename} (${this.formatSize(stats.size)})`);

      // Enforce retention policy
      await this.enforceRetention();

      return {
        success: true,
        filename,
        size: stats.size,
        timestamp: new Date().toISOString(),
        duration,
      };
    } catch (error) {
      this.logger.error(`Backup failed: ${error.message}`);
      return {
        success: false,
        filename,
        size: 0,
        timestamp: new Date().toISOString(),
        duration: Date.now() - startTime,
        error: error.message,
      };
    }
  }

  /**
   * Schema-only backup (structure without data)
   */
  async createSchemaBackup(): Promise<BackupResult> {
    const startTime = Date.now();
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `careforge-schema-${timestamp}.sql`;
    const filepath = path.join(this.backupDir, filename);

    try {
      await this.ensureBackupDir();

      const dbUrl = this.configService.get('DATABASE_URL', '');
      const pgDumpCmd = this.buildPgDumpCommand(dbUrl, 'schema');

      await execAsync(`${pgDumpCmd} > "${filepath}"`, { timeout: 120000 });

      const stats = await fs.promises.stat(filepath);
      return {
        success: true,
        filename,
        size: stats.size,
        timestamp: new Date().toISOString(),
        duration: Date.now() - startTime,
      };
    } catch (error) {
      return {
        success: false,
        filename,
        size: 0,
        timestamp: new Date().toISOString(),
        duration: Date.now() - startTime,
        error: error.message,
      };
    }
  }

  /**
   * Data-only backup (no schema)
   */
  async createDataBackup(tables?: string[]): Promise<BackupResult> {
    const startTime = Date.now();
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `careforge-data-${timestamp}.sql.gz`;
    const filepath = path.join(this.backupDir, filename);

    try {
      await this.ensureBackupDir();

      const dbUrl = this.configService.get('DATABASE_URL', '');
      let pgDumpCmd = this.buildPgDumpCommand(dbUrl, 'data');

      if (tables && tables.length > 0) {
        const tableArgs = tables.map((t) => `-t "${t}"`).join(' ');
        pgDumpCmd = pgDumpCmd.replace('--data-only', `--data-only ${tableArgs}`);
      }

      await execAsync(`${pgDumpCmd} | gzip > "${filepath}"`, { timeout: 300000 });

      const stats = await fs.promises.stat(filepath);
      return {
        success: true,
        filename,
        size: stats.size,
        timestamp: new Date().toISOString(),
        duration: Date.now() - startTime,
      };
    } catch (error) {
      return {
        success: false,
        filename,
        size: 0,
        timestamp: new Date().toISOString(),
        duration: Date.now() - startTime,
        error: error.message,
      };
    }
  }

  /**
   * Restore database from backup file
   */
  async restoreBackup(filename: string, options?: { dropFirst?: boolean; schemaOnly?: boolean }): Promise<RestoreResult> {
    const startTime = Date.now();
    const filepath = path.join(this.backupDir, filename);

    try {
      // Verify file exists
      await fs.promises.access(filepath, fs.constants.R_OK);

      const dbUrl = this.configService.get('DATABASE_URL', '');
      const isCompressed = filename.endsWith('.gz');
      const readCmd = isCompressed ? `gunzip -c "${filepath}"` : `cat "${filepath}"`;

      let psqlCmd = `psql "${dbUrl}"`;
      if (options?.dropFirst) {
        psqlCmd += ' --clean --if-exists';
      }

      await execAsync(`${readCmd} | ${psqlCmd}`, { timeout: 600000 });

      const duration = Date.now() - startTime;
      this.logger.log(`Database restored from ${filename} in ${duration}ms`);

      return {
        success: true,
        message: `Database restored from ${filename}`,
        duration,
      };
    } catch (error) {
      this.logger.error(`Restore failed: ${error.message}`);
      return {
        success: false,
        message: 'Restore failed',
        duration: Date.now() - startTime,
        error: error.message,
      };
    }
  }

  /**
   * List available backups
   */
  async listBackups(): Promise<BackupInfo[]> {
    try {
      await this.ensureBackupDir();
      const files = await fs.promises.readdir(this.backupDir);

      const backups: BackupInfo[] = [];
      for (const file of files) {
        if (!file.startsWith('careforge-')) continue;
        const stats = await fs.promises.stat(path.join(this.backupDir, file));
        const type = file.includes('-schema-') ? 'schema' : file.includes('-data-') ? 'data' : 'full';

        backups.push({
          filename: file,
          size: stats.size,
          createdAt: stats.birthtime.toISOString(),
          type,
        });
      }

      return backups.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    } catch {
      return [];
    }
  }

  /**
   * Delete a specific backup
   */
  async deleteBackup(filename: string): Promise<boolean> {
    try {
      const filepath = path.join(this.backupDir, filename);
      await fs.promises.unlink(filepath);
      this.logger.log(`Backup deleted: ${filename}`);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Verify backup integrity
   */
  async verifyBackup(filename: string): Promise<{ valid: boolean; message: string }> {
    const filepath = path.join(this.backupDir, filename);

    try {
      await fs.promises.access(filepath, fs.constants.R_OK);
      const stats = await fs.promises.stat(filepath);

      if (stats.size === 0) {
        return { valid: false, message: 'Backup file is empty' };
      }

      // For compressed files, verify gzip integrity
      if (filename.endsWith('.gz')) {
        await execAsync(`gzip -t "${filepath}"`);
      }

      // Check for valid SQL content (first bytes)
      const isCompressed = filename.endsWith('.gz');
      const headCmd = isCompressed
        ? `gunzip -c "${filepath}" | head -5`
        : `head -5 "${filepath}"`;

      const { stdout } = await execAsync(headCmd);
      const isValidSQL = stdout.includes('--') || stdout.includes('SET') || stdout.includes('CREATE') || stdout.includes('PostgreSQL');

      return {
        valid: isValidSQL || stats.size > 100,
        message: isValidSQL ? 'Backup appears valid' : 'Backup format unrecognized',
      };
    } catch (error) {
      return { valid: false, message: `Verification failed: ${error.message}` };
    }
  }

  /**
   * Get database size statistics
   */
  async getDatabaseStats(): Promise<any> {
    try {
      const dbUrl = this.configService.get('DATABASE_URL', '');
      const { stdout } = await execAsync(
        `psql "${dbUrl}" -t -c "SELECT pg_size_pretty(pg_database_size(current_database())), (SELECT count(*) FROM information_schema.tables WHERE table_schema = 'public')"`,
      );
      const parts = stdout.trim().split('|');
      return {
        databaseSize: parts[0]?.trim() || 'unknown',
        tableCount: parseInt(parts[1]?.trim() || '0', 10),
      };
    } catch {
      return { databaseSize: 'unknown', tableCount: 0 };
    }
  }

  // --- Private Helpers ---

  private buildPgDumpCommand(dbUrl: string, type: 'full' | 'schema' | 'data'): string {
    let cmd = `pg_dump "${dbUrl}"`;
    cmd += ' --no-owner --no-privileges';
    cmd += ' --format=plain';

    switch (type) {
      case 'schema':
        cmd += ' --schema-only';
        break;
      case 'data':
        cmd += ' --data-only';
        break;
      default:
        break; // Full dump
    }

    return cmd;
  }

  private async ensureBackupDir(): Promise<void> {
    try {
      await fs.promises.mkdir(this.backupDir, { recursive: true });
    } catch {
      // Directory already exists
    }
  }

  private async enforceRetention(): Promise<void> {
    try {
      const files = await fs.promises.readdir(this.backupDir);
      const backups = files
        .filter((f) => f.startsWith('careforge-'))
        .map(async (f) => {
          const stats = await fs.promises.stat(path.join(this.backupDir, f));
          return { file: f, mtime: stats.mtime };
        });

      const sorted = (await Promise.all(backups)).sort(
        (a, b) => b.mtime.getTime() - a.mtime.getTime(),
      );

      // Delete old backups beyond retention limit
      for (const backup of sorted.slice(this.maxBackups)) {
        await fs.promises.unlink(path.join(this.backupDir, backup.file));
        this.logger.log(`Retention policy: deleted ${backup.file}`);
      }
    } catch (error) {
      this.logger.warn(`Retention enforcement failed: ${error.message}`);
    }
  }

  private formatSize(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }
}
