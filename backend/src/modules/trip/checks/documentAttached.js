const { z } = require('zod');
const { defineCheck } = require('../../../platform/registry');

module.exports = defineCheck({
  name: 'document_attached',
  label: 'A document was attached (not code-verified)',
  description:
    'A document of the given type (e.g. POD) was sent for this job. ' +
    'This only checks that an attachment arrived — it is NOT a code-verified proof.',
  actions: '*',
  params: z.object({ documentType: z.enum(['POD', 'OTHER']) }),
  paramSpec: [{ name: 'documentType', label: 'document type', kind: 'enum', values: ['POD', 'OTHER'], required: true }],
  dataDependencies: ['workflow_events'],
  evidence: { kind: 'DOCUMENT' },
  evaluate: async (ctx, params) => {
    const type = params.documentType;
    if (ctx.receivedDocumentTypes?.includes(type)) return { pass: true };
    return {
      pass: false,
      code: 'DOCUMENT_MISSING',
      message: `I don't have a ${type} document for this job yet. Please send a photo of it here.`,
      reason: `no ${type} attachment was sent for this job (attachment check only, not code-verified)`,
      evidence: { kind: 'DOCUMENT', documentType: type },
    };
  },
});
