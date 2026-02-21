import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import Database from 'better-sqlite3';
import fs from 'fs';
import path from 'path';
import os from 'os';

describe('Database Backup and Recovery', () => {
  let testDataPath;
  let dbPath;
  let backupsDir;
  let db;

  beforeEach(() => {
    // Create a temporary directory for test data
    testDataPath = path.join(os.tmpdir(), `test-app-entretelas-${Date.now()}`);
    if (!fs.existsSync(testDataPath)) {
      fs.mkdirSync(testDataPath, { recursive: true });
    }

    dbPath = path.join(testDataPath, 'entretelas.db');
    backupsDir = path.join(testDataPath, 'backups');

    // Create a test database with basic schema
    db = new Database(':memory:');
    db.pragma('foreign_keys = ON');

    // Create a simple test table
    db.exec(`
      CREATE TABLE IF NOT EXISTS notas (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        nombre TEXT NOT NULL,
        descripcion TEXT,
        contacto TEXT,
        urgente INTEGER DEFAULT 0 CHECK(urgente IN (0, 1)),
        fecha_creacion TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
        fecha_mod TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
      );
    `);
  });

  afterEach(() => {
    // Close database if open
    if (db) {
      try {
        db.close();
      } catch (e) {
        // Ignore close errors
      }
    }

    // Clean up test directory
    if (fs.existsSync(testDataPath)) {
      fs.rmSync(testDataPath, { recursive: true, force: true });
    }
  });

  describe('Backup and Restore Workflow', () => {
    it('should create a backup, modify data, and restore successfully', async () => {
      // Create a database with some data
      const insertStmt = db.prepare(`
        INSERT INTO notas (nombre, descripcion, contacto, urgente)
        VALUES (?, ?, ?, ?)
      `);
      insertStmt.run('Test Nota', 'Test Description', 'test@example.com', 1);

      // Save database to main path
      await db.backup(dbPath);

      // Create backups directory and save a backup
      if (!fs.existsSync(backupsDir)) {
        fs.mkdirSync(backupsDir, { recursive: true });
      }
      const backupPath = path.join(backupsDir, 'entretelas-20260219-120000.db');
      fs.copyFileSync(dbPath, backupPath);

      // Delete the data from the current database
      db.prepare('DELETE FROM notas').run();

      // Verify data is deleted
      let rows = db.prepare('SELECT * FROM notas').all();
      expect(rows.length).toBe(0);

      // Close current db
      db.close();

      // Restore from backup by copying the backup file back
      fs.copyFileSync(backupPath, dbPath);

      // Open the restored database and verify data
      db = new Database(dbPath);
      rows = db.prepare('SELECT * FROM notas').all();
      expect(rows.length).toBe(1);
      expect(rows[0].nombre).toBe('Test Nota');
    });

    it('should list backups with proper metadata', () => {
      // Create backups directory
      if (!fs.existsSync(backupsDir)) {
        fs.mkdirSync(backupsDir, { recursive: true });
      }

      // Create 3 dummy backup files
      const backupFiles = [
        'entretelas-20260217-120000.db',
        'entretelas-20260218-120000.db',
        'entretelas-20260219-120000.db',
      ];

      backupFiles.forEach((filename, index) => {
        const filepath = path.join(backupsDir, filename);
        fs.writeFileSync(filepath, 'dummy backup content');

        // Set different modification times
        const time = new Date('2026-02-17').getTime() + index * 24 * 60 * 60 * 1000;
        fs.utimesSync(filepath, new Date(time), new Date(time));
      });

      // List backups
      const files = fs
        .readdirSync(backupsDir)
        .filter((file) => file.startsWith('entretelas-') && file.endsWith('.db'))
        .map((file) => {
          const filePath = path.join(backupsDir, file);
          const stats = fs.statSync(filePath);
          return {
            filename: file,
            timestamp: stats.mtime,
            size: stats.size,
          };
        })
        .sort((a, b) => b.timestamp - a.timestamp);

      expect(files.length).toBe(3);
      expect(files[0].filename).toBe('entretelas-20260219-120000.db'); // Newest first
      expect(files[0]).toHaveProperty('timestamp');
      expect(files[0]).toHaveProperty('size');
    });

    it('should keep only 7 most recent backups', () => {
      // Create backups directory
      if (!fs.existsSync(backupsDir)) {
        fs.mkdirSync(backupsDir, { recursive: true });
      }

      // Create 10 dummy backup files with different timestamps
      const numBackups = 10;
      for (let i = 0; i < numBackups; i += 1) {
        const filename = `entretelas-2026021${i}-120000.db`;
        const filepath = path.join(backupsDir, filename);
        fs.writeFileSync(filepath, 'dummy backup content');

        // Set different modification times
        const time = new Date('2026-02-01').getTime() + i * 24 * 60 * 60 * 1000;
        fs.utimesSync(filepath, new Date(time), new Date(time));
      }

      // Count files before cleanup
      let files = fs
        .readdirSync(backupsDir)
        .filter((file) => file.startsWith('entretelas-') && file.endsWith('.db'));
      expect(files.length).toBe(10);

      // Simulate cleanup: get all files, sort by mtime, delete oldest
      const fileStats = files
        .map((file) => ({
          name: file,
          path: path.join(backupsDir, file),
          mtime: fs.statSync(path.join(backupsDir, file)).mtime,
        }))
        .sort((a, b) => b.mtime - a.mtime); // Sort by modification time, newest first

      // Delete files older than the 7th newest
      if (fileStats.length > 7) {
        const filesToDelete = fileStats.slice(7);
        filesToDelete.forEach((file) => {
          fs.unlinkSync(file.path);
        });
      }

      // Verify only 7 files remain
      files = fs
        .readdirSync(backupsDir)
        .filter((file) => file.startsWith('entretelas-') && file.endsWith('.db'));
      expect(files.length).toBe(7);
    });

    it('should handle restore validation correctly', () => {
      // Test non-existent backup file
      const nonExistentPath = path.join(backupsDir, 'non-existent-backup.db');
      expect(fs.existsSync(nonExistentPath)).toBe(false);

      // Test invalid filename pattern
      const invalidFilename = 'invalid-filename.txt';
      const isValidBackup =
        invalidFilename.startsWith('entretelas-') && invalidFilename.endsWith('.db');
      expect(isValidBackup).toBe(false);

      // Test valid filename pattern
      const validFilename = 'entretelas-20260219-120000.db';
      const isValid = validFilename.startsWith('entretelas-') && validFilename.endsWith('.db');
      expect(isValid).toBe(true);
    });
  });
});
