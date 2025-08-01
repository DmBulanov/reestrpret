function toDDMMYYYY(input) {
  if (!input) return '';
  if (input.includes('/')) return input; // already formatted
  const [year, month, day] = input.split('-');
  if (!year || !month || !day) return input;
  return `${day}/${month}/${year}`;
}

function toYYYYMMDD(input) {
  if (!input) return '';
  if (input.includes('-')) return input; // already formatted
  const [day, month, year] = input.split('/');
  if (!year || !month || !day) return input;
  return `${year}-${month}-${day}`;
}

module.exports = { toDDMMYYYY, toYYYYMMDD };
