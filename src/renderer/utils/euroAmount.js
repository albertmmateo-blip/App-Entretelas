function parseEuroAmount(value) {
  if (value === null || value === undefined || value === '') {
    return 0;
  }

  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : 0;
  }

  if (typeof value !== 'string') {
    return 0;
  }

  const trimmed = value.trim();
  if (!trimmed) {
    return 0;
  }

  const normalized = trimmed.replace(/€/g, '').replace(/\s/g, '');

  let numericString = normalized;
  const lastComma = numericString.lastIndexOf(',');
  const lastDot = numericString.lastIndexOf('.');

  if (lastComma !== -1 && lastDot !== -1) {
    if (lastComma > lastDot) {
      numericString = numericString.replace(/\./g, '').replace(',', '.');
    } else {
      numericString = numericString.replace(/,/g, '');
    }
  } else if (lastComma !== -1) {
    numericString = numericString.replace(',', '.');
  }

  const parsed = Number(numericString);
  return Number.isFinite(parsed) ? parsed : 0;
}

function formatEuroAmount(value) {
  const numericValue = parseEuroAmount(value);
  return numericValue.toLocaleString('es-ES', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export { parseEuroAmount, formatEuroAmount };
