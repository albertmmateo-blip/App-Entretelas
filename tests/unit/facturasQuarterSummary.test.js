import { describe, expect, it } from 'vitest';
import { buildFacturasQuarterSummary } from '../../src/renderer/utils/facturasQuarterSummary';

describe('facturasQuarterSummary utilities', () => {
  it('builds compra quarter summary with importe and importe+iva+re totals', () => {
    const rows = [
      { fecha: '2026-01-10', tipo: 'compra', importe: 100, importe_iva_re: 126.2 },
      { fecha: '2026-02-15', tipo: 'compra', importe: 50, importe_iva_re: 63.1 },
      { fecha: '2026-04-01', tipo: 'compra', importe: 40, importe_iva_re: 50.48 },
    ];

    const result = buildFacturasQuarterSummary(rows, 'compra');

    expect(result.quarters[0].key).toBe('T1');
    expect(result.quarters[0].total.importe).toBeCloseTo(150, 5);
    expect(result.quarters[0].total.amountWithTaxes).toBeCloseTo(189.3, 5);
    expect(result.quarters[1].total.importe).toBeCloseTo(40, 5);
    expect(result.quarters[1].total.amountWithTaxes).toBeCloseTo(50.48, 5);
    expect(result.annualTotal.importe).toBeCloseTo(190, 5);
    expect(result.annualTotal.amountWithTaxes).toBeCloseTo(239.78, 5);
  });

  it('falls back to tipo formula when importe_iva_re is missing', () => {
    const compra = buildFacturasQuarterSummary(
      [{ fecha: '2026-03-20', tipo: 'compra', importe: 100, importe_iva_re: null }],
      'compra'
    );
    const venta = buildFacturasQuarterSummary(
      [{ fecha: '2026-03-20', tipo: 'venta', importe: 100, importe_iva_re: null }],
      'venta'
    );

    expect(compra.annualTotal.importe).toBeCloseTo(100, 5);
    expect(compra.annualTotal.amountWithTaxes).toBeCloseTo(126.2, 5);
    expect(venta.annualTotal.importe).toBeCloseTo(100, 5);
    expect(venta.annualTotal.amountWithTaxes).toBeCloseTo(121, 5);
  });
});
