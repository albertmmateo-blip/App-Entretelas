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

export function buildFacturasQuarterSummary(rows = []) {
  const monthTotals = Array.from({ length: 12 }, () => 0);

  rows.forEach((row) => {
    const monthIndex = getMonthIndexFromFactura(row);
    if (monthIndex === null) {
      return;
    }

    monthTotals[monthIndex] += parseEuroAmount(row.importe_iva_re);
  });

  const quarters = FACTURAS_QUARTERS.map((quarter) => {
    const months = quarter.monthIndexes.map((monthIndex) => ({
      monthIndex,
      label: FACTURAS_MONTH_NAMES[monthIndex],
      total: monthTotals[monthIndex],
    }));

    return {
      key: quarter.key,
      total: months.reduce((sum, month) => sum + month.total, 0),
      months,
    };
  });

  return {
    quarters,
    annualTotal: quarters.reduce((sum, quarter) => sum + quarter.total, 0),
  };
}
