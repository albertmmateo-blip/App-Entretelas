import { parseEuroAmount } from './euroAmount';

export const ALBARAN_OPTIONS = ['Entretelas', 'Isa', 'Loli'];

const MONTH_NAME_FORMATTER = new Intl.DateTimeFormat('es-ES', {
  month: 'long',
  year: 'numeric',
});

export function normalizeFolderValue(value) {
  if (!value || typeof value !== 'string') {
    return null;
  }

  const matchingFolder = ALBARAN_OPTIONS.find(
    (option) => option.toLowerCase() === value.toLowerCase()
  );
  return matchingFolder || null;
}

export function monthKeyFromFecha(fecha) {
  if (typeof fecha !== 'string') {
    return null;
  }

  const [year, month] = fecha.split('-');
  if (!year || !month || year.length !== 4 || month.length !== 2) {
    return null;
  }

  return `${year}-${month}`;
}

export function monthLabelFromKey(monthKey) {
  const [year, month] = monthKey.split('-');
  const date = new Date(Number(year), Number(month) - 1, 1);
  if (Number.isNaN(date.getTime())) {
    return monthKey;
  }

  const text = MONTH_NAME_FORMATTER.format(date);
  return text.charAt(0).toUpperCase() + text.slice(1);
}

export function buildMonthlySummary(entries) {
  const monthsMap = new Map();

  entries.forEach((entry) => {
    const key = monthKeyFromFecha(entry.fecha);
    if (!key) {
      return;
    }

    const existing = monthsMap.get(key) || {
      monthKey: key,
      count: 0,
      totalImporte: 0,
      entretelas: 0,
      isa: 0,
      loli: 0,
    };

    existing.count += 1;
    const importeValue = parseEuroAmount(entry.importe);
    existing.totalImporte += importeValue;

    // Track per-folder totals
    const folder = normalizeFolderValue(entry.albaran);
    if (folder === 'Entretelas') {
      existing.entretelas += importeValue;
    } else if (folder === 'Isa') {
      existing.isa += importeValue;
    } else if (folder === 'Loli') {
      existing.loli += importeValue;
    }

    monthsMap.set(key, existing);
  });

  return [...monthsMap.values()]
    .sort((left, right) => right.monthKey.localeCompare(left.monthKey))
    .map((row) => ({
      ...row,
      monthLabel: monthLabelFromKey(row.monthKey),
    }));
}

export function splitArreglosTotal(totalImporte) {
  const numericTotal = parseEuroAmount(totalImporte);
  const folderShare = numericTotal * 0.65;
  const tiendaShare = numericTotal - folderShare;

  return {
    total: numericTotal,
    folderShare,
    tiendaShare,
  };
}
