# SwiftMove Logistics

Operations dashboard and WhatsApp workflow for managing drivers, jobs, deliveries, incidents and document-code verification.

Live demo: [https://swiftmove.devcax.com](https://swiftmove.devcax.com)

## Try the live demo

1. Open the [live demo](https://swiftmove.devcax.com) and sign in with the email and password your administrator gave you.
2. In **Drivers**, add your WhatsApp phone number as a driver.
3. In **Jobs**, create and publish a job that matches that driver.
4. Open the [WhatsApp chat](https://wa.me/94756941491), ask for `available jobs`, and chat in your preferred language.
5. Apply for the job, accept it when offered, and send `start` to begin the trip.
6. Upload the provided pickup-code proof image, then the delivery-code proof image at the relevant stages.
7. Complete the trip through WhatsApp. The dashboard shows job progress, driver activity, messages, document verification and incidents in real time.
8. Open the assistant (the floating sparkle button on the right edge) to ask about jobs or make changes in plain words; it asks you to confirm anything destructive.

## How it fits together

One backend, one rule: **every change to business data goes through the action runner** (`backend/src/platform/runner.js`).
The dashboard, the WhatsApp bot, the manager assistant and the timers are only callers. The runner checks who is asking,
validates the input, opens a transaction, applies the published policies, runs the action, writes the audit row and the events,
and commits. Plugins react to events (notifications, driver matching, delay questions, auto closure, job summaries).

```
backend/src/
  platform/     machinery with no business words (config, db, runner, registry, policy engine, events, http)
  modules/      one folder per business area: actions, queries, checks, events, routes, repo
  plugins/      optional reactions to events, switched on with PLUGINS
  interfaces/   ways in: http, whatsapp, timers, managerChat
frontend/
  app/          Next.js pages (each one joins a feature's hook and components)
  features/     one folder per area: types, api, hooks, components
  shared/       api client, polling, confirm dialog
```

## Try locally

### Requirements

- Git, Node.js 22+ (the frontend build needs Node 20+), Docker Desktop with Linux containers

### Backend

```powershell
git clone https://github.com/devcax/swiftmove-logisticAI.git
cd logistic_AI
docker compose -f compose.dev.yaml up -d          # local Postgres on port 5433
Copy-Item backend/.env.example backend/.env       # then fill in DATABASE_URL and SESSION_SECRET (min 32 chars)
cd backend
npm ci
npm run db:migrate                                # apply the migrations
npm run user:create -- --email you@example.com --name "You" --role ADMIN
npm run dev
```

### Frontend

```powershell
cd frontend
npm ci
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) and sign in with the user you created. The dashboard calls `/api` on its own
origin and Next proxies it to the backend (`BACKEND_INTERNAL_URL`, default `http://127.0.0.1:4000`).

### Tests

```powershell
cd backend
npm run test:db:reset      # empties and migrates the local test database (DATABASE_URL_TEST)
npm test
```

Tests run against the local Docker database and can never reach WhatsApp, the language models or storage.

### Run the production image

```powershell
docker compose up -d       # compose.yaml: one container, backend on 4000 behind the Next server on 3000
```

The container does **not** run migrations. Run `npm run db:migrate` against the production database before you start a new version
(see the [runbook](docs/runbook.md)).

## Documentation

- [Manager guide](docs/manager-guide.md): rules, conversations, the assistant, and what the bot tells managers.
- [Developer guide](docs/developer-guide.md): how a request flows, how to add an action, a check, a plugin, a screen.
- [Module guide](docs/module-guide.md): the module layout file by file, with the drivers module as the example.
- [Capability inventory](docs/capability-inventory.md): generated from the registry (`npm run docs:inventory`).
- [Security](docs/security.md): sign-in, sessions, rate limits, CORS, logging rules, secrets.
- [Runbook](docs/runbook.md): deploy, migrate, roll back, read logs, rotate a secret, unlock a user.
- [Refactor notes](docs/refactor-notes.md): what changed task by task and why; [policy migration map](docs/policy-migration-map.md).

## Technologies

- **Frontend:** Next.js 16, React 19, TypeScript, Material UI, Tailwind CSS
- **Backend:** Node.js 22, Express 5, PostgreSQL with Prisma, zod, pino
- **Messaging:** WhatsApp Cloud API webhooks
- **Storage:** Cloudflare R2 using the AWS S3 SDK
- **Deployment:** Docker, Docker Compose, Amazon ECR Public
- **LLM and AI:**
  - Groq OpenAI-compatible API with **Qwen3.8-27B** for structured driver-message interpretation, the manager assistant and the rule and conversation authors
  - Meta **Llama Prompt Guard 2 86M** for prompt-injection screening
  - **Whisper Large v3** for voice-message transcription
  - Configurable vision model (the live setup uses **GPT-4o mini**) for document-code extraction and incident-photo classification
