/**
 * The action runner: the one door for every change to business data. The dashboard, the manager chat,
 * the WhatsApp bot and timers are only callers. Policies are enforced here, so no caller can skip them.
 *
 *   find action > check actor and role > validate input > open transaction > load and lock rows >
 *   evaluate policies > run handler > write action_log and events > commit > tell the dispatcher
 *
 * A handler gets `tx` (the Prisma transaction client), must not use the global client, must not call
 * `run` for another action (chain with events instead), and must not send messages or call an LLM:
 * it can run more than once and holds row locks.
 */
const registry = require('./registry');
const events = require('./events');
const { prisma, withTransaction } = require('./db');
const { writeActionLog } = require('./runnerLog');
const { buildPolicyContext } = require('./policy/context');
const { evaluatePolicies } = require('./policy/engine');
const { getGatewayPolicies } = require('./policy/store');
const { recommendedNextStep } = require('./policy/violation');
const { logger } = require('./logger');
const {
  AppError, AuthorizationError, NotFoundError, PolicyBlockedError, ValidationError,
} = require('./errors');

// Policies were written against these source names; actors carry the interface they came through.
const POLICY_SOURCE = { GUI: 'API', MANAGER_CHAT: 'API', WHATSAPP: 'CHAT', TIMER: 'TIMER', CHAT: 'MANAGER', DOCUMENT: 'DOCUMENT' };

/** Thrown inside the transaction to roll it back when a policy blocks the action. */
class BlockedSignal extends Error {
  constructor(evaluation, subject) {
    super('blocked by policy');
    this.evaluation = evaluation;
    this.subject = subject;
  }
}

/** Thrown inside the transaction by dryRun so nothing is kept. */
class DryRunSignal extends Error {
  constructor(evaluation) {
    super('dry run');
    this.evaluation = evaluation;
  }
}

const NOT_BLOCKED = { allowed: true, failures: [], warnings: [], evaluated: [], nextStep: null };

/**
 * Work that must only happen once the change is safely saved, such as clearing an in-memory cache or sending a message. A handler
 * returns it as `afterCommit: [fn]`. A failure is logged and never undoes or hides the committed change, except that an error marked
 * `reportToCaller` (a message that was stored but could not be delivered) is raised to the caller once everything has run: the change
 * stays saved, and the caller is told the rest did not happen.
 */
async function runAfterCommit(callbacks, actionName) {
  let report = null;
  for (const callback of callbacks) {
    try {
      await callback();
    } catch (err) {
      logger.error({ err, action: actionName }, 'after-commit step failed');
      if (err?.reportToCaller && !report) report = err;
    }
  }
  if (report) throw report;
}

