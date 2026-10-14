/** Built-in flows: Finding, asking for and answering for work. */
const SEEDS = [
  {
    key: 'job.browse',
    name: 'Browse available jobs',
    description:
      'Driver asks what jobs are open. The bot lists suitable jobs and puts the driver name in for the one they tap.',
    triggerType: 'INTENT',
    triggerConfig: { intent: 'SHOW_AVAILABLE_JOBS' },
    definition: {
      steps: [
        {
          id: 'choose',
          type: 'ASK_CHOICE',
          promptFrom: 'availableJobsPrompt',
          promptParams: { variant: 'browse' },
          saveAs: 'jobId',
          next: 'request',
        },
        {
          id: 'request',
          type: 'ACTION',
          name: 'requestJobById',
          params: { jobId: '$optionParam' },
          next: 'end',
        },
        { id: 'end', type: 'END' },
      ],
    },
  },
  {
    key: 'job.request',
    name: 'Driver asks for a job',
    description:
      'If the driver names the job ("I want JOB-1042") the bot requests it from the manager. If not, the bot lists the open ones and requests the one they tap.',
    triggerType: 'INTENT',
    triggerConfig: { intent: 'REQUEST_JOB' },
    definition: {
      steps: [
        { id: 'has_job', type: 'IF', check: 'driver_gave_job_number', then: 'request_named', else: 'choose' },
        {
          id: 'request_named',
          type: 'ACTION',
          name: 'requestJobByNumber',
          params: { ref: '$jobReference' },
          next: 'end',
        },
        {
          id: 'choose',
          type: 'ASK_CHOICE',
          promptFrom: 'availableJobsPrompt',
          promptParams: { variant: 'request' },
          saveAs: 'jobId',
          next: 'request_chosen',
        },
        {
          id: 'request_chosen',
          type: 'ACTION',
          name: 'requestJobById',
          params: { jobId: '$optionParam' },
          next: 'end',
        },
        { id: 'end', type: 'END' },
      ],
    },
  },
  {
    key: 'job.choose',
    name: 'Pick a job from a list',
    description: 'Driver taps a job from a bot list (CHOOSE_JOB buttons) and the bot requests it from the manager.',
    triggerType: 'BUTTON',
    triggerConfig: { buttonPrefix: 'CHOOSE_JOB:' },
    definition: {
      steps: [
        {
          id: 'request',
          type: 'ACTION',
          name: 'requestJobById',
          params: { jobId: '$buttonParam' },
          next: 'end',
        },
        { id: 'end', type: 'END' },
      ],
    },
  },
  {
    key: 'job.apply',
    name: 'Apply for an invited job',
    description: 'Driver taps "Apply now" on a job invite (APPLY_JOB buttons); the bot puts their name in for manager approval.',
    triggerType: 'BUTTON',
    triggerConfig: { buttonPrefix: 'APPLY_JOB' },
    definition: {
      steps: [
        {
          id: 'apply',
          type: 'ACTION',
          name: 'submitApplyRequestSmart',
          params: { jobIdParam: '$buttonParam' },
          next: 'end',
        },
        { id: 'end', type: 'END' },
      ],
    },
  },
  {
    key: 'offer.response',
    name: 'Answer a job offer',
    description: 'Driver accepts or declines a job offer (ACCEPT_JOB / DECLINE_JOB buttons).',
    triggerType: 'BUTTON',
    triggerConfig: { buttons: ['ACCEPT_JOB', 'DECLINE_JOB'] },
    definition: {
      steps: [
        {
          id: 'respond',
          type: 'ACTION',
          name: 'respondOffer',
          params: { decision: '$buttonId' },
          next: 'end',
        },
        { id: 'end', type: 'END' },
      ],
    },
  },
];

module.exports = { SEEDS };
