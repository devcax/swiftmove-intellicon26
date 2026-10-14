-- Conversation flow engine: driver-facing conversational flows (cancellation
-- reason menus, delay reasons, safety checks, confirmations, ...) become
-- versioned per-organization data instead of hardcoded bot.js logic, so
-- managers can edit them from the dashboard.
--
-- This migration creates the table only. The built-in flows are seeded by
-- `npm run db:seed-flows` (backend/scripts/seed-flows.js) from
-- backend/src/services/flowSeeds.js so the seed definitions stay importable
-- by the parity tests. If the table is missing or unreadable the engine
-- fails safe and bot.js runs its legacy hardcoded flows.

CREATE TABLE flow_definitions (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id  UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  key              TEXT NOT NULL,
  name             TEXT NOT NULL,
  description      TEXT,
  version          INTEGER NOT NULL DEFAULT 1,
  status           TEXT NOT NULL DEFAULT 'DRAFT'
                   CHECK (status IN ('DRAFT', 'PUBLISHED', 'ARCHIVED')),
  trigger_type     TEXT NOT NULL
                   CHECK (trigger_type IN ('INTENT', 'BUTTON', 'EVENT')),
  trigger_config   JSONB NOT NULL DEFAULT '{}',
  definition       JSONB NOT NULL,
  is_system        BOOLEAN NOT NULL DEFAULT FALSE,
  enabled          BOOLEAN NOT NULL DEFAULT TRUE,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (organization_id, key, version)
);

-- At most one PUBLISHED version per (organization, flow key).
CREATE UNIQUE INDEX flow_definitions_one_published
  ON flow_definitions (organization_id, key)
  WHERE status = 'PUBLISHED';

CREATE INDEX flow_definitions_lookup
  ON flow_definitions (organization_id, key, status);
