/** Built-in flows: Cancelling, delays, starting, ending and documents during a trip. */
const { CANCEL_ABORT_PATTERN, CANCEL_REASON_OPTIONS } = require('./parts');

const SEEDS = [
  {
    key: 'cancellation.request',
    name: 'Driver asks to cancel the trip',
    description:
      'If the driver already says why ("cancel this job, truck broke down") the request goes straight to the manager. Otherwise the bot offers the reason menu, asks vague reasons (customer issue, personal, other) for more detail, then hands the request over.',
    triggerType: 'INTENT',
    triggerConfig: { intent: 'CANCELLATION_REQUESTED' },
    definition: {
      steps: [
        { id: 'has_reason', type: 'IF', check: 'driver_gave_reason', then: 'begin', else: 'ask_reason' },
        {
          id: 'ask_reason',
          type: 'ASK_CHOICE',
          text: 'Of course, I can ask the manager to cancel this trip. What happened? (They review every request.)',
          options: CANCEL_REASON_OPTIONS,
          saveAs: 'reason',
          onText: { saveAs: 'reason', next: 'begin' },
          cancelPattern: CANCEL_ABORT_PATTERN,
          cancelText: 'No worries, your job stays as it is. ',
        },
        {
          id: 'ask_details',
          type: 'ASK_TEXT',
          text: "Please tell me a little more about the {reason|lower}. I will include it with the manager's cancellation review.",
          saveAs: 'details',
          next: 'begin_details',
          cancelPattern: CANCEL_ABORT_PATTERN,
          cancelText: 'No worries, your job stays as it is.',
        },
        {
          id: 'begin',
          type: 'ACTION',
          name: 'beginCancellation',
          params: { reason: '$reason' },
          next: 'end',
        },
        {
          id: 'begin_details',
          type: 'ACTION',
          name: 'beginCancellation',
          params: { reason: '$reason', details: '$details' },
          next: 'end',
        },
        { id: 'end', type: 'END' },
      ],
    },
  },
  {
    key: 'delay.reason',
    name: 'Delay reason follow-up',
    description:
      'A pickup/delivery code was verified later than scheduled, so the bot asks what caused the delay before finishing the milestone.',
    triggerType: 'EVENT',
    triggerConfig: { event: 'delay.reason.required' },
    definition: {
      steps: [
        {
          id: 'ask',
          type: 'ASK_TEXT',
          promptFrom: 'delayReasonPrompt',
          saveAs: 'reason',
          next: 'record',
        },
        {
          id: 'record',
          type: 'ACTION',
          name: 'recordDelayReason',
          params: { stage: '$stage', reason: '$reason' },
          next: 'end',
        },
        { id: 'end', type: 'END' },
      ],
    },
  },
  {
    key: 'job.start-confirm',
    name: 'Job start confirmation',
    description:
      'The job cannot move forward until the driver personally confirms it started (verified document arrived before start, or a milestone update on a not-started job).',
    triggerType: 'EVENT',
    triggerConfig: { event: 'job.start-confirm.required' },
    definition: {
      steps: [
        {
          id: 'ask',
          type: 'ASK_CHOICE',
          promptFrom: 'startConfirmPrompt',
          options: [
            { id: 'CONFIRM_START_JOB', label: 'Confirm job started', next: 'confirm' },
            { id: 'START_NOT_YET', label: 'Not started yet', next: 'deny' },
          ],
          onText: { intentMap: { CONFIRM_EVENT: 'confirm' } },
        },
        {
          id: 'confirm',
          type: 'ACTION',
          name: 'confirmStartAndContinue',
          params: { candidate: '$candidate' },
          next: 'end',
        },
        {
          id: 'deny',
          type: 'SAY',
          text: 'No problem, nothing changed. Just say "start job" here when you actually roll.',
          next: 'end',
        },
        { id: 'end', type: 'END' },
      ],
    },
  },
  {
    key: 'job.end-confirm',
    name: 'Send job for closure',
    description:
      'Driver asks to close the trip. The bot checks for open safety incidents and confirmed delivery, then sends the job to the manager for closure.',
    triggerType: 'INTENT',
    triggerConfig: { intent: 'END_JOB' },
    definition: {
      steps: [
        { id: 'close', type: 'ACTION', name: 'endJobGuarded', next: 'end' },
        { id: 'end', type: 'END' },
      ],
    },
  },
  {
    key: 'job.doc-choice',
    name: 'Attach a document to a chosen job',
    description:
      'Driver sent a document without an active job and picked which job it belongs to (DOC_JOB buttons).',
    triggerType: 'BUTTON',
    triggerConfig: { buttonPrefix: 'DOC_JOB:' },
    definition: {
      steps: [
        {
          id: 'attach',
          type: 'ACTION',
          name: 'attachDocumentsFromChoice',
          params: { jobId: '$buttonParam' },
          next: 'end',
        },
        { id: 'end', type: 'END' },
      ],
    },
  },
  {
    key: 'job.gap-start',
    name: 'Confirm trip start after a gap',
    description: 'Driver confirms or dismisses a late trip start (GAP_START_YES / GAP_START_NO buttons).',
    triggerType: 'BUTTON',
    triggerConfig: { buttons: ['GAP_START_YES', 'GAP_START_NO'] },
    definition: {
      steps: [
        {
          id: 'respond',
          type: 'ACTION',
          name: 'gapStartRespond',
          params: { answer: '$buttonId' },
          next: 'end',
        },
        { id: 'end', type: 'END' },
      ],
    },
  },
];

module.exports = { SEEDS };
