const Database = require('better-sqlite3');
const fs = require('fs');
const path = require('path');

/**
 * Creates an in-memory SQLite database with migrations applied.
 * @returns {Database} In-memory database instance with schema initialized
 */
function createTestDb() {
  // Create in-memory database
  const db = new Database(':memory:');
  db.pragma('foreign_keys = ON');

  // Read and apply migrations
  const migrationsDir = path.join(__dirname, '../../src/main/db/migrations');

  if (!fs.existsSync(migrationsDir)) {
    throw new Error(`Migrations directory not found: ${migrationsDir}`);
  }

  const migrationFiles = fs
    .readdirSync(migrationsDir)
    .filter((file) => file.endsWith('.sql'))
    .sort();

  migrationFiles.forEach((file) => {
    const migrationNumber = parseInt(file.split('_')[0], 10);
    const migrationPath = path.join(migrationsDir, file);
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');

    try {
      db.exec(migrationSQL);
      db.pragma(`user_version = ${migrationNumber}`);
    } catch (error) {
      throw new Error(`Failed to apply migration ${file}: ${error.message}`);
    }
  });

  return db;
}

/**
 * Inserts test data into a table.
 * @param {Database} db - Database instance
 * @param {string} tableName - Name of the table to insert data into
 * @param {Array<Object>} rows - Array of objects representing rows to insert
 */
function seedTestData(db, tableName, rows) {
  if (!rows || rows.length === 0) {
    return;
  }

  // Get column names from first row
  const columns = Object.keys(rows[0]);
  const placeholders = columns.map(() => '?').join(', ');
  const columnNames = columns.join(', ');

  const stmt = db.prepare(`INSERT INTO ${tableName} (${columnNames}) VALUES (${placeholders})`);

  // Use transaction for better performance
  const insertMany = db.transaction((data) => {
    data.forEach((row) => {
      const values = columns.map((col) => row[col]);
      stmt.run(...values);
    });
  });

  insertMany(rows);
}

/**
 * Truncates (clears) all data from a table.
 * @param {Database} db - Database instance
 * @param {string} tableName - Name of the table to clear
 */
function clearTable(db, tableName) {
  db.prepare(`DELETE FROM ${tableName}`).run();

  // Reset autoincrement counter
  db.prepare(`DELETE FROM sqlite_sequence WHERE name = '${tableName}'`).run();
}

module.exports = {
  createTestDb,
  seedTestData,
  clearTable,
};
