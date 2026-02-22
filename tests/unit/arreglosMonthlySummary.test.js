import { describe, expect, it } from 'vitest';
import {
  ALBARAN_OPTIONS,
  buildMonthlySummary,
  monthKeyFromFecha,
  normalizeFolderValue,
  splitArreglosTotal,
} from '../../src/renderer/utils/arreglosMonthlySummary';

describe('arreglosMonthlySummary utilities', () => {
  it('keeps supported albaran options stable', () => {
    expect(ALBARAN_OPTIONS).toEqual(['Entretelas', 'Isa', 'Loli']);
  });

  it('normalizes folder names case-insensitively and rejects unknown values', () => {
    expect(normalizeFolderValue('entretelas')).toBe('Entretelas');
    expect(normalizeFolderValue('ISA')).toBe('Isa');
    expect(normalizeFolderValue('Loli')).toBe('Loli');
    expect(normalizeFolderValue('otro')).toBeNull();
    expect(normalizeFolderValue('')).toBeNull();
    expect(normalizeFolderValue(null)).toBeNull();
  });

  it('extracts calendar month key only from valid YYYY-MM-DD dates', () => {
    expect(monthKeyFromFecha('2026-03-15')).toBe('2026-03');
    expect(monthKeyFromFecha('2026-3-15')).toBeNull();
    expect(monthKeyFromFecha('20260315')).toBeNull();
    expect(monthKeyFromFecha(undefined)).toBeNull();
  });

  it('builds monthly summaries by actual calendar month and sorts descending', () => {
    const entries = [
      { fecha: '2026-03-05', importe: 10, albaran: 'Entretelas' },
      { fecha: '2026-03-31', importe: '12.5 €', albaran: 'Isa' },
      { fecha: '2026-02-01', importe: 3, albaran: 'Loli' },
      { fecha: '2026-01-31', importe: 9.2, albaran: 'Entretelas' },
      { fecha: 'invalid-date', importe: 999 },
    ];

    const result = buildMonthlySummary(entries);

    expect(result).toHaveLength(3);
    expect(result[0]).toMatchObject({ monthKey: '2026-03', count: 2, totalImporte: 22.5 });
    expect(result[1]).toMatchObject({ monthKey: '2026-02', count: 1, totalImporte: 3 });
    expect(result[2]).toMatchObject({ monthKey: '2026-01', count: 1, totalImporte: 9.2 });
  });

  it('tracks per-folder totals within each month', () => {
    const entries = [
      { fecha: '2026-03-05', importe: 10, albaran: 'Entretelas' },
      { fecha: '2026-03-10', importe: 5, albaran: 'Isa' },
      { fecha: '2026-03-15', importe: 3, albaran: 'Loli' },
      { fecha: '2026-03-20', importe: 2, albaran: 'Entretelas' },
    ];

    const result = buildMonthlySummary(entries);

    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({
      monthKey: '2026-03',
      count: 4,
      totalImporte: 20,
      entretelas: 12,
      isa: 5,
      loli: 3,
    });
  });

  it('does not mutate source entries (data-loss safety)', () => {
    const entries = [
      { fecha: '2026-03-10', importe: '5,5' },
      { fecha: '2026-03-11', importe: 2 },
    ];
    const snapshot = JSON.parse(JSON.stringify(entries));

    buildMonthlySummary(entries);

    expect(entries).toEqual(snapshot);
  });

  it('splits totals into 65% folder and 35% tienda', () => {
    const split = splitArreglosTotal(200);
    expect(split.total).toBe(200);
    expect(split.folderShare).toBe(130);
    expect(split.tiendaShare).toBe(70);
  });

  it('splits formatted euro totals correctly', () => {
    const split = splitArreglosTotal('10,00 €');
    expect(split.total).toBe(10);
    expect(split.folderShare).toBe(6.5);
    expect(split.tiendaShare).toBe(3.5);
  });
});
