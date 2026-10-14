/** The manager chat's own tables: the conversations, their messages, and the pending confirmations. Business records are never touched here. */
const crypto = require('crypto');
const { prisma } = require('../../platform/db');

const CONFIRMATION_TTL_MS = 5 * 60 * 1000;
// How many of a chat's latest messages the assistant reads. The manager can change it per chat, within these limits (the database holds the same range).
const CONTEXT = Object.freeze({ min: 2, max: 30, default: 6 });
const hashToken = (token) => crypto.createHash('sha256').update(String(token)).digest('hex');

const createChat = ({ organizationId, userId }) => prisma.managerChat.create({ data: { organizationId, userId }, select: { id: true, createdAt: true } });

/** A chat belongs to one manager. Anyone else gets nothing, as if it did not exist. */
const findChat = ({ id, organizationId, userId }) => prisma.managerChat.findFirst({ where: { id, organizationId, userId }, select: { id: true, title: true, contextMessages: true } });

/** The manager's own chats, most recently used first. */
const listChats = ({ organizationId, userId, take = 50 }) => prisma.managerChat.findMany({
  where: { organizationId, userId }, orderBy: { updatedAt: 'desc' }, take, select: { id: true, title: true, contextMessages: true, updatedAt: true },
});

const setContextMessages = (chatId, contextMessages) => prisma.managerChat.update({ where: { id: chatId }, data: { contextMessages }, select: { id: true, contextMessages: true } });
const updateSettings = (chatId, settings) => prisma.managerChat.update({ where: { id: chatId }, data: settings, select: { id: true, title: true, contextMessages: true } });

/** Name a chat after its first message, once. */
const nameIfUnnamed = (chatId, text) => prisma.managerChat.updateMany({ where: { id: chatId, title: null }, data: { title: String(text).replace(/\s+/g, ' ').trim().slice(0, 60) || null } });

/** Forget everything said in a chat (messages and waiting confirmations); the chat itself stays. */
const clearChat = (chatId) => prisma.$transaction([
  prisma.managerChatConfirmation.deleteMany({ where: { chatId } }),
  prisma.managerChatMessage.deleteMany({ where: { chatId } }),
  prisma.managerChat.update({ where: { id: chatId }, data: { title: null, updatedAt: new Date() } }),
]);

const deleteChat = (chatId) => prisma.managerChat.delete({ where: { id: chatId } });

const addMessage = (chatId, data) => prisma.managerChatMessage.create({ data: { chatId, ...data }, select: { id: true, role: true, content: true, toolName: true, toolOutcome: true, createdAt: true } });

const touch = (chatId) => prisma.managerChat.update({ where: { id: chatId }, data: { updatedAt: new Date() } });

const listMessages = (chatId, { take = 200 } = {}) => prisma.managerChatMessage.findMany({
  where: { chatId }, orderBy: { createdAt: 'asc' }, take,
  select: { id: true, role: true, content: true, toolName: true, toolInputSummary: true, toolOutcome: true, createdAt: true },
});

/** The latest messages the model may see: what was said, not the tool traffic. Only this chat's, and only as many as the chat's context size. */
async function recentConversation(chatId, take) {
  const size = take ?? (await prisma.managerChat.findUnique({ where: { id: chatId }, select: { contextMessages: true } }))?.contextMessages ?? CONTEXT.default;
  const rows = await prisma.managerChatMessage.findMany({ where: { chatId, role: { in: ['user', 'assistant'] } }, orderBy: { createdAt: 'desc' }, take: size, select: { role: true, content: true } });
  return rows.reverse();
}

/** Store a request to run a destructive action. Returns the one-time token; only its hash is kept. */
async function createConfirmation({ chatId, actionName, input, summary, now = Date.now }) {
  const token = crypto.randomBytes(24).toString('hex');
  await prisma.managerChatConfirmation.create({
    data: { chatId, tokenHash: hashToken(token), actionName, input, summary, expiresAt: new Date(now() + CONFIRMATION_TTL_MS) },
  });
  return { token, expiresAt: new Date(now() + CONFIRMATION_TTL_MS) };
}

/** Use a token: once, within the time limit, in the chat it was issued for. Returns the stored request, or null. */
async function consumeConfirmation({ chatId, token, now = Date.now }) {
  const claimed = await prisma.managerChatConfirmation.updateMany({
    where: { chatId, tokenHash: hashToken(token), usedAt: null, expiresAt: { gt: new Date(now()) } }, data: { usedAt: new Date(now()) },
  });
  if (claimed.count !== 1) return null;
  return prisma.managerChatConfirmation.findUnique({ where: { tokenHash: hashToken(token) }, select: { actionName: true, input: true, summary: true } });
}

/** The confirmation still waiting in this chat, for the dashboard to show again after a reload (without its token: that was shown once). */
const pendingConfirmations = (chatId, now = Date.now) => prisma.managerChatConfirmation.findMany({
  where: { chatId, usedAt: null, expiresAt: { gt: new Date(now()) } }, orderBy: { createdAt: 'desc' }, select: { id: true, actionName: true, summary: true, expiresAt: true },
});

module.exports = { CONTEXT, listChats, setContextMessages, updateSettings, nameIfUnnamed, clearChat, deleteChat, createChat, findChat, addMessage, touch, listMessages, recentConversation, createConfirmation, consumeConfirmation, pendingConfirmations, hashToken, CONFIRMATION_TTL_MS };
