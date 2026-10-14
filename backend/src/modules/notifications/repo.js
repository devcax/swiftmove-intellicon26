/** Every database call of the notifications module. */

const findEventTime = async (tx, organizationId, eventId) => (await tx.event.findFirst({ where: { id: eventId, organizationId }, select: { createdAt: true } }))?.createdAt ?? null;

/** Was this notice already raised since the event happened? */
const noticeRaisedSince = async (tx, notice, since) => Boolean(await tx.notification.findFirst({
  where: {
    organizationId: notice.organizationId, jobId: notice.jobId ?? null, incidentId: notice.incidentId ?? null, notificationType: notice.type,
    title: notice.title, body: notice.body, createdAt: { gte: since },
  },
  select: { id: true },
}));

// Legacy notices remain available to their existing consumers; the inbox currently supports only these two sources.
const inboxScope = (actor) => {
  if (!actor.organizationId || !actor.userId) throw new Error('A signed-in notification recipient is required');
  return { organizationId: actor.organizationId, recipientUserId: actor.userId,
    sourceKey: { not: null }, notificationType: { in: ['DRIVER_MESSAGE', 'INCIDENT'] } };
};
async function inbox(db, actor, limit) {
  const checkedAt = new Date().toISOString();
  return db.$transaction(async (tx) => {
    const where = { ...inboxScope(actor), createdAt: { lte: new Date(checkedAt) } };
    const [items, unreadCount] = await Promise.all([
      tx.notification.findMany({ where, orderBy: [{ createdAt: 'desc' }, { id: 'desc' }], take: limit,
        select: { id: true, notificationType: true, title: true, body: true, severity: true, targetPath: true, readAt: true, createdAt: true } }),
      tx.notification.count({ where: { ...where, readAt: null } }),
    ]);
    return { items, unreadCount, checkedAt };
  }, { isolationLevel: 'RepeatableRead' });
}
async function markRead(tx, actor, input) {
  const where = { ...inboxScope(actor), ...('id' in input ? { id: input.id } : { createdAt: { lte: new Date(input.through) } }) };
  const found = 'id' in input ? Boolean(await tx.notification.findFirst({ where, select: { id: true } })) : true;
  if (found) await tx.notification.updateMany({ where: { ...where, readAt: null }, data: { readAt: new Date() } });
  return { found };
}
module.exports = { findEventTime, noticeRaisedSince, inboxScope, inbox, markRead };
