/**
 * The status change and audit row a manager's job action leaves behind. The records shared with the other job modules
 * (events, audit, driver contact, notices) live in platform/jobRecords.js.
 */
const records = require('../../platform/jobRecords');
const { findOrCreateLocation } = require('./repo');

const { findJob } = records;

/** A manager's status change: the update and its audit row. */
const setStatus = (tx, job, status, actorUserId) => records.setStatus(tx, job, status, { type: 'MANAGER', userId: actorUserId });

/** A manager's audit row for a job. */
const audit = (tx, { actorUserId, ...entry }) => records.audit(tx, { ...entry, actor: { type: 'MANAGER', userId: actorUserId } });

const { recordEvent, findLiveAssignment, clearActiveJob, findDriverContact, toBotJob } = records;

module.exports = { LIVE_ASSIGNMENT: records.LIVE_ASSIGNMENT, findJob, findOrCreateLocation, setStatus, audit, recordEvent, findLiveAssignment, clearActiveJob, findDriverContact, toBotJob };
