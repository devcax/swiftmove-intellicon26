const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const ts = require('typescript');

// Load the production TypeScript validators without a browser or an additional test framework.
require.extensions['.ts'] = (module, filename) => {
  const source = fs.readFileSync(filename, 'utf8');
  module._compile(ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText, filename);
};
const { createJobSchema, editJobSchema, EMPTY_JOB_FORM } = require('../features/jobs/schemas.ts');
const { toLocalInput, resolvedUnit, formCoordinates } = require('../features/jobs/listing.ts');
const hour = 3600000;
const valid = () => ({ ...EMPTY_JOB_FORM, pickupLocation: 'Pickup yard', deliveryLocation: 'Delivery depot', cargo: 'Cargo', quantity: '5',
  pickupAt: toLocalInput(new Date(Date.now() + 3 * hour).toISOString()), deliveryAt: toLocalInput(new Date(Date.now() + 4 * hour).toISOString()),
  pickupLatitude: '6.927079', pickupLongitude: '79.861244', deliveryLatitude: '7.290571', deliveryLongitude: '80.633728' });
const schemas = () => [createJobSchema(toLocalInput(new Date(Date.now() + hour).toISOString())), editJobSchema];

test('create and edit accept a named route with map pins and future schedule', () => {
  for (const schema of schemas()) assert.equal(schema.safeParse(valid()).success, true);
});

test('a selected pin cannot be saved until its readable address has loaded', () => {
  for (const schema of schemas()) {
    assert.equal(schema.safeParse({ ...valid(), pickupLocation: '' }).success, false);
    assert.equal(schema.safeParse({ ...valid(), deliveryLocation: '' }).success, false);
  }
});
test('create and edit reject past pickup, malformed dates, reversed and equal delivery times', () => {
  const form = valid();
  for (const schema of schemas()) {
    for (const extra of [{ pickupAt: toLocalInput(new Date(Date.now() - hour).toISOString()) }, { pickupAt: 'invalid' }, { deliveryAt: form.pickupAt }, { deliveryAt: toLocalInput(new Date(Date.now() + 2 * hour).toISOString()) }, { deliveryAt: '' }]) {
      assert.equal(schema.safeParse({ ...form, ...extra }).success, false);
    }
  }
});
test('Other requires a real name and the API payload uses that name', () => {
  for (const schema of schemas()) {
    assert.equal(schema.safeParse({ ...valid(), unit: 'Other', customUnit: '' }).success, false);
    assert.equal(schema.safeParse({ ...valid(), unit: 'Other', customUnit: 'Other' }).success, false);
    const form = { ...valid(), unit: 'Other', customUnit: ' Crates ' };
    assert.equal(schema.safeParse(form).success, true);
    assert.equal(resolvedUnit(form), 'Crates');
  }
});
test('map pins must be complete, finite and in range, and are sent numerically', () => {
  for (const schema of schemas()) {
    for (const extra of [{ pickupLatitude: '' }, { deliveryLongitude: '181' }, { pickupLatitude: 'NaN' }]) assert.equal(schema.safeParse({ ...valid(), ...extra }).success, false);
    assert.equal(schema.safeParse({ ...valid(), pickupLatitude: '0', pickupLongitude: '0' }).success, true);
  }
  assert.deepEqual(formCoordinates(valid(), 'pickup'), { latitude: 6.927079, longitude: 79.861244 });
});
