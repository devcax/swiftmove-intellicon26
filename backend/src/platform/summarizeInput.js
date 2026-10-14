const ID_SHAPE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Field names and ids only. Free text, files and values never go into the audit row. */
function summarizeInput(input) {
  const summary = { fields: [], ids: {} };
  if (!input || typeof input !== 'object') return summary;
  for (const [key, value] of Object.entries(input)) {
    summary.fields.push(key);
    if (typeof value === 'string' && ID_SHAPE.test(value)) summary.ids[key] = value;
  }
  return summary;
}

module.exports = { summarizeInput, ID_SHAPE };
