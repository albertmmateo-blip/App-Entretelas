const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');
const { app } = require('electron');

let db = null;

/**
 * Applies pending migrations to the database.
 * Migrations are SQL files in src/main/db/migrations/ numbered 001_*.sql, 002_*.sql, etc.
 */
function applyMigrations(database) {
  // Get current schema version
  const currentVersion = database.pragma('user_version', { simple: true });

  // Get migrations directory
  const migrationsDir = path.join(__dirname, 'migrations');

  // Check if migrations directory exists
  if (!fs.existsSync(migrationsDir)) {
    console.log('No migrations directory found');
    return;
  }

  // Read all migration files
  const migrationFiles = fs
    .readdirSync(migrationsDir)
    .filter((file) => file.endsWith('.sql'))
    .sort();

  // Apply pending migrations
  migrationFiles.forEach((file) => {
    // Extract migration number from filename (e.g., "001_init.sql" -> 1)
    const migrationNumber = parseInt(file.split('_')[0], 10);

    if (migrationNumber > currentVersion) {
      console.log(`Applying migration ${file}...`);

      // Read migration SQL
      const migrationPath = path.join(migrationsDir, file);
      const migrationSQL = fs.readFileSync(migrationPath, 'utf8');

      // Execute migration in a transaction
      try {
        database.exec(migrationSQL);

        // Update user_version
        database.pragma(`user_version = ${migrationNumber}`);

        console.log(`Migration ${file} applied successfully`);
      } catch (error) {
        console.error(`Failed to apply migration ${file}:`, error);
        throw error;
      }
    }
  });

  const finalVersion = database.pragma('user_version', { simple: true });
  console.log(`Database initialized at version ${finalVersion}`);
}

/**
 * Removes old backups, keeping only the 7 most recent.
 * @param {string} backupsDir - Path to the backups directory
 */
function cleanupOldBackups(backupsDir) {
  try {
    // Get all backup files
    const files = fs
      .readdirSync(backupsDir)
      .filter((file) => file.startsWith('entretelas-') && file.endsWith('.db'))
      .map((file) => ({
        name: file,
        path: path.join(backupsDir, file),
        mtime: fs.statSync(path.join(backupsDir, file)).mtime,
      }))
      .sort((a, b) => b.mtime - a.mtime); // Sort by modification time, newest first

    // Delete files older than the 7th newest
    if (files.length > 7) {
      const filesToDelete = files.slice(7);
      filesToDelete.forEach((file) => {
        try {
          fs.unlinkSync(file.path);
          console.log(`Deleted old backup: ${file.name}`);
        } catch (error) {
          console.error(`Failed to delete backup ${file.name}:`, error);
        }
      });
    }
  } catch (error) {
    console.error('Failed to cleanup old backups:', error);
  }
}

/**
 * Creates a timestamped backup of the database.
 * @param {string} dbPath - Path to the database file
 * @returns {string|null} - Path to the backup file or null if backup failed
 */
function createBackup(dbPath) {
  try {
    const userDataPath = app.getPath('userData');
    const backupsDir = path.join(userDataPath, 'backups');

    // Create backups directory if it doesn't exist
    if (!fs.existsSync(backupsDir)) {
      fs.mkdirSync(backupsDir, { recursive: true });
    }

    // Create timestamped backup filename
    const now = new Date();
    const timestamp = now
      .toISOString()
      .replace(/[-:]/g, '')
      .replace(/\.\d{3}Z$/, '')
      .replace('T', '-');
    const backupFilename = `entretelas-${timestamp}.db`;
    const backupPath = path.join(backupsDir, backupFilename);

    // Copy database file to backup
    fs.copyFileSync(dbPath, backupPath);

    console.log(`Database backup created: ${backupFilename}`);

    // Clean up old backups (keep last 7)
    cleanupOldBackups(backupsDir);

    return backupPath;
  } catch (error) {
    console.error('Failed to create database backup:', error);
    return null;
  }
}

/**
 * Attempts to restore database from the most recent backup.
 * @param {string} dbPath - Path to the database file
 * @returns {boolean} - True if restore was successful, false otherwise
 */
