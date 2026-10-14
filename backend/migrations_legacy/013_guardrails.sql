-- Guardrails & AI instructions configurable per organization.
--
-- guard_rules holds the operational guards that used to be hardcoded in
-- src/services/jobStateMachine.js / workflow.js / promptGuard.js / autoClosure.js.
-- Seeded rows reproduce the previous hardcoded behavior exactly, so applying
-- this migration changes nothing until a manager edits something.
--
-- ai_instructions rows are only created when a manager customizes a prompt;
-- when no row exists for a key, the backend falls back to the prompt text
-- compiled into the relevant src/ai/*.js module (that text is the default).

CREATE TABLE guard_rules (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations (id) ON DELETE CASCADE,
    code            VARCHAR(80) NOT NULL,
    name            VARCHAR(160) NOT NULL,
    description     TEXT,
    category        VARCHAR(30) NOT NULL
                    CHECK (category IN ('MILESTONE_GATE', 'TRANSITION', 'TIMING', 'SECURITY')),
    config          JSONB NOT NULL DEFAULT '{}'::jsonb,
    enabled         BOOLEAN NOT NULL DEFAULT TRUE,
    is_system       BOOLEAN NOT NULL DEFAULT FALSE,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (organization_id, code)
);

CREATE TABLE ai_instructions (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations (id) ON DELETE CASCADE,
    key             VARCHAR(80) NOT NULL,
    content         TEXT NOT NULL,
    version         INTEGER NOT NULL DEFAULT 1,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (organization_id, key)
);

INSERT INTO guard_rules (organization_id, code, name, description, category, config, enabled, is_system) VALUES
    ('00000000-0000-0000-0000-000000000001',
     'DOCUMENT_GATE_LOADED', 'Pickup code confirms Loaded',
     'The LOADED milestone is only confirmed after the driver sends the pickup document and the pickup security code on it matches the job.',
     'MILESTONE_GATE', '{"milestone": "LOADED", "stage": "PICKUP"}', TRUE, TRUE),
    ('00000000-0000-0000-0000-000000000001',
     'DOCUMENT_GATE_DELIVERED', 'Delivery code confirms Delivered',
     'The DELIVERED milestone is only confirmed after the driver sends the delivery document and the delivery security code on it matches the job.',
     'MILESTONE_GATE', '{"milestone": "DELIVERED", "stage": "DELIVERY"}', TRUE, TRUE),
    ('00000000-0000-0000-0000-000000000001',
     'PICKUP_BEFORE_DELIVERY_DOC', 'Pickup document before delivery document',
     'The delivery document is rejected until the pickup document has been verified first.',
     'MILESTONE_GATE', '{}', TRUE, TRUE),
    ('00000000-0000-0000-0000-000000000001',
     'START_CONFIRMATION_REQUIRED', 'Driver must explicitly start the trip',
     'Progress updates are blocked until the driver has explicitly confirmed the start of the job.',
     'TRANSITION', '{}', TRUE, TRUE),
    ('00000000-0000-0000-0000-000000000001',
     'PROTECTED_MILESTONES', 'Confirmed milestones cannot be rolled back',
     'Once any of these milestones is confirmed, the job cannot be moved back to an earlier stage (managers may still correct it).',
     'TRANSITION', '{"milestones": ["ASSIGNED", "IN_PROGRESS", "LOADED", "DELIVERED", "COMPLETED"]}', TRUE, TRUE),
    ('00000000-0000-0000-0000-000000000001',
     'FROZEN_STATUSES', 'Closed jobs can never change status',
     'Jobs in one of these statuses are frozen: no milestone, document or correction can change them anymore.',
     'TRANSITION', '{"statuses": ["COMPLETED", "CANCELLED"]}', TRUE, TRUE),
    ('00000000-0000-0000-0000-000000000001',
     'PROMPT_INJECTION_THRESHOLD', 'Prompt-injection screening sensitivity',
     'Driver messages scoring at or above this threshold are blocked as suspected prompt-injection attempts. Lower is stricter (0 to 1).',
     'SECURITY', '{"threshold": 0.97}', TRUE, TRUE),
    ('00000000-0000-0000-0000-000000000001',
     'AUTO_CLOSURE_DELAY', 'Auto closure delay (minutes)',
     'Minutes after the delivery is confirmed before the job is automatically sent to the manager for closure approval.',
     'TIMING', '{"minutes": 2}', TRUE, TRUE)
ON CONFLICT (organization_id, code) DO NOTHING;
