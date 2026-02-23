import { parseEuroAmount } from './euroAmount';

export const FACTURAS_QUARTERS = [
  { key: 'T1', monthIndexes: [0, 1, 2] },
  { key: 'T2', monthIndexes: [3, 4, 5] },
  { key: 'T3', monthIndexes: [6, 7, 8] },
  { key: 'T4', monthIndexes: [9, 10, 11] },
];

export const FACTURAS_MONTH_NAMES = [
  'Enero',
  'Febrero',
  'Marzo',
  'Abril',
  'Mayo',
  'Junio',
  'Julio',
  'Agosto',
  'Septiembre',
  'Octubre',
  'Noviembre',
  'Diciembre',
];

function parseOptionalEuroAmount(value) {
  if (value === null || value === undefined || value === '') {
    return null;
  }

  const parsed = parseEuroAmount(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function calculateAmountWithTaxes(importe, tipo) {
  if (importe === null) {
    return null;
  }

  const multiplier = tipo === 'venta' ? 1.21 : 1.262;
  return importe * multiplier;
}

function getMonthIndexFromFactura(factura) {
  const source = factura?.fecha || factura?.fecha_subida;
  if (!source) {
    return null;
  }

  if (/^\d{4}-\d{2}-\d{2}$/.test(source)) {
    const monthPart = Number.parseInt(source.slice(5, 7), 10);
    if (monthPart >= 1 && monthPart <= 12) {
      return monthPart - 1;
    }
  }

  const parsed = new Date(source);
  if (Number.isNaN(parsed.getTime())) {
    return null;
  }

  return parsed.getMonth();
}

export function buildFacturasQuarterSummary(rows = [], tipo = 'compra') {
  const monthTotals = Array.from({ length: 12 }, () => ({
    importe: 0,
    amountWithTaxes: 0,
  }));

  rows.forEach((row) => {
    const monthIndex = getMonthIndexFromFactura(row);
    if (monthIndex === null) {
      return;
    }

    const importe = parseOptionalEuroAmount(row.importe);
    const amountWithTaxesFromRow = parseOptionalEuroAmount(row.importe_iva_re);
    const amountWithTaxes =
      amountWithTaxesFromRow ?? calculateAmountWithTaxes(importe, row?.tipo || tipo);

    if (importe !== null) {
      monthTotals[monthIndex].importe += importe;
    }

    if (amountWithTaxes !== null) {
      monthTotals[monthIndex].amountWithTaxes += amountWithTaxes;
    }
  });

  const quarters = FACTURAS_QUARTERS.map((quarter) => {
    const months = quarter.monthIndexes.map((monthIndex) => ({
      monthIndex,
      label: FACTURAS_MONTH_NAMES[monthIndex],
      total: monthTotals[monthIndex],
    }));

    return {
      key: quarter.key,
      total: {
        importe: months.reduce((sum, month) => sum + month.total.importe, 0),
        amountWithTaxes: months.reduce((sum, month) => sum + month.total.amountWithTaxes, 0),
      },
      months,
    };
  });

  return {
    quarters,
    annualTotal: {
      importe: quarters.reduce((sum, quarter) => sum + quarter.total.importe, 0),
      amountWithTaxes: quarters.reduce((sum, quarter) => sum + quarter.total.amountWithTaxes, 0),
    },
  };
}
