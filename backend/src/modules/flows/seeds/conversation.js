/** Built-in flows: Confirming and clarifying what a driver said, and free questions. */
const SEEDS = [
  {
    key: 'candidate.confirm',
    name: 'Confirm an understood update',
    description:
      'The bot is fairly sure what the driver meant but asks for confirmation before applying it (Confirm / Cancel).',
    triggerType: 'EVENT',
    triggerConfig: { event: 'candidate.confirmation.required' },
    definition: {
      steps: [
        {
          id: 'ask',
          type: 'ASK_CHOICE',
          promptFrom: 'candidateConfirmationPrompt',
          options: [
            { id: 'CONFIRM_YES', label: 'Confirm', next: 'yes' },
            { id: 'CONFIRM_NO', label: 'Cancel', next: 'no' },
          ],
          onText: {
            intentMap: { CONFIRM_EVENT: 'yes', CORRECT_EVENT: 'correct' },
            elseNext: 'passthrough',
          },
        },
        {
          id: 'yes',
          type: 'ACTION',
          name: 'applyCandidateConfirmed',
          params: { candidate: '$candidate' },
          next: 'end',
        },
        {
          id: 'no',
          type: 'SAY',
          text: 'No problem, scrapped it, nothing changed. ',
          next: 'end',
        },
        {
          id: 'correct',
          type: 'ACTION',
          name: 'mergeCorrection',
          // No next: the action returns { retry: true } to re-ask the
          // previous question with the merged candidate (runtime retry,
          // keeps the definition a DAG).
        },
        {
          id: 'passthrough',
          type: 'ACTION',
          name: 'routeCandidatePassthrough',
          next: 'end',
        },
        { id: 'end', type: 'END' },
      ],
    },
  },
  {
    key: 'candidate.clarify',
    name: 'Ask a clarifying question',
    description:
      'The bot is unsure what the driver meant and asks them to rephrase or confirm what they meant.',
    triggerType: 'EVENT',
    triggerConfig: { event: 'candidate.clarification.required' },
    definition: {
      steps: [
        {
          id: 'send',
          type: 'ACTION',
          name: 'sendClarification',
          params: { question: '$question', candidate: '$candidate' },
          next: 'end',
        },
        { id: 'end', type: 'END' },
      ],
    },
  },
  {
    key: 'freeform.answer',
    name: 'Answer an open question',
    description:
      'The bot asked the driver an open question; the reply is answered directly with the next step that follows from it.',
    triggerType: 'EVENT',
    triggerConfig: { event: 'freeform.question.asked' },
    definition: {
      steps: [
        {
          id: 'await_answer',
          type: 'ASK_TEXT',
          sendText: false,
          saveAs: 'answer',
          onText: {
            intentMap: {
              CONFIRM_EVENT: 'answer',
              CORRECT_EVENT: 'answer',
              UNKNOWN: 'answer',
            },
            elseNext: 'passthrough',
          },
        },
        {
          id: 'answer',
          type: 'ACTION',
          name: 'answerFreeform',
          params: { question: '$question', answer: '$answer' },
          next: 'end',
        },
        {
          id: 'passthrough',
          type: 'ACTION',
          name: 'routeCandidatePassthrough',
          next: 'end',
        },
        { id: 'end', type: 'END' },
      ],
    },
  },
];

module.exports = { SEEDS };
