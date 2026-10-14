/** Built-in flows: The safety check after an accident. */
const { BACKUP_OPTIONS_TO_RECORD, BACKUP_OPTIONS_FIRST } = require('./parts');

const SEEDS = [
  {
    key: 'incident.safety',
    name: 'Incident safety check',
    description:
      'Before a cancellation or trip closure with an open accident/critical incident, the bot collects the driver location and whether a backup vehicle is needed, then completes the cancellation and alerts the manager.',
    triggerType: 'EVENT',
    triggerConfig: { event: 'incident.safety.required' },
    definition: {
      steps: [
        {
          id: 'ask_location',
          type: 'ASK_LOCATION',
          text: "Before we close this out, there's still an open {incidentType|lower} report on your trip. Please share your current location using the attachment menu in WhatsApp, and let me know about a backup vehicle:",
          options: BACKUP_OPTIONS_FIRST,
          reprompt: 'Almost done, share your current location using the attachment menu in WhatsApp, or tap one of the backup options above. ',
          next: 'record_location_first',
        },
        {
          id: 'record_location_first',
          type: 'ACTION',
          name: 'safetyRecordLocation',
          params: { lat: '$lat', lng: '$lng' },
          next: 'ask_backup',
        },
        {
          id: 'ask_backup',
          type: 'ASK_CHOICE',
          text: 'Location received. Do you need a backup vehicle?',
          options: BACKUP_OPTIONS_TO_RECORD,
          reprompt: 'Almost done, share your current location using the attachment menu in WhatsApp, or tap one of the backup options above. ',
        },
        {
          id: 'record_backup',
          type: 'ACTION',
          name: 'safetyRecordBackup',
          params: { backup: '$optionId' },
          next: 'complete',
        },
        {
          id: 'backup_first',
          type: 'ACTION',
          name: 'safetyRecordBackup',
          params: { backup: '$optionId' },
          next: 'ask_location_again',
        },
        {
          id: 'ask_location_again',
          type: 'ASK_LOCATION',
          text: 'Noted. Now share your current location using the attachment menu in WhatsApp so the manager knows where you are.',
          reprompt: 'Almost done, share your current location using the attachment menu in WhatsApp, or tap one of the backup options above. ',
          next: 'record_location_second',
        },
        {
          id: 'record_location_second',
          type: 'ACTION',
          name: 'safetyRecordLocation',
          params: { lat: '$lat', lng: '$lng' },
          next: 'complete',
        },
        {
          id: 'complete',
          type: 'ACTION',
          name: 'safetyComplete',
          next: 'end',
        },
        { id: 'end', type: 'END' },
      ],
    },
  },
];

module.exports = { SEEDS };
