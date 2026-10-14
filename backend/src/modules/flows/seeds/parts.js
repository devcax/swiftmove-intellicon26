/** Pieces several built-in flows share. */

const CANCEL_ABORT_PATTERN = 'never mind|forget it|ignore|sorry|keep (the )?job';

const CANCEL_REASON_OPTIONS = [
  { id: 'CANCEL_REASON:VEHICLE_PROBLEM', label: 'Vehicle problem', next: 'begin' },
  { id: 'CANCEL_REASON:ACCIDENT', label: 'Accident', next: 'begin' },
  { id: 'CANCEL_REASON:CUSTOMER_ISSUE', label: 'Customer issue', next: 'ask_details' },
  { id: 'CANCEL_REASON:PERSONAL', label: 'Personal reason', next: 'ask_details' },
  { id: 'CANCEL_REASON:OTHER', label: 'Other', next: 'ask_details' },
];

const BACKUP_OPTIONS_TO_RECORD = [
  { id: 'BACKUP_NEEDED', label: 'Need backup vehicle', next: 'record_backup' },
  { id: 'BACKUP_NOT_NEEDED', label: 'No backup needed', next: 'record_backup' },
];

const BACKUP_OPTIONS_FIRST = [
  { id: 'BACKUP_NEEDED', label: 'Need backup vehicle', next: 'backup_first' },
  { id: 'BACKUP_NOT_NEEDED', label: 'No backup needed', next: 'backup_first' },
];

module.exports = { CANCEL_ABORT_PATTERN, CANCEL_REASON_OPTIONS, BACKUP_OPTIONS_TO_RECORD, BACKUP_OPTIONS_FIRST };
