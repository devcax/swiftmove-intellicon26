/** A driver can answer a job invitation by swiping it and typing "apply": find which job the swiped message was about. */
const repo = require("./repo");

async function quotedApplyInviteJobId(conversationId, replyToMessageId) {
  if (!replyToMessageId) return null;

  const body = (await repo.findBotMessageText(conversationId, replyToMessageId)) ?? "";
  if (!/tap\s+apply\s+now/i.test(body)) return null;

  const jobNumber = body.match(/\bJOB-[A-Z0-9-]+\b/i)?.[0];
  if (!jobNumber) return null;

  return repo.findJobIdByNumber(conversationId, jobNumber);
}

module.exports = { quotedApplyInviteJobId };
