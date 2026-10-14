/** The AI instructions a manager can customize: their key, name and what each one controls. */
const INSTRUCTIONS = {
  'interpreter.system': {
    label: 'Message interpreter',
    description: 'How the AI reads each driver message and turns it into a structured job event (intents, rules, language handling).',
  },
  'companion.voice': {
    label: 'Dispatcher voice',
    description: 'The personality and writing style of the bot replies drivers see on WhatsApp.',
  },
  'vision.classifier': {
    label: 'Photo classifier',
    description: 'How the AI classifies driver photos (accident, cargo, pickup/delivery paperwork) and what it extracts.',
  },
  'document.extraction': {
    label: 'Document code reader',
    description: 'How the AI reads security codes and job numbers from photographed pickup/delivery documents.',
  },
  'flow.classifier': {
    label: 'Flow answer classifier',
    description: 'How the AI places a free-text driver answer into the categories defined on a conversation flow step (branching only, never enforcement).',
  },
  'flow.topic_router': {
    label: 'Flow topic router',
    description: 'How the AI picks which topic a general driver question belongs to, so the conversation flow registered for that topic answers it (routing only, never free-form replies).',
  },
  'flow.author': {
    label: 'Flow author',
    description: 'How the AI turns a plain-words description into a conversation flow draft (step types, branching shapes, whitelisted actions).',
  },
  'policy.author': {
    label: 'Policy author',
    description: 'How the AI turns a plain-words operational rule into a policy draft (supported capabilities, when the rule applies, what happens when it is missing).',
  },
};

module.exports = { INSTRUCTIONS };
