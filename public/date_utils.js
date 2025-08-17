function toDDMMYYYY(input) {
  if (!input) return '';
  if (input.includes('/')) return input; // already formatted
  const [year, month, day] = input.split('-');
  if (!year || !month || !day) return input;
  const dd = String(day).padStart(2, '0');
  const mm = String(month).padStart(2, '0');
  return `${dd}/${mm}/${year}`;
}

function toYYYYMMDD(input) {
  if (!input) return '';
  if (input.includes('-')) return input; // already formatted
  const [day, month, year] = input.split('/');
  if (!year || !month || !day) return input;
  const dd = String(day).padStart(2, '0');
  const mm = String(month).padStart(2, '0');
  return `${year}-${mm}-${dd}`;
}

// Экспорт для использования в браузере
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { toDDMMYYYY, toYYYYMMDD };
}
