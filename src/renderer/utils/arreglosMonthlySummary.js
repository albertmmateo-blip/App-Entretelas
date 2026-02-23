import { parseEuroAmount } from './euroAmount';

export const ALBARAN_OPTIONS = ['Entretelas', 'Isa', 'Loli'];

export const ARREGLOS_QUARTERS = [
  { key: 'T1', monthIndexes: [0, 1, 2] },
  { key: 'T2', monthIndexes: [3, 4, 5] },
  { key: 'T3', monthIndexes: [6, 7, 8] },
  { key: 'T4', monthIndexes: [9, 10, 11] },
];

export const ARREGLOS_MONTH_NAMES = [
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

function createFolderMetrics() {
  return Object.fromEntries(ALBARAN_OPTIONS.map((folder) => [folder, { amount: 0, count: 0 }]));
}

function getMonthIndexFromArreglo(entry) {
  const source = entry?.fecha;
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

export function buildArreglosQuarterSummary(entries = []) {
  const monthlyBuckets = Array.from({ length: 12 }, (_, monthIndex) => ({
    monthIndex,
    label: ARREGLOS_MONTH_NAMES[monthIndex],
    total: { amount: 0, count: 0 },
    folders: createFolderMetrics(),
  }));

  entries.forEach((entry) => {
    const folder = normalizeFolderValue(entry?.albaran);
    const monthIndex = getMonthIndexFromArreglo(entry);
    if (!folder || monthIndex === null) {
      return;
    }

    const amount = parseEuroAmount(entry?.importe);
    const month = monthlyBuckets[monthIndex];
    month.total.amount += amount;
    month.total.count += 1;
    month.folders[folder].amount += amount;
    month.folders[folder].count += 1;
  });

  const quarters = ARREGLOS_QUARTERS.map((quarter) => {
    const months = quarter.monthIndexes.map((monthIndex) => monthlyBuckets[monthIndex]);
    const folders = createFolderMetrics();

    months.forEach((month) => {
      ALBARAN_OPTIONS.forEach((folder) => {
        folders[folder].amount += month.folders[folder].amount;
        folders[folder].count += month.folders[folder].count;
      });
    });

    return {
      key: quarter.key,
      total: {
        amount: months.reduce((sum, month) => sum + month.total.amount, 0),
        count: months.reduce((sum, month) => sum + month.total.count, 0),
      },
      folders,
      months,
    };
  });

  return {
    quarters,
    annualTotal: {
      amount: quarters.reduce((sum, quarter) => sum + quarter.total.amount, 0),
      count: quarters.reduce((sum, quarter) => sum + quarter.total.count, 0),
    },
  };
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
