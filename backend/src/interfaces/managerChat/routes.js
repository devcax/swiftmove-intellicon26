const express = require('express');
const { z } = require('zod');
const { NotFoundError, ValidationError } = require('../../platform/errors');
const { aiLimiter, writeLimiter } = require('../../platform/http/rateLimit');
const repo = require('./repo');
const { createEngine } = require('./engine');
const { settingsBody } = require('./schemas');

const idSchema = z.guid();
const messageBody = z.object({ text: z.string().trim().min(1).max(4000) });
const confirmBody = z.object({ token: z.string().min(16).max(200), decision: z.enum(['confirm', 'cancel']).default('confirm') });

/** The endpoints behind the dashboard's chat panel. Chats never share anything: each one has its own messages and its own context size. Mounted after sign-in; the chat belongs to the signed-in manager. */
function createManagerChatRouter({ engine = createEngine() } = {}) {
  const router = express.Router();
  const managerOf = (req) => ({ userId: req.actor.userId, organizationId: req.actor.organizationId, roles: req.actor.roles, name: req.actor.name });
  const own = async (req) => {
    const id = idSchema.safeParse(req.params.id);
    if (!id.success) throw new NotFoundError('Chat not found');
    const chat = await repo.findChat({ id: id.data, organizationId: req.actor.organizationId, userId: req.actor.userId });
    if (!chat) throw new NotFoundError('Chat not found');
    return chat;
  };
  const parse = (schema, body) => {
    const parsed = schema.safeParse(body ?? {});
    if (!parsed.success) throw new ValidationError('The request is not valid.', { details: parsed.error.issues.map((i) => ({ path: i.path.join('.'), message: i.message })) });
    return parsed.data;
  };

  router.post('/', writeLimiter, async (req, res) => {
    const chat = await repo.createChat({ organizationId: req.actor.organizationId, userId: req.actor.userId });
    res.status(201).json({ id: chat.id });
  });

  router.get('/', async (req, res) => {
    const chats = await repo.listChats({ organizationId: req.actor.organizationId, userId: req.actor.userId });
    res.json({ chats, context: repo.CONTEXT });
  });

  router.get('/:id', async (req, res) => {
    const chat = await own(req);
    res.json({ id: chat.id, title: chat.title, contextMessages: chat.contextMessages, messages: await repo.listMessages(chat.id), pendingConfirmations: await repo.pendingConfirmations(chat.id) });
  });

  router.patch('/:id', writeLimiter, async (req, res) => {
    const chat = await own(req);
    const settings = parse(settingsBody, req.body);
    res.json(await repo.updateSettings(chat.id, settings));
  });

  router.post('/:id/clear', writeLimiter, async (req, res) => {
    const chat = await own(req);
    await repo.clearChat(chat.id);
    res.json({ ok: true });
  });

  router.delete('/:id', writeLimiter, async (req, res) => {
    const chat = await own(req);
    await repo.deleteChat(chat.id);
    res.json({ ok: true });
  });

  router.post('/:id/messages', aiLimiter, async (req, res) => {
    const chat = await own(req);
    const { text } = parse(messageBody, req.body);
    res.json(await engine.handleMessage({ chatId: chat.id, manager: managerOf(req), text }));
  });

  router.post('/:id/confirm', writeLimiter, async (req, res) => {
    const chat = await own(req);
    const { token, decision } = parse(confirmBody, req.body);
    res.json(await engine.confirm({ chatId: chat.id, manager: managerOf(req), token, decision }));
  });

  return router;
}

module.exports = { createManagerChatRouter };
