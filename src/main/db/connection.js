const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');
const { app } = require('electron');

let db = null;

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

  // Open the database
  db = new Database(dbPath);

  // Enable foreign keys
  db.pragma('foreign_keys = ON');

  // Apply migrations
  applyMigrations(db);

  return db;
}

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

module.exports = {
  getDatabase,
};
