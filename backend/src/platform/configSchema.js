/**
 * The environment schema. Pure: takes an env object, returns a frozen config or throws a
 * ConfigError that names the bad variables (never their values).
 *
 * Secrets have no default. Settings that the code used to default inline keep the same default.
 */
const { z } = require('zod');

// Unset or empty both mean "use the default", like the `||` the code used before.
const text = (fallback) => z.string().optional().transform((v) => v || fallback);
const number = (fallback) => z.coerce.number().default(fallback);

const schema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().min(1).max(65535).default(4000),
  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent']).default('info'),
  CORS_ORIGINS: z.string().optional()
    .transform((v) => (v || '').split(',').map((o) => o.trim()).filter(Boolean)),
  SESSION_SECRET: z.string().min(32),

  DATABASE_URL: z.string().min(1),
  DB_TRANSACTION_TIMEOUT_MS: z.coerce.number().int().min(1000).max(120000).default(30000),
  DB_TRANSACTION_MAX_WAIT_MS: z.coerce.number().int().min(1000).max(30000).default(10000),

  AXIOM_API_KEY: text(undefined),
  AXIOM_DATASET: text(undefined),

  WHATSAPP_DRY_RUN: z.string().optional().transform((v) => v === 'true'),
  WHATSAPP_TEXT_DEBOUNCE_MS: z.coerce.number().int().min(0).max(10000).default(4000),
  WHATSAPP_TEXT_MAX_WAIT_MS: z.coerce.number().int().min(1000).max(30000).default(12000),
  WHATSAPP_VERIFY_TOKEN: text(undefined),
  WHATSAPP_ACCESS_TOKEN: text(undefined),
  WHATSAPP_APP_SECRET: text(undefined),
  WHATSAPP_BUSINESS_ACCOUNT_ID: text(undefined),
  WHATSAPP_PHONE_NUMBER_ID: text(undefined),
  WHATSAPP_PUBLIC_URL: text(undefined),
  // Where the dashboard is reached from outside (https://fleet.example.com). Activation links sent to drivers are built on it.
  APP_PUBLIC_URL: text(undefined),
  GRAPH_API_VERSION: text('v21.0'),

  GROQ_API: text(undefined),
  GROQ_BASE_URL: text('https://api.groq.com/openai/v1'),
  AI_MODEL: text('qwen/qwen3.8-27b'),
  AI_GUARD_MODEL: text('meta-llama/llama-prompt-guard-2-86m'),
  AI_WHISPER_MODEL: text('whisper-large-v3'),
  AI_VISION_MODEL: text(''),
  AI_VISION_BASE_URL: text(undefined),
  AI_VISION_API_KEY: text(''),
  AI_AUTO_APPLY_MIN: number(0.85),
  AI_CLARIFY_MIN: number(0.6),
  AI_GUARD_THRESHOLD: number(0.97),

  S3_API: text(undefined),
  R2_PUBLIC_URL: text(undefined),
  R2_ACCESS_KEY_ID: text(undefined),
  R2_SECRET_ACCESS_KEY: text(undefined),

  APP_TIMEZONE: text('Asia/Colombo'),
  AUTO_CLOSURE_SWEEP_MS: number(30_000),
  AUTO_CLOSURE_DELAY_MINUTES: number(2),
  FLOW_CACHE_MS: number(60_000),
  GUARD_CONFIG_CACHE_MS: number(60_000),
  // Every language-model call is cut off after this long, and may ask for at most this many tokens whatever the caller wished for.
  LLM_TIMEOUT_MS: number(30_000),
  LLM_MAX_TOKENS: number(4_000),
  JOB_REQUEST_WINDOW_HOURS: number(24),

  PLUGINS: z.string().optional().transform((v) => (v === undefined ? ['notifications', 'driverMatching', 'delayReasons', 'autoClosure', 'jobSummaries'] : v.split(',').map((p) => p.trim()).filter(Boolean))),

  RATE_LIMIT_API_PER_MIN: number(300),
  RATE_LIMIT_LOGIN_MAX: number(5),
  RATE_LIMIT_LOGIN_WINDOW_MIN: number(15),
  RATE_LIMIT_AI_PER_MIN: number(10),
  RATE_LIMIT_WRITE_PER_MIN: number(60),
  RATE_LIMIT_WEBHOOK_PER_MIN: number(600),
}).superRefine((env, ctx) => {
  if (env.NODE_ENV !== 'production') return;
  for (const name of ['AXIOM_API_KEY', 'AXIOM_DATASET']) {
    if (!env[name]) ctx.addIssue({ code: 'custom', path: [name], message: 'required in production' });
  }
  // Prisma TLS parameters: encrypted, and the certificate must verify.
  const url = env.DATABASE_URL;
  if (!url.includes('sslmode=require') || !url.includes('sslaccept=strict')) {
    ctx.addIssue({ code: 'custom', path: ['DATABASE_URL'], message: 'needs sslmode=require and sslaccept=strict in production' });
  }
});

