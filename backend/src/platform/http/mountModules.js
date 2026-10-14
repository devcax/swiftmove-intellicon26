/**
 * Mounts module routes. A module declares `{ method, path, action | query, params }`; this file turns
 * that into Express handlers that build the input and call the runner. No business logic lives here.
 *
 *   action route: input = JSON body, plus the listed path params (which win).
 *   query route:  input = query string, plus the listed path params.
 *
 * Declared routes answer with the handler's result as-is, so a moved module can keep the response shapes
 * the dashboard already uses. The generic endpoints (POST /api/actions/:name, GET /api/queries/:name)
 * are new and answer with { result, warnings } for actions.
 *
 * Path params are not trusted: they go through the action's own zod schema, so an id must be an id.
 */
const express = require('express');
const registry = require('../registry');
const defaultRunner = require('../runner');
const { writeLimiter: defaultWriteLimiter, aiLimiter: defaultAiLimiter } = require('./rateLimit');

const METHODS = new Set(['GET', 'POST', 'PUT', 'PATCH', 'DELETE']);

const isPlainObject = (value) => value !== null && typeof value === 'object' && !Array.isArray(value);

function pick(source, names = []) {
  const picked = {};
  for (const name of names) if (source[name] !== undefined) picked[name] = source[name];
  return picked;
}

/** Fail at startup, not on the first request. */
function assertValidRoute(moduleName, route) {
  const where = `${moduleName}: ${route.method} ${route.path}`;
  if (!METHODS.has(route.method)) throw new Error(`${where} has an unsupported method`);
  if (typeof route.path !== 'string' || !route.path.startsWith('/')) throw new Error(`${where} needs a path starting with "/"`);
  if (Boolean(route.action) === Boolean(route.query)) throw new Error(`${where} needs exactly one of "action" or "query"`);
  if (route.action && !registry.getAction(route.action)) throw new Error(`${where} names unknown action "${route.action}"`);
  if (route.query && !registry.getQuery(route.query)) throw new Error(`${where} names unknown query "${route.query}"`);
  if (route.query && !['GET', 'POST'].includes(route.method)) throw new Error(`${where}: a query can only be served by GET or POST`);
  if (route.limit && !['write', 'ai'].includes(route.limit)) throw new Error(`${where} has an unknown limit "${route.limit}"`);
  if (route.action && route.method === 'GET') throw new Error(`${where}: an action cannot be served by GET`);
}

/** 201 for a create, 200 for everything else, unless the route says otherwise. */
function successStatus(route) {
  if (route.status) return route.status;
  return route.method === 'POST' && route.action?.endsWith('.create') ? 201 : 200;
}

function actionInput(req, paramNames) {
  const params = pick(req.params, paramNames);
  if (req.body === undefined || req.body === null) return params;
  // A body that is not an object (an array, a string) goes to the schema as-is and is rejected there.
  return isPlainObject(req.body) ? { ...req.body, ...params } : req.body;
}

function createRouter({ runner, writeLimiter, aiLimiter }) {
  const router = express.Router();

  function mountRoute(route) {
    const path = route.path;
    if (route.action) {
      // Actions that cost money (an LLM call) say so with limit: 'ai'.
      router[route.method.toLowerCase()](path, route.limit === 'ai' ? aiLimiter : writeLimiter, async (req, res) => {
        const { result } = await runner.run(route.action, actionInput(req, route.params), req.actor, { requestId: req.id });
        res.status(successStatus(route)).json(result ?? { ok: true });
      });
      return;
    }
    // A query read with POST (a simulator that needs a body) takes its input from the body, like an action.
    router[route.method.toLowerCase()](path, async (req, res) => {
      const input = route.method === 'POST' ? actionInput(req, route.params) : { ...req.query, ...pick(req.params, route.params) };
      res.status(successStatus(route)).json(await runner.runQuery(route.query, input, req.actor));
    });
  }

  router.post('/actions/:name', writeLimiter, async (req, res) => {
    const { result, warnings } = await runner.run(req.params.name, req.body ?? {}, req.actor, { requestId: req.id });
    res.json({ result: result ?? null, warnings });
  });

  router.get('/queries/:name', async (req, res) => {
    res.json(await runner.runQuery(req.params.name, req.query, req.actor));
  });

  router.get('/meta/actions', (req, res) => {
    const roles = req.actor?.roles ?? [];
    const visible = registry.listActions().filter((action) => !action.target
      && action.actors.includes(req.actor?.type)
      && (action.roles.length === 0 || action.roles.some((role) => roles.includes(role))));
    res.json(visible.map((action) => ({
      name: action.name, title: action.title, description: action.description, inputSchema: registry.toJsonSchema(action.name),
      matchFields: [...action.matchFields], destructive: action.destructive,
    })));
  });

  return { router, mountRoute };
}

/**
 * Validate and mount every declared route under `/api`, plus the generic endpoints.
 * Call after the modules were registered with registry.registerModule.
 */
function mountModules(app, modules, { runner = defaultRunner, writeLimiter = defaultWriteLimiter, aiLimiter = defaultAiLimiter } = {}) {
  const { router, mountRoute } = createRouter({ runner, writeLimiter, aiLimiter });
  for (const mod of modules) {
    for (const route of mod.routes ?? []) {
      assertValidRoute(mod.name, route);
      mountRoute(route);
    }
  }
  app.use('/api', router);
}

module.exports = { mountModules, assertValidRoute };
