import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import Database from 'better-sqlite3';
import fs from 'fs';
import path from 'path';

// Mock the electron module
vi.mock('electron', () => ({
  app: {
    getPath: () => ':memory:',
  },
}));

describe('Database Migration Runner', () => {
  let db;
  let migrationsDir;

  beforeEach(() => {
    // Create an in-memory database for testing
    db = new Database(':memory:');
    db.pragma('foreign_keys = ON');

    // Get the actual migrations directory
    migrationsDir = path.join(__dirname, '../../../src/main/db/migrations');
  });

  afterEach(() => {
    if (db) {
      db.close();
    }
  });

  it('should start with user_version 0', () => {
    const version = db.pragma('user_version', { simple: true });
    expect(version).toBe(0);
  });

  it('should apply migration 001_init.sql successfully', () => {
    // Read and apply the first migration
    const migrationPath = path.join(migrationsDir, '001_init.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');

    // Execute migration
    db.exec(migrationSQL);

    // Update user_version
    db.pragma('user_version = 1');

    // Verify user_version was updated
    const version = db.pragma('user_version', { simple: true });
    expect(version).toBe(1);

    // Verify tables were created
    const tables = db
      .prepare(
        "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'"
      )
      .all();

    const tableNames = tables.map((t) => t.name);

    expect(tableNames).toContain('notas');
    expect(tableNames).toContain('llamar');
    expect(tableNames).toContain('encargar');
    expect(tableNames).toContain('proveedores');
    expect(tableNames).toContain('clientes');
    expect(tableNames).toContain('facturas_pdf');
  });

  it('should create FTS5 virtual tables', () => {
    // Read and apply the first migration
    const migrationPath = path.join(migrationsDir, '001_init.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');

    // Execute migration
    db.exec(migrationSQL);

    // Verify FTS5 tables were created
    const tables = db
      .prepare(
        "SELECT name FROM sqlite_master WHERE type='table' AND name LIKE '%_fts'"
      )
      .all();

    const tableNames = tables.map((t) => t.name);

    expect(tableNames).toContain('notas_fts');
    expect(tableNames).toContain('llamar_fts');
    expect(tableNames).toContain('encargar_fts');
  });

  it('should create indexes', () => {
    // Read and apply the first migration
    const migrationPath = path.join(migrationsDir, '001_init.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');

    // Execute migration
    db.exec(migrationSQL);

    // Verify indexes were created
    const indexes = db
      .prepare("SELECT name FROM sqlite_master WHERE type='index'")
      .all();

    const indexNames = indexes.map((i) => i.name);

    expect(indexNames).toContain('idx_notas_urgente');
    expect(indexNames).toContain('idx_llamar_urgente');
    expect(indexNames).toContain('idx_encargar_urgente');
    expect(indexNames).toContain('idx_facturas_tipo');
    expect(indexNames).toContain('idx_facturas_entidad');
  });

  it('should create triggers for fecha_mod auto-update', () => {
    // Read and apply the first migration
    const migrationPath = path.join(migrationsDir, '001_init.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');

    // Execute migration
    db.exec(migrationSQL);

    // Verify triggers were created
    const triggers = db
      .prepare("SELECT name FROM sqlite_master WHERE type='trigger'")
      .all();

    const triggerNames = triggers.map((t) => t.name);

    expect(triggerNames).toContain('notas_fecha_mod');
    expect(triggerNames).toContain('llamar_fecha_mod');
    expect(triggerNames).toContain('encargar_fecha_mod');
    expect(triggerNames).toContain('proveedores_fecha_mod');
    expect(triggerNames).toContain('clientes_fecha_mod');
    expect(triggerNames).toContain('facturas_pdf_fecha_mod');
  });

  it('should not re-apply migration if user_version is already at migration level', () => {
    // Read and apply the first migration
    const migrationPath = path.join(migrationsDir, '001_init.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');

    // Execute migration first time
    db.exec(migrationSQL);
    db.pragma('user_version = 1');

    const versionAfterFirst = db.pragma('user_version', { simple: true });
    expect(versionAfterFirst).toBe(1);

    // Get table count
    const tablesAfterFirst = db
      .prepare(
        "SELECT COUNT(*) as count FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'"
      )
      .get();

    // Simulate running migrations again (migration runner would skip this)
    const currentVersion = db.pragma('user_version', { simple: true });
    const migrationNumber = 1;

    if (migrationNumber > currentVersion) {
      db.exec(migrationSQL);
      db.pragma(`user_version = ${migrationNumber}`);
    }

    // Verify version hasn't changed
    const versionAfterSecond = db.pragma('user_version', { simple: true });
    expect(versionAfterSecond).toBe(1);

    // Verify table count is still the same (no duplication)
    const tablesAfterSecond = db
      .prepare(
        "SELECT COUNT(*) as count FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'"
      )
      .get();

    expect(tablesAfterSecond.count).toBe(tablesAfterFirst.count);
  });

  it('should apply migrations in order based on version number', () => {
    // Test that migration numbering works correctly
    const migrationPath = path.join(migrationsDir, '001_init.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');

    // Simulate current version 0
    const currentVersion = db.pragma('user_version', { simple: true });
    expect(currentVersion).toBe(0);

    // Migration number extracted from filename
    const migrationNumber = 1;

    // Should apply because migrationNumber (1) > currentVersion (0)
    expect(migrationNumber).toBeGreaterThan(currentVersion);

    // Apply migration
    db.exec(migrationSQL);
    db.pragma(`user_version = ${migrationNumber}`);

    // Verify version incremented
    const newVersion = db.pragma('user_version', { simple: true });
    expect(newVersion).toBe(1);
  });

  it('should enforce CHECK constraints on table columns', () => {
    // Read and apply the first migration
    const migrationPath = path.join(migrationsDir, '001_init.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
    db.exec(migrationSQL);

    // Test urgente column constraint (must be 0 or 1)
    expect(() => {
      db.prepare('INSERT INTO notas (urgente) VALUES (2)').run();
    }).toThrow();

    // Test that 0 and 1 work for urgente
    expect(() => {
      db.prepare('INSERT INTO notas (urgente) VALUES (0)').run();
      db.prepare('INSERT INTO notas (urgente) VALUES (1)').run();
    }).not.toThrow();

    // Test required field constraints
    expect(() => {
      db.prepare("INSERT INTO llamar (asunto, contacto) VALUES ('', 'test')").run();
    }).toThrow(); // Empty asunto should fail

    expect(() => {
      db.prepare("INSERT INTO llamar (asunto, contacto) VALUES ('test', '')").run();
    }).toThrow(); // Empty contacto should fail

    // Test valid insert
    expect(() => {
      db.prepare("INSERT INTO llamar (asunto, contacto) VALUES ('test', 'contact')").run();
    }).not.toThrow();
  });
});