function toConfig(env) {
  return {
    nodeEnv: env.NODE_ENV,
    isProduction: env.NODE_ENV === 'production',
    port: env.PORT,
    logLevel: env.LOG_LEVEL,
    corsOrigins: env.CORS_ORIGINS,
    sessionSecret: env.SESSION_SECRET,
    databaseUrl: env.DATABASE_URL,
    dbTransactionTimeoutMs: env.DB_TRANSACTION_TIMEOUT_MS,
    dbTransactionMaxWaitMs: env.DB_TRANSACTION_MAX_WAIT_MS,
    axiomApiKey: env.AXIOM_API_KEY,
    axiomDataset: env.AXIOM_DATASET,
    whatsappDryRun: env.WHATSAPP_DRY_RUN,
    whatsappTextDebounceMs: env.WHATSAPP_TEXT_DEBOUNCE_MS,
    whatsappTextMaxWaitMs: env.WHATSAPP_TEXT_MAX_WAIT_MS,
    whatsappVerifyToken: env.WHATSAPP_VERIFY_TOKEN,
    whatsappAccessToken: env.WHATSAPP_ACCESS_TOKEN,
    whatsappAppSecret: env.WHATSAPP_APP_SECRET,
    whatsappBusinessAccountId: env.WHATSAPP_BUSINESS_ACCOUNT_ID,
    whatsappPhoneNumberId: env.WHATSAPP_PHONE_NUMBER_ID,
    whatsappPublicUrl: env.WHATSAPP_PUBLIC_URL,
    appPublicUrl: env.APP_PUBLIC_URL,
    graphApiVersion: env.GRAPH_API_VERSION,
    groqApiKey: env.GROQ_API,
    groqBaseUrl: env.GROQ_BASE_URL,
    aiModel: env.AI_MODEL,
    aiGuardModel: env.AI_GUARD_MODEL,
    aiWhisperModel: env.AI_WHISPER_MODEL,
    aiVisionModel: env.AI_VISION_MODEL,
    aiVisionBaseUrl: env.AI_VISION_BASE_URL || env.GROQ_BASE_URL,
    aiVisionApiKey: env.AI_VISION_API_KEY,
    aiAutoApplyMin: env.AI_AUTO_APPLY_MIN,
    aiClarifyMin: env.AI_CLARIFY_MIN,
    aiGuardThreshold: env.AI_GUARD_THRESHOLD,
    s3Api: env.S3_API,
    r2PublicUrl: env.R2_PUBLIC_URL,
    r2AccessKeyId: env.R2_ACCESS_KEY_ID,
    r2SecretAccessKey: env.R2_SECRET_ACCESS_KEY,
    appTimezone: env.APP_TIMEZONE,
    autoClosureSweepMs: env.AUTO_CLOSURE_SWEEP_MS,
    autoClosureDelayMinutes: env.AUTO_CLOSURE_DELAY_MINUTES,
    flowCacheMs: env.FLOW_CACHE_MS,
    guardConfigCacheMs: env.GUARD_CONFIG_CACHE_MS,
    llmTimeoutMs: env.LLM_TIMEOUT_MS,
    llmMaxTokens: env.LLM_MAX_TOKENS,
    jobRequestWindowHours: env.JOB_REQUEST_WINDOW_HOURS,
    plugins: env.PLUGINS,
    rateLimitApiPerMin: env.RATE_LIMIT_API_PER_MIN,
    rateLimitLoginMax: env.RATE_LIMIT_LOGIN_MAX,
    rateLimitLoginWindowMin: env.RATE_LIMIT_LOGIN_WINDOW_MIN,
    rateLimitAiPerMin: env.RATE_LIMIT_AI_PER_MIN,
    rateLimitWritePerMin: env.RATE_LIMIT_WRITE_PER_MIN,
    rateLimitWebhookPerMin: env.RATE_LIMIT_WEBHOOK_PER_MIN,
  };
}

class ConfigError extends Error {
  constructor(names) {
    super(`Invalid environment configuration. Fix these variables: ${names.join(', ')}`);
    this.name = 'ConfigError';
    this.names = names;
  }
}

/** Parse an env object into a frozen config. Throws ConfigError naming bad variables only. */
function parseConfig(env) {
  const result = schema.safeParse(env);
  if (!result.success) {
    const names = [...new Set(result.error.issues.map((issue) => String(issue.path[0])))];
    throw new ConfigError(names);
  }
  return Object.freeze(toConfig(result.data));
}

module.exports = { parseConfig, ConfigError };
