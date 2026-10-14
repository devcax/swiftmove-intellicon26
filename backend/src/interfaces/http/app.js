const express = require("express");
const config = require("../../platform/config");
const { isHealthy } = require("../../platform/db");
const { requestId } = require("../../platform/http/requestId");
const { requestLogger } = require("../../platform/http/requestLogger");
const { applySecurity, requireJson, originCheck } = require("../../platform/http/security");
const { apiLimiter, webhookLimiter, loginLimiter, activationLimiter } = require("../../platform/http/rateLimit");
const { createAuthenticate, requireRole } = require("../../platform/http/authenticate");
const { createAuthRouter, repo: authRepo } = require("../../modules/auth");
const { mountModules } = require("../../platform/http/mountModules");
const { registerAllModules } = require("../../modules/register");
const { createClientErrorsRouter } = require("../../modules/clientErrors");
const { createUploadRouter } = require("../../modules/evidence");
const { logger } = require("../../platform/logger");
const { notFound } = require("../../platform/http/notFound");
const { errorHandler } = require("../../platform/http/errorHandler");
const { webhookRouter } = require("../whatsapp");
const { createManagerChatRouter } = require("../managerChat");
const { createDriverActivationRouter } = require("../driverActivation");

const app = express();

app.use(requestId);
app.use(requestLogger);
applySecurity(app, { corsOrigins: config.corsOrigins });
app.use(requireJson);
app.use(originCheck({ corsOrigins: config.corsOrigins }));
app.use(
  express.json({
    limit: "1mb",
    verify: (req, _res, buf) => {
      req.rawBody = buf;
    },
  }),
);

app.get("/health", async (_req, res) => {
  if (await isHealthy()) return res.json({ status: "ok", database: "connected" });
  return res.status(500).json({ status: "error" });
});

app.use("/api/webhooks/whatsapp", webhookLimiter, webhookRouter);
app.use("/api", apiLimiter);
// Open to anyone holding the link (a new driver, not a signed-in manager): the token is the secret, and the page only verifies on a button press.
app.use("/api/public/driver-activation", activationLimiter, createDriverActivationRouter());
const authenticate = createAuthenticate({
  findSession: authRepo.findLiveSession,
  touchSession: authRepo.touchSession,
});
app.use("/api/auth", createAuthRouter({ authenticate, loginLimiters: loginLimiter }));
// Everything below needs a signed-in ADMIN or MANAGER. Only login, the WhatsApp webhook and /health are open.
app.use("/api", authenticate, requireRole("ADMIN", "MANAGER"));

// Modules declare their actions, queries, checks, events and routes; the platform registers and mounts them.
const modules = registerAllModules();
mountModules(app, modules);
app.use("/api/evidence", createUploadRouter());
app.use("/api/manager-chat", createManagerChatRouter());
app.use("/api/client-errors", createClientErrorsRouter());

app.use("/api", notFound);
app.use(errorHandler);

module.exports = app;