function restoreFromLatestBackup(dbPath) {
  try {
    const userDataPath = app.getPath('userData');
    const backupsDir = path.join(userDataPath, 'backups');

    if (!fs.existsSync(backupsDir)) {
      console.error('No backups directory found');
      return false;
    }

    // Get all backup files sorted by modification time
    const backupFiles = fs
      .readdirSync(backupsDir)
      .filter((file) => file.startsWith('entretelas-') && file.endsWith('.db'))
      .map((file) => ({
        name: file,
        path: path.join(backupsDir, file),
        mtime: fs.statSync(path.join(backupsDir, file)).mtime,
      }))
      .sort((a, b) => b.mtime - a.mtime); // Sort by modification time, newest first

    if (backupFiles.length === 0) {
      console.error('No backup files found');
      return false;
    }

    const latestBackup = backupFiles[0];
    console.log(`Database corrupted, restored from backup: ${latestBackup.name}`);

    // Copy backup to main database path
    fs.copyFileSync(latestBackup.path, dbPath);

    return true;
  } catch (error) {
    console.error('Failed to restore from backup:', error);
    return false;
  }
}

/**
 * Opens the database connection and applies pending migrations.
 * Returns the database instance singleton.
 */
function getDatabase() {
  if (db) {
    return db;
  }

  // Get the userData directory (Electron standard location for app data)
  const userDataPath = app.getPath('userData');
  const dbPath = path.join(userDataPath, 'entretelas.db');

  // Try to open the database
  try {
    db = new Database(dbPath);

    // Enable foreign keys
    db.pragma('foreign_keys = ON');

    // Apply migrations
    applyMigrations(db);

    // Create backup after successful database open
    createBackup(dbPath);
  } catch (error) {
    console.error('Failed to open database:', error);

    // Attempt to restore from backup
    if (restoreFromLatestBackup(dbPath)) {
      try {
        // Retry opening the database
        db = new Database(dbPath);
        db.pragma('foreign_keys = ON');
        applyMigrations(db);
        console.log('Database successfully restored and reopened');
      } catch (retryError) {
        console.error('Failed to open database even after restore:', retryError);
        throw retryError;
      }
    } else {
      throw error;
    }
  }

  return db;
}

/**
 * Lists all available backups with metadata.
 * @returns {Array<{filename: string, timestamp: Date, size: number}>} - Array of backup metadata
 */
function listBackups() {
  try {
    const userDataPath = app.getPath('userData');
    const backupsDir = path.join(userDataPath, 'backups');

    if (!fs.existsSync(backupsDir)) {
      return [];
    }

    const backupFiles = fs
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
      .sort((a, b) => b.timestamp - a.timestamp); // Sort by timestamp, newest first

    return backupFiles;
  } catch (error) {
    console.error('Failed to list backups:', error);
    return [];
  }
}

/**
 * Restores database from a specific backup file.
 * @param {string} backupFilename - Name of the backup file to restore
 * @returns {{success: boolean, error?: {code: string, message: string}}} - Result of the restore operation
 */
function restoreFromBackup(backupFilename) {
  try {
    const userDataPath = app.getPath('userData');
    const backupsDir = path.join(userDataPath, 'backups');
    const backupPath = path.join(backupsDir, backupFilename);
    const dbPath = path.join(userDataPath, 'entretelas.db');

    // Validate backup file exists
    if (!fs.existsSync(backupPath)) {
      return {
        success: false,
        error: {
          code: 'BACKUP_NOT_FOUND',
          message: `Backup file not found: ${backupFilename}`,
        },
      };
    }

    // Validate it's a proper backup file
    if (!backupFilename.startsWith('entretelas-') || !backupFilename.endsWith('.db')) {
      return {
        success: false,
        error: {
          code: 'INVALID_BACKUP',
          message: 'Invalid backup filename',
        },
      };
    }

    // Close current database connection
    if (db) {
      try {
        db.close();
        db = null;
      } catch (closeError) {
        console.error('Error closing database:', closeError);
      }
    }

    // Copy backup to main database path
    fs.copyFileSync(backupPath, dbPath);

    // Reopen database
    try {
      db = new Database(dbPath);
      db.pragma('foreign_keys = ON');
      applyMigrations(db);
      console.log(`Database restored from backup: ${backupFilename}`);
      return { success: true };
    } catch (reopenError) {
      return {
        success: false,
        error: {
          code: 'DB_REOPEN_FAILED',
          message: `Failed to reopen database after restore: ${reopenError.message}`,
        },
      };
    }
  } catch (error) {
    console.error('Failed to restore from backup:', error);
    return {
      success: false,
      error: {
        code: 'RESTORE_FAILED',
        message: error.message,
      },
    };
  }
}

module.exports = {
  getDatabase,
  listBackups,
  restoreFromBackup,
};
