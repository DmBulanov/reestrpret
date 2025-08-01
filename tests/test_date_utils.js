const assert = require('assert');
const { toDDMMYYYY, toYYYYMMDD } = require('../public/date_utils');

assert.strictEqual(toDDMMYYYY('2020-12-31'), '31/12/2020');
assert.strictEqual(toDDMMYYYY('31/12/2020'), '31/12/2020');
assert.strictEqual(toDDMMYYYY(''), '');

assert.strictEqual(toYYYYMMDD('31/12/2020'), '2020-12-31');
assert.strictEqual(toYYYYMMDD('2020-12-31'), '2020-12-31');
assert.strictEqual(toYYYYMMDD(''), '');

console.log('date_utils tests passed');
