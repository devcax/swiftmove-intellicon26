/**
 * Events: who listens to what, and the outbox the runner writes into. A handler's events are saved in
 * the same transaction as the action, together with one delivery row per subscriber, so an event exists
 * if and only if the action committed. Delivery to subscribers (the dispatcher) is in eventDispatcher.js.
 *
 * Delivery is at-least-once: every handler must be safe to run twice.
 */
const { EventEmitter } = require('events');
const { randomUUID } = require('node:crypto');
const registry = require('./registry');

// eventType -> Map(subscriberName -> handler)
const subscribers = new Map();
const signal = new EventEmitter();

/** Listen to an event. A subscriber name is unique per event type, because it keys the delivery row. */
function subscribe(eventType, subscriberName, handler) {
  if (typeof handler !== 'function') throw new Error(`Subscriber "${subscriberName}" needs a handler function`);
  const forType = subscribers.get(eventType) ?? new Map();
  if (forType.has(subscriberName)) throw new Error(`Subscriber "${subscriberName}" already listens to "${eventType}"`);
  forType.set(subscriberName, handler);
  subscribers.set(eventType, forType);
}

/** Every subscriber name registered in this process, for any event type. */
const registeredSubscriberNames = () => [...new Set([...subscribers.values()].flatMap((forType) => [...forType.keys()]))];

const subscriberNames = (eventType) => [...(subscribers.get(eventType)?.keys() ?? [])];
const subscriberHandler = (eventType, subscriberName) => subscribers.get(eventType)?.get(subscriberName);

/** Forget every subscriber. For tests. */
const clearSubscribers = () => subscribers.clear();

/** Check an emitted event against its registered definition. An unregistered event is a programming error. */
function validateEvent(event) {
  const definition = registry.getEvent(event?.type);
  if (!definition) throw new Error(`Event "${event?.type}" is not registered`);
  return { type: definition.name, payload: definition.payload.parse(event.payload ?? {}) };
}

/** Save events and one delivery per subscriber, in the caller's transaction. Returns the saved event ids. */
async function writeEvents(tx, { organizationId, actionLogId, events }) {
  // Validate everything first; preassigned ids let us write the outbox in two round trips instead of two per event.
  const rows = events.map(raw => ({ id: randomUUID(), organizationId, actionLogId, ...validateEvent(raw) }));
  if (!rows.length) return [];
  const deliveries = rows.flatMap(row => subscriberNames(row.type).map(subscriber => ({ eventId: row.id, subscriber })));
  await tx.event.createMany({ data: rows });
  if (deliveries.length) await tx.eventDelivery.createMany({ data: deliveries });
  return rows.map(row => row.id);
}

/** Tell the dispatcher that committed events are waiting. Called by the runner after commit. */
const notifyNewEvents = () => signal.emit('new-events');
const onNewEvents = (listener) => {
  signal.on('new-events', listener);
  return () => signal.off('new-events', listener);
};

module.exports = {
  subscribe, subscriberNames, registeredSubscriberNames, subscriberHandler, clearSubscribers, writeEvents, notifyNewEvents, onNewEvents,
};