function createRunner({ getPolicies = getGatewayPolicies, db = prisma, transaction = withTransaction } = {}) {
  const resolveAction = (name) => {
    const action = registry.getAction(name);
    if (!action || action.target) throw new NotFoundError('That action does not exist.');
    return action;
  };

  const roleAllowed = (definition, actor) => definition.roles.length === 0
    || definition.roles.some((role) => (actor.roles ?? []).includes(role));

  function denyReason(action, actor) {
    if (!action.actors.includes(actor.type)) return 'This action is not available to you.';
    if (actor.type === 'MANAGER' && !roleAllowed(action, actor)) return 'You do not have permission to do that.';
    return null;
  }

  function parseInput(definition, rawInput) {
    const parsed = definition.input.safeParse(rawInput ?? {});
    if (parsed.success) return parsed.data;
    const details = parsed.error.issues.map((issue) => ({ path: issue.path.join('.'), message: issue.message }));
    // The first problem is the message, so a form that shows `error` shows something useful.
    throw new ValidationError(details[0]?.message ?? 'The request is not valid.', { details });
  }

  // An action may name who is acting and where from for the policies when that is not the caller (a document check run by the system).
  async function evaluateInTransaction({ tx, action, actor, subject }) {
    const actorType = subject.policyActor ?? actor.type;
    const policies = await getPolicies(actor.organizationId, action.name);
    if (policies.length === 0) return NOT_BLOCKED;
    const context = await buildPolicyContext({
      tx, organizationId: actor.organizationId, action: action.name, actor: actorType,
      source: subject.policySource ?? POLICY_SOURCE[actor.source] ?? 'API',
      jobId: subject.jobId, job: subject.job, driverId: subject.driverId, driver: subject.driver, params: subject.params ?? {},
    });
    const result = await evaluatePolicies(policies, context);
    return { ...result, nextStep: recommendedNextStep(result.failures[0]) };
  }

  async function executeInTransaction({ tx, action, actor, input, requestId, started, prepared }) {
    const subject = (await action.load?.({ input, actor, tx, prepared })) ?? {};
    // An action that finds nothing to do (a repeated start, a closure already requested) says so, and no policy is asked.
    const evaluation = subject.skipPolicies ? NOT_BLOCKED : await evaluateInTransaction({ tx, action, actor, subject });
    if (!evaluation.allowed) throw new BlockedSignal(evaluation, subject);

    // `warnings` are the policies that only warn (a duplicate to merge, say): the handler decides what to do about them.
    // A handler that carries on into another action's rules (a verified document advances the milestone) asks for them here.
    // A block rolls back the whole transaction, the same as a block at the start.
    const enforce = async (actionName, { actorType, source, ...nested }) => {
      const result = await evaluateInTransaction({
        tx, action: resolveAction(actionName), actor, subject: { ...nested, policyActor: actorType, policySource: source },
      });
      if (!result.allowed) throw new BlockedSignal(result, subject);
      return result;
    };
    const output = await action.handler({ input, actor, subject, tx, prepared, warnings: evaluation.warnings, enforce });
    const emitted = output?.events ?? [];
    const subjectRef = output?.subject ?? subject.subject;
    const log = await writeActionLog(tx, {
      actor, action: action.name, outcome: 'ALLOWED', requestId, subject: subjectRef, input, durationMs: Date.now() - started,
    });
    await events.writeEvents(tx, { organizationId: actor.organizationId, actionLogId: log.id, events: emitted });
    return {
      result: output?.result ?? null, warnings: evaluation.warnings, actionLogId: log.id, emitted: emitted.length,
      afterCommit: output?.afterCommit ?? [],
    };
  }

  const blockedError = (failure, failures) => {
    const error = new PolicyBlockedError(failure.onBlock?.message ?? failure.message, {
      details: {
        policyKey: failure.policyKey ?? null, message: failure.message, requirement: failure.requirement ?? null,
        evidence: failure.evidence ?? null, flowKey: failure.onBlock?.flowKey ?? null,
      },
    });
    // The full findings stay on the error for the WhatsApp side, which turns a block into a flow or a question for the driver.
    error.failure = failure;
    error.failures = failures;
    return error;
  };

  async function logAndRethrow(err, { action, actor, input, requestId, started }) {
    const base = { actor, action: action.name, requestId, input, durationMs: Date.now() - started };
    if (err instanceof BlockedSignal) {
      const failure = err.evaluation.failures[0];
      await writeActionLog(db, { ...base, outcome: 'BLOCKED', subject: err.subject?.subject, policyKey: failure.policyKey, errorCode: failure.code });
      throw blockedError(failure, err.evaluation.failures);
    }
    await writeActionLog(db, { ...base, outcome: 'FAILED', errorCode: err instanceof AppError ? err.code : 'INTERNAL' });
    throw err;
  }

  /** The one door. Returns { result, warnings, actionLogId }. */
  async function run(name, rawInput, actor, { requestId } = {}) {
    const started = Date.now();
    const action = resolveAction(name);
    const denied = denyReason(action, actor);
    if (denied) {
      await writeActionLog(db, { actor, action: name, outcome: 'DENIED', requestId, input: rawInput, errorCode: 'FORBIDDEN', durationMs: 0 });
      throw new AuthorizationError(denied);
    }
    const input = parseInput(action, rawInput);
    const context = { action, actor, input, requestId, started };
    let done;
    try {
      // prepare may call an LLM or the network, so it runs before the transaction opens and holds no lock.
      const prepared = await action.prepare?.({ input, actor });
      done = await transaction((tx) => executeInTransaction({ tx, ...context, prepared }));
    } catch (err) {
      return logAndRethrow(err, context);
    }
    if (done.emitted > 0) events.notifyNewEvents();
    await runAfterCommit(done.afterCommit, name);
    logger.info({ action: name, actorType: actor.type, ms: Date.now() - started }, 'action ok');
    return { result: done.result, warnings: done.warnings, actionLogId: done.actionLogId };
  }

  /** Steps 1 to 4 without keeping anything: what the policies would say about this input right now. */
  async function dryRun(name, rawInput, actor) {
    const action = resolveAction(name);
    const denied = denyReason(action, actor);
    if (denied) throw new AuthorizationError(denied);
    const input = parseInput(action, rawInput);
    try {
      await transaction(async (tx) => {
        // A dry run changes nothing and calls nothing outside the database, so it does not run prepare.
        const subject = (await action.load?.({ input, actor, tx })) ?? {};
        throw new DryRunSignal(await evaluateInTransaction({ tx, action, actor, subject }));
      });
    } catch (err) {
      if (err instanceof DryRunSignal) return err.evaluation;
      throw err;
    }
    return NOT_BLOCKED;
  }

  /** Read-only: role check, input check, then the handler with the global client. No policies, no log. */
  async function runQuery(name, rawInput, actor) {
    const query = registry.getQuery(name);
    if (!query) throw new NotFoundError('That query does not exist.');
    // Managers and the system can read any query; a driver only the ones that say they are open to drivers.
    if ((actor.type === 'DRIVER' && !query.actors.includes('DRIVER')) || (actor.type === 'MANAGER' && !roleAllowed(query, actor))) {
      throw new AuthorizationError('You do not have permission to do that.');
    }
    return query.handler({ input: parseInput(query, rawInput), actor, db });
  }

  return { run, dryRun, runQuery };
}

module.exports = { createRunner, ...createRunner() };
