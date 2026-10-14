/**
 * The timers interface: things that happen on a schedule. A timer is `{ name, everyMs, run }`; `run` is called with no arguments and does its
 * work through the action runner as the SYSTEM actor. With several backend processes, a database advisory lock makes sure only one of them
 * runs a given timer at a given tick.
 */
const { runExclusively } = require('../../platform/db');
const { logger } = require('../../platform/logger');

// A tick can take longer than Prisma's default five-second transaction limit; the lock lives as long as the transaction.
const LOCK_TX_TIMEOUT_MS = 10 * 60 * 1000;

function createScheduler({ prisma = undefined, log = logger } = {}) {
  const timers = new Map();
  const handles = new Map();
  const running = new Set();
  let stopped = true;

  function add(timer) {
    if (!timer?.name || typeof timer.run !== 'function' || !(timer.everyMs > 0)) throw new Error('A timer needs a name, run() and everyMs > 0');
    if (timers.has(timer.name)) throw new Error(`Timer "${timer.name}" is already registered`);
    timers.set(timer.name, timer);
    if (!stopped) schedule(timer);
  }

  /** Run one timer once if no other process (or an earlier tick here) is running it. Returns true if it ran. */
  async function tickOnce(name) {
    const timer = timers.get(name);
    if (!timer || running.has(name)) return false;
    running.add(name);
    try {
      return await runExclusively(`timer:${name}`, () => timer.run(), { db: prisma, timeout: LOCK_TX_TIMEOUT_MS });
    } catch (err) {
      log.error({ err, timer: name }, 'timer failed');
      return false;
    } finally {
      running.delete(name);
    }
  }

  function schedule(timer) {
    const handle = setInterval(() => { tickOnce(timer.name); }, timer.everyMs);
    handle.unref();
    handles.set(timer.name, handle);
  }

  function start() {
    if (!stopped) return;
    stopped = false;
    for (const timer of timers.values()) schedule(timer);
  }

  /** Stop scheduling and wait for the runs in progress. */
  async function stop() {
    stopped = true;
    for (const handle of handles.values()) clearInterval(handle);
    handles.clear();
    while (running.size > 0) await new Promise((resolve) => { setTimeout(resolve, 20); });
  }

  return { add, start, stop, tickOnce, names: () => [...timers.keys()] };
}

module.exports = { createScheduler, ...createScheduler() };
