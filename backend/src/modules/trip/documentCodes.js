/** Comparing the codes read from a photographed paper with the code recorded for the job. Pure: no model, no database. */

const OUTCOME = {
  OK: "OK",
  UNCLEAR: "UNCLEAR",
  TECH_FAIL: "TECH_FAIL",
};

function normalizeCode(value) {
  return String(value ?? "")
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "");
}

function matchesExpectedCode({ extraction, expectedCode, jobNumber }) {
  const expected = normalizeCode(expectedCode);
  if (!expected) return { matched: false, reason: "NO_EXPECTED_CODE" };

  const codeOk = extraction.codes.some((c) => normalizeCode(c) === expected);
  if (!codeOk) return { matched: false, reason: "CODE_MISMATCH" };

  if (
    extraction.jobNumber &&
    jobNumber &&
    normalizeCode(extraction.jobNumber) !== normalizeCode(jobNumber)
  ) {
    return { matched: false, reason: "JOB_NUMBER_MISMATCH" };
  }
  return { matched: true, reason: null };
}

module.exports = { OUTCOME, normalizeCode, matchesExpectedCode };
