const { logger } = require("./src/platform/logger");
const config = require("./src/platform/config");
const app = require("./src/interfaces/http/app");
const timers = require("./src/interfaces/timers");
const { disconnect } = require("./src/platform/db");
const { registerProcessHandlers } = require("./src/platform/process");
const { createDispatcher } = require("./src/platform/eventDispatcher");
const { registerPlugins } = require("./src/plugins");
const runner = require("./src/platform/runner");
const { prisma } = require("./src/platform/db");
const incoming = require("./src/interfaces/whatsapp/incoming");

// Pending evidence nobody attached within 24 hours is deleted, hourly, for every organization.
async function purgePendingEvidence() {
  const organizations = await prisma.organization.findMany({ select: { id: true } });
  for (const { id } of organizations) {
    await runner.run("evidence.purgePending", {}, { type: "SYSTEM", organizationId: id, source: "TIMER" });
  }
}

const PORT = config.port;
const dispatcher = createDispatcher();
// In production the backend is only reachable through the Next proxy on the same machine.
const HOST = config.isProduction ? "127.0.0.1" : undefined;
const server = app.listen(PORT, HOST, () => {
  logger.info(`Backend listening on http://localhost:${PORT}`);
  logger.info(`Webhook endpoint: ${config.whatsappPublicUrl}/api/webhooks/whatsapp`);
  timers.add({ name: "evidence.purgePending", everyMs: 60 * 60 * 1000, run: purgePendingEvidence });
  registerPlugins();
  dispatcher.start();
  timers.start();
});

registerProcessHandlers({
  server,
  cleanups: [() => timers.stop(), () => dispatcher.stop(), () => incoming.drain(), () => disconnect()],
});
