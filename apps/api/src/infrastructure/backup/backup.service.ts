import { Injectable, Logger, BadRequestException, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { execFile } from 'child_process';
import { promisify } from 'util';
import * as fs from 'fs';
import * as path from 'path';

const execFileAsync = promisify(execFile);

export interface BackupResult {
  success: boolean;
  filename: string;
  size: number;
  timestamp: string;
  duration: number;
  error?: string;
}

export interface BackupInfo {
  filename: string;
  size: number;
  createdAt: string;
  type: 'full' | 'schema';
}

/**
 * Database Backup Service
 *
 * SECURITY:
 * - Uses execFile (not exec) to prevent command injection
 * - All paths are canonicalized and confined to the backup directory
 * - Rejects absolute paths, traversal sequences, symlinks, unexpected extensions
 * - Restore operations are NOT exposed via API (must be performed by ops team)
 * - All operations are audit-logged with the requesting admin's ID
 */
@Injectable()
export class BackupService {
  private readonly logger = new Logger(BackupService.name);
  private readonly backupDir: string;
  private readonly maxBackups: number;
  private static readonly ALLOWED_EXTENSIONS = ['.sql', '.sql.gz'];
  private static readonly FILENAME_PATTERN = /^careforge-(full|schema)-[\d-]+(\.sql(\.gz)?)$/;

  constructor(private readonly configService: ConfigService) {
    this.backupDir = path.resolve(this.configService.get('BACKUP_DIR', './backups'));
    this.maxBackups = parseInt(this.configService.get('MAX_BACKUPS', '30'), 10);
  }

  /**
   * Perform a full database backup (schema + data, compressed)
   */
  async createFullBackup(requestedBy: string): Promise<BackupResult> {
    const startTime = Date.now();
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `careforge-full-${timestamp}.sql.gz`;
    const filepath = path.join(this.backupDir, filename);

    try {
      await this.ensureBackupDir();
      const dbUrl = this.getDatabaseUrl();

      // Use execFile with separated arguments — no shell interpolation
      await execFileAsync(
        'pg_dump',
        [dbUrl, '--no-owner', '--no-privileges', '--format=plain'],
        { timeout: 300000, maxBuffer: 1024 * 1024 * 512 },
      ).then(({ stdout }) => {
        return this.compressAndWrite(stdout, filepath);
      });

      const stats = await fs.promises.stat(filepath);
      const duration = Date.now() - startTime;

      this.logger.log(`[AUDIT] Backup created by admin=${requestedBy}: ${filename} (${this.formatSize(stats.size)})`);
      await this.enforceRetention();

      return { success: true, filename, size: stats.size, timestamp: new Date().toISOString(), duration };
    } catch (error) {
      this.logger.error(`[AUDIT] Backup FAILED by admin=${requestedBy}: ${error.message}`);
      return { success: false, filename, size: 0, timestamp: new Date().toISOString(), duration: Date.now() - startTime, error: 'Backup operation failed' };
    }
  }

  /**
   * Schema-only backup (structure without data)
   */
  async createSchemaBackup(requestedBy: string): Promise<BackupResult> {
    const startTime = Date.now();
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `careforge-schema-${timestamp}.sql`;
    const filepath = path.join(this.backupDir, filename);

    try {
      await this.ensureBackupDir();
      const dbUrl = this.getDatabaseUrl();

      const { stdout } = await execFileAsync(
        'pg_dump',
        [dbUrl, '--no-owner', '--no-privileges', '--format=plain', '--schema-only'],
        { timeout: 120000, maxBuffer: 1024 * 1024 * 128 },
      );

      await fs.promises.writeFile(filepath, stdout, 'utf-8');
      const stats = await fs.promises.stat(filepath);

      this.logger.log(`[AUDIT] Schema backup created by admin=${requestedBy}: ${filename}`);

      return { success: true, filename, size: stats.size, timestamp: new Date().toISOString(), duration: Date.now() - startTime };
    } catch (error) {
      this.logger.error(`[AUDIT] Schema backup FAILED by admin=${requestedBy}: ${error.message}`);
      return { success: false, filename, size: 0, timestamp: new Date().toISOString(), duration: Date.now() - startTime, error: 'Schema backup failed' };
    }
  }

  /**
   * List available backups (admin only, audit-logged)
   */
  async listBackups(requestedBy: string): Promise<BackupInfo[]> {
    this.logger.log(`[AUDIT] Backup list requested by admin=${requestedBy}`);
    try {
      await this.ensureBackupDir();
      const files = await fs.promises.readdir(this.backupDir);

      const backups: BackupInfo[] = [];
      for (const file of files) {
        if (!BackupService.FILENAME_PATTERN.test(file)) continue;
        const stats = await fs.promises.stat(path.join(this.backupDir, file));
        const type = file.includes('-schema-') ? 'schema' : 'full';
        backups.push({ filename: file, size: stats.size, createdAt: stats.birthtime.toISOString(), type });
      }

      return backups.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    } catch {
      return [];
    }
  }

  /**
   * Verify backup integrity (gzip test + content check)
   */
  async verifyBackup(filename: string, requestedBy: string): Promise<{ valid: boolean; message: string }> {
    const safePath = this.resolveSafePath(filename);
    this.logger.log(`[AUDIT] Backup verify requested by admin=${requestedBy}: ${filename}`);

    try {
      await fs.promises.access(safePath, fs.constants.R_OK);
      const stats = await fs.promises.stat(safePath);

      if (stats.size === 0) {
        return { valid: false, message: 'Backup file is empty' };
      }

      // For compressed files, verify gzip integrity using execFile (safe)
      if (filename.endsWith('.gz')) {
        await execFileAsync('gzip', ['-t', safePath]);
      }

      return { valid: true, message: 'Backup integrity verified' };
    } catch (error) {
      return { valid: false, message: 'Verification failed: integrity check error' };
    }
  }

  /**
   * Get database size statistics
   */
  async getDatabaseStats(requestedBy: string): Promise<{ databaseSize: string; tableCount: number }> {
    this.logger.log(`[AUDIT] DB stats requested by admin=${requestedBy}`);
    try {
      const dbUrl = this.getDatabaseUrl();
      const { stdout } = await execFileAsync(
        'psql',
        [dbUrl, '-t', '-A', '-c', "SELECT pg_size_pretty(pg_database_size(current_database())) || '|' || (SELECT count(*) FROM information_schema.tables WHERE table_schema = 'public')"],
        { timeout: 30000 },
      );
      const parts = stdout.trim().split('|');
      return { databaseSize: parts[0]?.trim() || 'unknown', tableCount: parseInt(parts[1]?.trim() || '0', 10) };
    } catch {
      return { databaseSize: 'unknown', tableCount: 0 };
    }
  }

  /**
   * Delete a specific backup (admin only, audit-logged)
   */
  async deleteBackup(filename: string, requestedBy: string): Promise<void> {
    const safePath = this.resolveSafePath(filename);
    this.logger.log(`[AUDIT] Backup DELETE by admin=${requestedBy}: ${filename}`);
    await fs.promises.unlink(safePath);
  }

  // --- Private Helpers ---

  /**
   * SECURITY: Resolve and validate that a filename stays within the backup directory.
   * Rejects: absolute paths, traversal (../), symlinks, unexpected extensions.
   */
  private resolveSafePath(filename: string): string {
    // Reject absolute paths
    if (path.isAbsolute(filename)) {
      throw new BadRequestException('Invalid backup filename: absolute paths not allowed');
    }

    // Reject traversal sequences
    if (filename.includes('..') || filename.includes('/') || filename.includes('\\')) {
      throw new BadRequestException('Invalid backup filename: path traversal not allowed');
    }

    // Reject null bytes
    if (filename.includes('\0')) {
      throw new BadRequestException('Invalid backup filename');
    }

    // Validate against expected pattern
    if (!BackupService.FILENAME_PATTERN.test(filename)) {
      throw new BadRequestException('Invalid backup filename: does not match expected format');
    }

    // Validate extension
    const hasValidExt = BackupService.ALLOWED_EXTENSIONS.some((ext) => filename.endsWith(ext));
    if (!hasValidExt) {
      throw new BadRequestException('Invalid backup filename: unexpected extension');
    }

    // Canonicalize and verify containment
    const resolved = path.resolve(this.backupDir, filename);
    if (!resolved.startsWith(this.backupDir + path.sep)) {
      throw new BadRequestException('Invalid backup filename: path escapes backup directory');
    }

    // Check for symlink escape
    try {
      const realPath = fs.realpathSync(resolved);
      if (!realPath.startsWith(this.backupDir + path.sep) && realPath !== this.backupDir) {
        throw new BadRequestException('Invalid backup filename: symlink escape detected');
      }
    } catch (e) {
      if (e instanceof BadRequestException) throw e;
      // File doesn't exist yet — that's fine for some operations
    }

    return resolved;
  }

  private getDatabaseUrl(): string {
    const dbUrl = this.configService.get<string>('DATABASE_URL');
    if (!dbUrl) {
      throw new BadRequestException('DATABASE_URL not configured');
    }
    return dbUrl;
  }

  private async compressAndWrite(data: string, filepath: string): Promise<void> {
    // Write uncompressed first, then compress with gzip execFile
    const tmpPath = filepath.replace('.gz', '.tmp');
    await fs.promises.writeFile(tmpPath, data, 'utf-8');
    await execFileAsync('gzip', ['-f', tmpPath]);
    // gzip -f tmpPath produces tmpPath.gz — rename to final
    await fs.promises.rename(tmpPath + '.gz', filepath);
  }

  private async ensureBackupDir(): Promise<void> {
    await fs.promises.mkdir(this.backupDir, { recursive: true, mode: 0o700 });
  }

  private async enforceRetention(): Promise<void> {
    try {
      const files = await fs.promises.readdir(this.backupDir);
      const backups = await Promise.all(
        files
          .filter((f) => BackupService.FILENAME_PATTERN.test(f))
          .map(async (f) => {
            const stats = await fs.promises.stat(path.join(this.backupDir, f));
            return { file: f, mtime: stats.mtime };
          }),
      );

      const sorted = backups.sort((a, b) => b.mtime.getTime() - a.mtime.getTime());

      for (const backup of sorted.slice(this.maxBackups)) {
        await fs.promises.unlink(path.join(this.backupDir, backup.file));
        this.logger.log(`[AUDIT] Retention policy: deleted ${backup.file}`);
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
