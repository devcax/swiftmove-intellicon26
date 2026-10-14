/** "birth_certificate" -> "birth certificate". Check messages name the missing item in plain words. */
const humanize = (name) => String(name ?? 'item').replace(/_/g, ' ').trim();

const ASK = {
  DOCUMENT: (label) => `Please upload the ${label}.`,
  CONFIRMATION: (label) => `Please confirm: ${label}.`,
  TEXT: (label) => `Please add the ${label}.`,
  LOCATION: (label) => `Please share the ${label}.`,
  APPROVAL: (label) => `A manager has to approve the ${label} first.`,
};

const askFor = (type, name) => (ASK[type] ?? ASK.TEXT)(humanize(name));

module.exports = { humanize, askFor };
