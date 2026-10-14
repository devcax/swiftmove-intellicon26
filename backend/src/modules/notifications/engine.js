/** Persist one inbox item per active manager, atomically with the source change.
 * Add future event templates here; callers provide facts, never notification wording or destinations.
 */
const templates = {
  driverMessage: ({ messageId, conversationId, driverName, bodyText, messageType }) => ({
    notificationType: 'DRIVER_MESSAGE', sourceKey: `message:${messageId}`,
    title: `Message from ${driverName || 'driver'}`,
    body: bodyText?.trim() || `New ${(messageType || 'incoming').toLowerCase().replaceAll('_', ' ')} message.`,
    severity: 'INFO', targetPath: `/conversations?conversation=${conversationId}`,
  }),
  incidentReported: ({ incidentId, jobNumber, driverName, description, severity }) => ({
    notificationType: 'INCIDENT', sourceKey: `incident:${incidentId}`, incidentId,
    title: `Incident reported${jobNumber ? ` on ${jobNumber}` : ''}`,
    body: `${driverName || 'Driver'}: ${description}`,
    severity: severity === 'CRITICAL' ? 'CRITICAL' : 'HIGH', targetPath: `/incidents?incident=${incidentId}`,
  }),
};

async function notify(tx, kind, facts) {
  const template = templates[kind];
  if (!template) throw new Error(`Unknown notification kind: ${kind}`);
  const users = await tx.user.findMany({
    where: { organizationId: facts.organizationId, status: 'ACTIVE', userRoles: { some: { role: { code: { in: ['ADMIN', 'MANAGER'] } } } } },
    select: { id: true },
  });
  const item = template(facts);
  if (!users.length) return;
  await tx.notification.createMany({
    data: users.map(({ id }) => ({ ...item, title: item.title.slice(0, 180), body: item.body.slice(0, 4000),
      organizationId: facts.organizationId, jobId: facts.jobId ?? null, recipientUserId: id })),
    skipDuplicates: true,
  });
}

module.exports = { notify, templates };
