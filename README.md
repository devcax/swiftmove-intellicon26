# SwiftMove: Setup and Demo Guide

SwiftMove is a logistics control room for managing drivers, jobs, deliveries, and incidents. Drivers communicate through WhatsApp, while managers follow and manage trips from the dashboard.

## 1. Project architecture

```text
Manager dashboard (Next.js + React)
                 |
          /api requests
                 |
Backend (Node.js + Express) <--- Driver messages (WhatsApp Cloud API)
                 |
       Actions and published policies
                 |
        PostgreSQL database (Prisma)
```

- **Frontend:** Dashboard pages for jobs, drivers, chats, incidents, policies, and bot conversations.
- **Backend:** Validates requests, applies business rules, updates jobs, and sends WhatsApp replies. Business changes go through a shared action runner.
- **AI:** Interprets driver messages and helps process voice messages and document images.
- **Storage:** Cloudflare R2 stores uploaded files and proof images.

Main folders:

```text
frontend/app/              Pages and routes
frontend/features/         Feature components, hooks, and API calls
frontend/shared/           Shared UI and utilities
backend/src/modules/       Business features and actions
backend/src/platform/      Database, policies, events, and action runner
backend/src/interfaces/    HTTP, WhatsApp, timers, and manager assistant
backend/src/plugins/       Reactions such as driver matching and notifications
```

## 2. Project setup

Install **Git**, **Node.js 22 or newer**, and **Docker Desktop** with Linux containers enabled.

### Step 1: Download the project

Run these commands in PowerShell:

```powershell
git clone https://github.com/devcax/swiftmove-logisticAI.git logistic_AI
cd logistic_AI
```

### Step 2: Start the local database

```powershell
docker compose -f compose.dev.yaml up -d
```

This starts PostgreSQL on port **5433**.

### Step 3: Configure the backend

```powershell
Copy-Item backend/.env.example backend/.env
```

Edit `backend/.env` and set:

```dotenv
DATABASE_URL=postgresql://fleetlink:fleetlink@localhost:5433/fleetlink_dev?connection_limit=10&pool_timeout=10&connect_timeout=5
SESSION_SECRET=replace-with-a-random-secret-at-least-32-characters-long
NODE_ENV=development
PORT=4000
WHATSAPP_DRY_RUN=true
```

Generate a random session secret and paste the result into `SESSION_SECRET`:

```powershell
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

For the full WhatsApp and AI experience, fill in the WhatsApp, Groq, vision, and R2 settings listed in `.env.example`. Dry-run mode logs outgoing messages instead of sending them.

### Step 4: Install and initialize the backend

```powershell
cd backend
npm ci
npm run db:migrate
npm run db:seed
npm run user:create -- --email you@example.com --name "Local Admin" --role ADMIN
```

Enter and repeat a password of **8 to 128 characters** when prompted. Use this account to sign in locally.

### Step 5: Configure and install the frontend

From the project root, create `frontend/.env` containing:

```dotenv
BACKEND_INTERNAL_URL=http://127.0.0.1:4000
```

Then run:

```powershell
cd frontend
npm ci
```

## 3. Run locally

Keep two terminals open.

**Terminal 1 — from the project root:**

```powershell
cd backend
npm run dev
```

**Terminal 2 — from the project root:**

```powershell
cd frontend
npm run dev
```

1. Open [http://localhost:3000](http://localhost:3000).
2. Sign in using the local account created above.
3. Add a driver under **Drivers**.
4. Create a job under **Jobs** and publish it.

The frontend runs on port **3000** and proxies API requests to the backend on port **4000**.

To receive real WhatsApp messages locally, configure a public HTTPS tunnel to the backend and point the Meta webhook to `/api/webhooks/whatsapp`. Use matching WhatsApp app credentials and set `WHATSAPP_DRY_RUN=false`. The live demo below is the simpler way to try the complete chat flow.

## 4. Try the live application

### Step 1: Sign in

Open [SwiftMove](https://swiftmove.devcax.com).

| Field | Demo credential supplied |
| --- | --- |
| Email | `boss@box.com` |
| Password | `123` |

**Demo login needs updating:** The latest code requires at least 8 characters, so `123` will be rejected after that version is deployed. The administrator must set a new demo password and update this guide. These credentials have not been verified against the live application.

### Step 2: Register your driver first

1. Go to **Drivers** and select **Add driver**.
2. Enter your name, your own WhatsApp number, vehicle type, and license plate.
3. Save the driver before starting the WhatsApp chat.

### Step 3: Start the WhatsApp chat

Open [Start a chat with SwiftMove](https://wa.me/94756941491?text=Hi) and send the prefilled **Hi** message.

The bot number is **+94 75 694 1491**. Chat from the same number you registered as the driver. Follow any verification prompts.

### Step 4: Create a matching job

1. On the dashboard, open **Jobs** and select **Create job**.
2. Enter the cargo, quantity, pickup and delivery addresses, and scheduled dates.
3. Choose a vehicle type matching your registered driver.
4. Set pickup within the published request window, then publish the job.

### Step 5: Apply and approve

1. Send **available jobs** in WhatsApp.
2. Select the job and apply.
3. On the dashboard, open **Requests** and approve the driver's request.
4. Follow the WhatsApp prompts to accept the offer, if requested.

### Step 6: Try a trip

1. Send **start**.
2. Send **reached pickup**, then **cargo loaded** at the appropriate stages.
3. When asked, upload the pickup document showing the job's pickup code.
4. Send **on my way**, then **at delivery**.
5. Report unloading/delivery and provide delivery-code proof when requested.
6. Follow the remaining prompts to complete the job.

Watch the job's progress and proof status on the dashboard. Open **Driver Chats** to see the conversation. You can also report an incident through WhatsApp and view it under **Incidents**.

Use a test job and your own registered number when trying the demo; real WhatsApp messages may be sent.