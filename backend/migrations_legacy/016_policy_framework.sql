-- Policy framework: versioned, database-backed operational policies.
--
-- policy_definitions replaces guard_rules as the single rule store consulted at
-- runtime. A policy binds one business action (from the compiled action
-- registry) to a constrained JSON rule built only from capabilities the backend
-- actually implements. Policies are versioned; exactly one version per
-- (organization, key) can be PUBLISHED at a time, and publishing is explicit.
--
-- The built-in policies that reproduce the pre-migration behavior are seeded
-- by scripts/seed-policies.js (invoked from scripts/migrate.js), which reads
-- any customized guard_rules values first, so existing installations keep their
-- tuned settings. guard_rules is kept in the database, deprecated and unread,
-- so an installation can diff or roll back.
--
-- policy_store_meta carries a per-organization version counter that is bumped
-- on every publish/rollback/toggle; the runtime cache keys on it so other
-- application instances observe policy changes within one cheap query.

CREATE TABLE policy_definitions (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id    UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  key                TEXT NOT NULL,
  name               TEXT NOT NULL,
  description        TEXT,
  action             TEXT NOT NULL,
  -- GATEWAY policies are evaluated before the action changes state; SETTING
  -- policies only carry tuned parameters (thresholds, windows, stage lists)
  -- that compiled services read through the policy store.
  enforcement        TEXT NOT NULL DEFAULT 'GATEWAY'
                     CHECK (enforcement IN ('GATEWAY', 'SETTING')),
  match              JSONB NOT NULL DEFAULT '{}'::jsonb,
  rule               JSONB NOT NULL,
  on_block           JSONB NOT NULL DEFAULT '{"mode":"BLOCK"}'::jsonb,
  -- Evaluation order within one action; seeds use 10/20/30/... to reproduce
  -- the exact precedence of the old hardcoded checks.
  position           INTEGER NOT NULL DEFAULT 100,
  version            INTEGER NOT NULL DEFAULT 1,
  status             TEXT NOT NULL DEFAULT 'DRAFT'
                     CHECK (status IN ('DRAFT', 'PUBLISHED', 'ARCHIVED')),
  enabled            BOOLEAN NOT NULL DEFAULT TRUE,
  is_system          BOOLEAN NOT NULL DEFAULT FALSE,
  source_instruction TEXT,
  created_by_user_id UUID REFERENCES users(id),
  created_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (organization_id, key, version)
);

-- At most one PUBLISHED version per (organization, policy key).
CREATE UNIQUE INDEX policy_definitions_one_published
  ON policy_definitions (organization_id, key)
  WHERE status = 'PUBLISHED';

CREATE INDEX policy_definitions_lookup
  ON policy_definitions (organization_id, key, status);

CREATE INDEX policy_definitions_action
  ON policy_definitions (organization_id, action, status);

-- Cross-instance cache invalidation for the published policy store.
CREATE TABLE policy_store_meta (
  organization_id UUID PRIMARY KEY REFERENCES organizations(id) ON DELETE CASCADE,
  version         BIGINT NOT NULL DEFAULT 0,
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Records when the driver completed the safety follow-up (location/backup)
-- for an incident. Nullable: existing incidents simply have no follow-up on
-- record yet, which the safety policy treats as "still to collect".
ALTER TABLE incidents
  ADD COLUMN IF NOT EXISTS safety_followup_at TIMESTAMPTZ;

CREATE TRIGGER trg_policy_definitions_updated_at
  BEFORE UPDATE ON policy_definitions
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
