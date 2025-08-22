function toDDMMYYYY(input) {
  if (!input) return '';
  if (input.includes('.')) return input; // already formatted with dots
  // dd/mm/yyyy -> dd.mm.yyyy
  const mSlash = input.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (mSlash) {
    const [, dd, mm, yyyy] = mSlash;
    return `${dd}.${mm}.${yyyy}`;
  }
  // yyyy-mm-dd -> dd.mm.yyyy
  const parts = input.split('-');
  if (parts.length === 3) {
    const [year, month, day] = parts;
    const dd = String(day).padStart(2, '0');
    const mm = String(month).padStart(2, '0');
    return `${dd}.${mm}.${year}`;
  }
  return input;
}

function toYYYYMMDD(input) {
  if (!input) return '';
  if (input.includes('-')) return input; // already formatted
  const m = input.match(/^(\d{2})[\.\/]?(\d{2})[\.\/]?(\d{4})$/);
  if (m) {
    const [, dd, mm, yyyy] = m;
    const day = String(dd).padStart(2, '0');
    const month = String(mm).padStart(2, '0');
    return `${yyyy}-${month}-${day}`;
  }
  const [day, month, year] = input.split('.');
  if (!year || !month || !day) return input;
  const dd = String(day).padStart(2, '0');
  const mm = String(month).padStart(2, '0');
  return `${year}-${mm}-${dd}`;
}

// Экспорт для использования в браузере
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { toDDMMYYYY, toYYYYMMDD };
}
