-- Initial schema.

CREATE TABLE organizations (
    id                             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name                           VARCHAR(160) NOT NULL,
    official_whatsapp_display_name VARCHAR(160),
    created_at                     TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at                     TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE users (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations (id),
    name            VARCHAR(160) NOT NULL,
    email           VARCHAR(255) NOT NULL,
    password_hash   TEXT NOT NULL,
    status          VARCHAR(30) NOT NULL DEFAULT 'ACTIVE'
                    CHECK (status IN ('ACTIVE', 'INACTIVE', 'SUSPENDED')),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (organization_id, email)
);

CREATE TABLE roles (
    id   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code VARCHAR(50) NOT NULL UNIQUE,
    name VARCHAR(100) NOT NULL
);

CREATE TABLE user_roles (
    user_id    UUID NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    role_id    UUID NOT NULL REFERENCES roles (id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY (user_id, role_id)
);


CREATE TABLE jobs (
    id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id      UUID NOT NULL REFERENCES organizations (id),
    job_number           VARCHAR(80) NOT NULL,
    current_status       VARCHAR(50) NOT NULL DEFAULT 'DRAFT'
                         CHECK (current_status IN (
                             'DRAFT', 'PUBLISHED', 'DRIVER_REQUESTED', 'MANAGER_APPROVED',
                             'ASSIGNMENT_SENT', 'ASSIGNED', 'IN_PROGRESS', 'DELAYED',
                             'DELIVERED', 'DELIVERED_WITH_EXCEPTION', 'CANCELLATION_REVIEW',
                             'INCIDENT_OPEN', 'DRIVER_SUBMITTED_COMPLETION', 'MANAGER_REVIEW',
                             'REQUIRES_CORRECTION', 'COMPLETED', 'CANCELLED', 'FAILED_DELIVERY'
                         )),
    cargo_description    TEXT NOT NULL,
    pickup_at            TIMESTAMPTZ NOT NULL,
    delivery_at          TIMESTAMPTZ,
    special_instructions TEXT,
    published_at         TIMESTAMPTZ,
    created_by_user_id   UUID NOT NULL REFERENCES users (id),
    completed_by_user_id UUID REFERENCES users (id),
    completed_at         TIMESTAMPTZ,
    created_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (organization_id, job_number)
);


CREATE TABLE drivers (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations (id),
    name            VARCHAR(160) NOT NULL,
    status          VARCHAR(30) NOT NULL DEFAULT 'ACTIVE'
                    CHECK (status IN ('ACTIVE', 'INACTIVE', 'SUSPENDED')),
    active_job_id   UUID REFERENCES jobs (id), -- convenience projection only
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE driver_whatsapp_accounts (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    driver_id           UUID NOT NULL REFERENCES drivers (id) ON DELETE CASCADE,
    phone_e164          VARCHAR(30) NOT NULL UNIQUE,
    is_primary          BOOLEAN NOT NULL DEFAULT TRUE,
    verification_status VARCHAR(30) NOT NULL DEFAULT 'UNVERIFIED'
                        CHECK (verification_status IN ('UNVERIFIED', 'VERIFIED', 'REVOKED')),
    last_message_at     TIMESTAMPTZ,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);


CREATE TABLE locations (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations (id),
    name            VARCHAR(180) NOT NULL,
    address_line_1  VARCHAR(255) NOT NULL,
    address_line_2  VARCHAR(255),
    city            VARCHAR(100) NOT NULL,
    state           VARCHAR(100),
    postal_code     VARCHAR(30),
    country         VARCHAR(100) NOT NULL,
    contact_name    VARCHAR(160),
    contact_phone   VARCHAR(30),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE job_items (
    id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    job_id           UUID NOT NULL REFERENCES jobs (id) ON DELETE CASCADE,
    description      VARCHAR(255) NOT NULL,
    planned_quantity DECIMAL(12, 3) NOT NULL,
    unit             VARCHAR(40) NOT NULL,
    created_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE job_stops (
    id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    job_id         UUID NOT NULL REFERENCES jobs (id) ON DELETE CASCADE,
    location_id    UUID NOT NULL REFERENCES locations (id),
    stop_sequence  INTEGER NOT NULL,
    stop_type      VARCHAR(30) NOT NULL
                   CHECK (stop_type IN ('PICKUP', 'DELIVERY')),
    appointment_at TIMESTAMPTZ,
    status         VARCHAR(30) NOT NULL DEFAULT 'PENDING'
                   CHECK (status IN ('PENDING', 'ARRIVED', 'IN_PROGRESS', 'COMPLETED', 'FAILED')),
    created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (job_id, stop_sequence)
);


CREATE TABLE job_requests (
    id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    job_id             UUID NOT NULL REFERENCES jobs (id),
    driver_id          UUID NOT NULL REFERENCES drivers (id),
    status             VARCHAR(40) NOT NULL DEFAULT 'REQUESTED'
                       CHECK (status IN ('REQUESTED', 'CANCELLED_BY_DRIVER', 'REJECTED', 'APPROVED', 'EXPIRED')),
    requested_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
    cancelled_at       TIMESTAMPTZ,
    cancel_reason      TEXT,
    reviewed_by_user_id UUID REFERENCES users (id),
    reviewed_at        TIMESTAMPTZ,
    created_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at         TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Only one open request per driver and job
CREATE UNIQUE INDEX uq_job_requests_open
    ON job_requests (job_id, driver_id)
    WHERE status = 'REQUESTED';

CREATE TABLE job_assignments (
    id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    job_id                UUID NOT NULL REFERENCES jobs (id),
    driver_id             UUID NOT NULL REFERENCES drivers (id),
    status                VARCHAR(50) NOT NULL DEFAULT 'PENDING_DRIVER_ACCEPTANCE'
                          CHECK (status IN ('PENDING_DRIVER_ACCEPTANCE', 'ASSIGNED', 'DECLINED',
                                            'CANCELLATION_REVIEW', 'CANCELLED', 'ACTIVE', 'COMPLETED')),
    assigned_by_user_id   UUID NOT NULL REFERENCES users (id),
    assigned_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
    accepted_at           TIMESTAMPTZ,
    started_at            TIMESTAMPTZ,
    completion_submitted_at TIMESTAMPTZ,
    cancelled_at          TIMESTAMPTZ,
    cancellation_reason   TEXT,
    completed_at          TIMESTAMPTZ,
    created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at            TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Prevent more than one live assignment for a driver
CREATE UNIQUE INDEX uq_job_assignments_one_active
    ON job_assignments (driver_id)
    WHERE status IN ('ASSIGNED', 'ACTIVE');


CREATE TABLE conversations (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations (id),
    driver_id       UUID NOT NULL REFERENCES drivers (id),
    job_id          UUID REFERENCES jobs (id), -- nullable: general conversation while requesting
    status          VARCHAR(30) NOT NULL DEFAULT 'OPEN'
                    CHECK (status IN ('OPEN', 'CLOSED')),
    last_message_at TIMESTAMPTZ,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- One open job-specific conversation per driver and job
CREATE UNIQUE INDEX uq_conversations_open_job
    ON conversations (driver_id, job_id)
    WHERE status = 'OPEN' AND job_id IS NOT NULL;

-- One open general conversation per driver
CREATE UNIQUE INDEX uq_conversations_open_general
    ON conversations (driver_id)
    WHERE status = 'OPEN' AND job_id IS NULL;

CREATE TABLE messages (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    conversation_id     UUID NOT NULL REFERENCES conversations (id),
    external_message_id VARCHAR(255) UNIQUE, -- duplicate-message protection
    sender_type         VARCHAR(30) NOT NULL
                        CHECK (sender_type IN ('DRIVER', 'MANAGER', 'BOT', 'SYSTEM')),
    sender_driver_id    UUID REFERENCES drivers (id),
    sender_user_id      UUID REFERENCES users (id),
    message_type        VARCHAR(30) NOT NULL DEFAULT 'TEXT'
                        CHECK (message_type IN ('TEXT', 'AUDIO', 'IMAGE', 'DOCUMENT', 'BUTTON', 'SYSTEM')),
    source_type         VARCHAR(40) NOT NULL
                        CHECK (source_type IN ('DRIVER_MESSAGE', 'MANUAL_MANAGER_MESSAGE', 'BOT_MESSAGE', 'SYSTEM_MESSAGE')),
    body_text           TEXT,
    delivery_status     VARCHAR(30) NOT NULL DEFAULT 'RECEIVED'
                        CHECK (delivery_status IN ('RECEIVED', 'QUEUED', 'SENT', 'DELIVERED', 'FAILED')),
    received_at         TIMESTAMPTZ,
    sent_at             TIMESTAMPTZ,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE attachments (
    id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    message_id        UUID NOT NULL REFERENCES messages (id) ON DELETE CASCADE,
    attachment_type   VARCHAR(30) NOT NULL
                      CHECK (attachment_type IN ('AUDIO', 'IMAGE', 'DOCUMENT')),
    storage_key       TEXT NOT NULL,
    original_filename VARCHAR(255),
    mime_type         VARCHAR(120) NOT NULL,
    file_size_bytes   BIGINT,
    checksum_sha256   VARCHAR(64),
    transcription_text TEXT,
    created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE ai_interpretations (
    id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    message_id        UUID NOT NULL UNIQUE REFERENCES messages (id),
    model_name        VARCHAR(120) NOT NULL,
    prompt_version    VARCHAR(40) NOT NULL,
    primary_intent    VARCHAR(60) NOT NULL,
    structured_output JSONB NOT NULL,
    confidence_score  DECIMAL(5, 4) CHECK (confidence_score BETWEEN 0 AND 1),
    processing_status VARCHAR(30) NOT NULL DEFAULT 'PENDING'
                      CHECK (processing_status IN ('PENDING', 'COMPLETED', 'FAILED', 'REQUIRES_REVIEW')),
    error_message     TEXT,
    created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);


CREATE TABLE workflow_events (
    id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    job_id            UUID NOT NULL REFERENCES jobs (id),
    assignment_id     UUID REFERENCES job_assignments (id),
    source_message_id UUID REFERENCES messages (id),
    event_type        VARCHAR(60) NOT NULL,
    event_status      VARCHAR(30) NOT NULL DEFAULT 'PROPOSED'
                      CHECK (event_status IN ('PROPOSED', 'CONFIRMED', 'APPLIED', 'REJECTED', 'REVIEW_REQUIRED')),
    event_data        JSONB NOT NULL DEFAULT '{}'::jsonb,
    confidence_score  DECIMAL(5, 4) CHECK (confidence_score BETWEEN 0 AND 1),
    effective_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    applied_at        TIMESTAMPTZ,
    created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE event_confirmations (
    id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workflow_event_id       UUID NOT NULL UNIQUE REFERENCES workflow_events (id),
    confirmation_message_id UUID NOT NULL REFERENCES messages (id),
    result                  VARCHAR(30) NOT NULL
                            CHECK (result IN ('CONFIRMED', 'CORRECTED', 'REJECTED')),
    corrected_data          JSONB,
    created_at              TIMESTAMPTZ NOT NULL DEFAULT now()
);


CREATE TABLE incidents (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    job_id              UUID NOT NULL REFERENCES jobs (id),
    assignment_id       UUID REFERENCES job_assignments (id),
    reported_by_driver_id UUID NOT NULL REFERENCES drivers (id),
    source_message_id   UUID REFERENCES messages (id),
    incident_type       VARCHAR(40) NOT NULL
                        CHECK (incident_type IN ('ACCIDENT', 'BREAKDOWN', 'DAMAGE', 'SHORTAGE', 'REFUSAL', 'OTHER')),
    severity            VARCHAR(20) NOT NULL DEFAULT 'MEDIUM'
                        CHECK (severity IN ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL')),
    description         TEXT NOT NULL,
    status              VARCHAR(30) NOT NULL DEFAULT 'OPEN'
                        CHECK (status IN ('OPEN', 'UNDER_REVIEW', 'RESOLVED', 'REJECTED')),
    manager_notes       TEXT,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
    resolved_at         TIMESTAMPTZ,
    resolved_by_user_id UUID REFERENCES users (id)
);

CREATE TABLE incident_attachments (
    incident_id   UUID NOT NULL REFERENCES incidents (id) ON DELETE CASCADE,
    attachment_id UUID NOT NULL REFERENCES attachments (id) ON DELETE CASCADE,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY (incident_id, attachment_id)
);


CREATE TABLE notifications (
    id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id  UUID NOT NULL REFERENCES organizations (id),
    job_id           UUID REFERENCES jobs (id),
    incident_id      UUID REFERENCES incidents (id),
    recipient_user_id UUID NOT NULL REFERENCES users (id),
    notification_type VARCHAR(50) NOT NULL,
    title            VARCHAR(180) NOT NULL,
    body             TEXT NOT NULL,
    severity         VARCHAR(20) NOT NULL DEFAULT 'INFO'
                     CHECK (severity IN ('INFO', 'WARNING', 'HIGH', 'CRITICAL')),
    read_at          TIMESTAMPTZ,
    created_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE audit_logs (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations (id),
    actor_type      VARCHAR(30) NOT NULL
                    CHECK (actor_type IN ('DRIVER', 'MANAGER', 'BOT', 'SYSTEM')),
    actor_user_id   UUID REFERENCES users (id),
    actor_driver_id UUID REFERENCES drivers (id),
    action          VARCHAR(80) NOT NULL,
    entity_type     VARCHAR(50) NOT NULL,
    entity_id       UUID NOT NULL,
    before_data     JSONB,
    after_data      JSONB,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);


CREATE INDEX idx_jobs_current_status            ON jobs (current_status);
CREATE INDEX idx_job_requests_status            ON job_requests (status);
CREATE INDEX idx_job_assignments_driver_status  ON job_assignments (driver_id, status);
CREATE INDEX idx_messages_conversation_created  ON messages (conversation_id, created_at);
CREATE INDEX idx_workflow_events_job_created    ON workflow_events (job_id, created_at);
CREATE INDEX idx_incidents_status_severity      ON incidents (status, severity);
CREATE INDEX idx_notifications_recipient_read   ON notifications (recipient_user_id, read_at);
CREATE INDEX idx_audit_logs_entity              ON audit_logs (entity_type, entity_id);


CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_organizations_updated_at BEFORE UPDATE ON organizations FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_drivers_updated_at BEFORE UPDATE ON drivers FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_driver_whatsapp_accounts_updated_at BEFORE UPDATE ON driver_whatsapp_accounts FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_locations_updated_at BEFORE UPDATE ON locations FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_jobs_updated_at BEFORE UPDATE ON jobs FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_job_stops_updated_at BEFORE UPDATE ON job_stops FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_job_requests_updated_at BEFORE UPDATE ON job_requests FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_job_assignments_updated_at BEFORE UPDATE ON job_assignments FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_conversations_updated_at BEFORE UPDATE ON conversations FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- Seed data.

INSERT INTO roles (code, name) VALUES
    ('ADMIN',   'Administrator'),
    ('MANAGER', 'Operations Manager')
ON CONFLICT (code) DO NOTHING;

INSERT INTO organizations (id, name, official_whatsapp_display_name) VALUES
    ('00000000-0000-0000-0000-000000000001', 'Demo Logistics Co', 'Demo Logistics WhatsApp')
ON CONFLICT DO NOTHING;

-- Add read status.

ALTER TABLE messages DROP CONSTRAINT messages_delivery_status_check;
ALTER TABLE messages ADD CONSTRAINT messages_delivery_status_check
    CHECK (delivery_status IN ('RECEIVED', 'QUEUED', 'SENT', 'DELIVERED', 'READ', 'FAILED'));

-- Milestones and demo data.

ALTER TABLE jobs DROP CONSTRAINT jobs_current_status_check;
ALTER TABLE jobs ADD CONSTRAINT jobs_current_status_check
    CHECK (current_status IN (
        'DRAFT', 'PUBLISHED', 'DRIVER_REQUESTED', 'MANAGER_APPROVED',
        'ASSIGNMENT_SENT', 'ASSIGNED', 'IN_PROGRESS',
        'ARRIVED_AT_PICKUP', 'LOADING_STARTED', 'LOADED', 'DEPARTED',
        'ARRIVED_AT_DELIVERY', 'UNLOADING_STARTED', 'UNLOADED',
        'DELAYED', 'DELIVERED', 'DELIVERED_WITH_EXCEPTION', 'CANCELLATION_REVIEW',
        'INCIDENT_OPEN', 'DRIVER_SUBMITTED_COMPLETION', 'MANAGER_REVIEW',
        'REQUIRES_CORRECTION', 'COMPLETED', 'CANCELLED', 'FAILED_DELIVERY'
    ));


ALTER TABLE conversations ADD COLUMN IF NOT EXISTS pending_action JSONB;


-- Manager user (dashboard has no login; this user is the default approver)
INSERT INTO users (id, organization_id, name, email, password_hash, status) VALUES
    ('00000000-0000-0000-0000-000000000010', '00000000-0000-0000-0000-000000000001',
     'Operations Manager', 'manager@demologistics.co', 'login-disabled', 'ACTIVE')
ON CONFLICT DO NOTHING;

INSERT INTO user_roles (user_id, role_id)
    SELECT '00000000-0000-0000-0000-000000000010', r.id FROM roles r WHERE r.code = 'MANAGER'
ON CONFLICT DO NOTHING;

-- Locations used by demo jobs
INSERT INTO locations (id, organization_id, name, address_line_1, city, state, country) VALUES
    ('00000000-0000-0000-0000-000000000101', '00000000-0000-0000-0000-000000000001',
     'Chennai Warehouse', '12 Port Trust Road', 'Chennai', 'Tamil Nadu', 'India'),
    ('00000000-0000-0000-0000-000000000102', '00000000-0000-0000-0000-000000000001',
     'Bengaluru Plant', '88 Peenya Industrial Area Phase 2', 'Bengaluru', 'Karnataka', 'India'),
    ('00000000-0000-0000-0000-000000000103', '00000000-0000-0000-0000-000000000001',
     'Chennai South Yard', '45 GST Road, Tambaram', 'Chennai', 'Tamil Nadu', 'India'),
    ('00000000-0000-0000-0000-000000000104', '00000000-0000-0000-0000-000000000001',
     'Hosur Factory Gate', '7 SIPCOT Industrial Complex', 'Hosur', 'Tamil Nadu', 'India')
ON CONFLICT DO NOTHING;

-- Demo jobs, PUBLISHED so drivers can request them through the bot
INSERT INTO jobs (id, organization_id, job_number, current_status, cargo_description,
                  pickup_at, delivery_at, special_instructions, published_at, created_by_user_id) VALUES
    ('00000000-0000-0000-0000-000000001041', '00000000-0000-0000-0000-000000000001',
     'JOB-1041', 'PUBLISHED', 'Packaged food cartons',
     now() + interval '1 day', now() + interval '1 day 6 hours', NULL, now(),
     '00000000-0000-0000-0000-000000000010'),
    ('00000000-0000-0000-0000-000000001042', '00000000-0000-0000-0000-000000000001',
     'JOB-1042', 'PUBLISHED', 'Industrial components',
     now() + interval '1 day', now() + interval '1 day 8 hours',
     'Signed POD required from the receiver.', now(),
     '00000000-0000-0000-0000-000000000010'),
    ('00000000-0000-0000-0000-000000001045', '00000000-0000-0000-0000-000000000001',
     'JOB-1045', 'PUBLISHED', 'Auto spare parts',
     now() + interval '1 day 6 hours', now() + interval '2 days', NULL, now(),
     '00000000-0000-0000-0000-000000000010')
ON CONFLICT DO NOTHING;

-- Planned cargo per job
INSERT INTO job_items (job_id, description, planned_quantity, unit) VALUES
    ('00000000-0000-0000-0000-000000001041', 'Packaged food cartons', 22, 'boxes'),
    ('00000000-0000-0000-0000-000000001042', 'Industrial components', 18, 'pallets'),
    ('00000000-0000-0000-0000-000000001045', 'Auto spare parts', 10, 'pallets');

-- Pickup + delivery stops per job
INSERT INTO job_stops (job_id, location_id, stop_sequence, stop_type, appointment_at) VALUES
    ('00000000-0000-0000-0000-000000001041', '00000000-0000-0000-0000-000000000101', 1, 'PICKUP',   now() + interval '1 day'),
    ('00000000-0000-0000-0000-000000001041', '00000000-0000-0000-0000-000000000102', 2, 'DELIVERY', now() + interval '1 day 6 hours'),
    ('00000000-0000-0000-0000-000000001042', '00000000-0000-0000-0000-000000000101', 1, 'PICKUP',   now() + interval '1 day'),
    ('00000000-0000-0000-0000-000000001042', '00000000-0000-0000-0000-000000000102', 2, 'DELIVERY', now() + interval '1 day 8 hours'),
    ('00000000-0000-0000-0000-000000001045', '00000000-0000-0000-0000-000000000103', 1, 'PICKUP',   now() + interval '1 day 6 hours'),
    ('00000000-0000-0000-0000-000000001045', '00000000-0000-0000-0000-000000000104', 2, 'DELIVERY', now() + interval '2 days')
ON CONFLICT DO NOTHING;

-- One open conversation per driver.

DO $$
DECLARE
  dup     RECORD;
  keep_id UUID;
  other_id UUID;
  i       INTEGER;
  o_pending JSONB;
  o_job   UUID;
  o_last  TIMESTAMPTZ;
BEGIN
  FOR dup IN
    SELECT driver_id, array_agg(id ORDER BY created_at) AS ids
      FROM conversations
     WHERE status = 'OPEN'
     GROUP BY driver_id
    HAVING count(*) > 1
  LOOP
    keep_id := dup.ids[1];
    FOR i IN 2 .. array_length(dup.ids, 1) LOOP
      other_id := dup.ids[i];
      SELECT pending_action, job_id, last_message_at
        INTO o_pending, o_job, o_last
        FROM conversations WHERE id = other_id;
      UPDATE messages SET conversation_id = keep_id WHERE conversation_id = other_id;
      DELETE FROM conversations WHERE id = other_id;
      UPDATE conversations k
         SET pending_action = COALESCE(k.pending_action, o_pending),
             job_id         = COALESCE(k.job_id, o_job),
             last_message_at = GREATEST(k.last_message_at, o_last)
       WHERE k.id = keep_id;
    END LOOP;
  END LOOP;
END $$;

UPDATE conversations c
   SET job_id = d.active_job_id
  FROM drivers d
 WHERE d.id = c.driver_id
   AND c.status = 'OPEN'
   AND d.active_job_id IS NOT NULL
   AND c.job_id IS DISTINCT FROM d.active_job_id;

DROP INDEX IF EXISTS uq_conversations_open_job;
DROP INDEX IF EXISTS uq_conversations_open_general;
CREATE UNIQUE INDEX uq_conversations_one_open
    ON conversations (driver_id)
    WHERE status = 'OPEN';

-- Verification, vision, and summaries.

ALTER TABLE jobs
  ADD COLUMN IF NOT EXISTS pickup_code  VARCHAR(40),
  ADD COLUMN IF NOT EXISTS delivery_code VARCHAR(40),
  ADD COLUMN IF NOT EXISTS pickup_verified_at  TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS delivery_verified_at TIMESTAMPTZ;

ALTER TABLE jobs
  ADD COLUMN IF NOT EXISTS pickup_proof_attachment_id  UUID REFERENCES attachments (id),
  ADD COLUMN IF NOT EXISTS delivery_proof_attachment_id UUID REFERENCES attachments (id);

CREATE TABLE IF NOT EXISTS job_summaries (
    job_id          UUID PRIMARY KEY REFERENCES jobs (id) ON DELETE CASCADE,
    driver_id       UUID REFERENCES drivers (id),
    summary_text    TEXT NOT NULL DEFAULT '',
    last_message_id UUID,
    message_count   INTEGER NOT NULL DEFAULT 0,
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE attachments
  ADD COLUMN IF NOT EXISTS r2_key     TEXT,
  ADD COLUMN IF NOT EXISTS public_url TEXT,
  ADD COLUMN IF NOT EXISTS vision     JSONB;

ALTER TABLE attachments DROP CONSTRAINT IF EXISTS attachments_attachment_type_check;
ALTER TABLE attachments ADD CONSTRAINT attachments_attachment_type_check
  CHECK (attachment_type IN ('AUDIO', 'IMAGE', 'DOCUMENT', 'VIDEO'));

ALTER TABLE incidents
  ADD COLUMN IF NOT EXISTS location_lat         NUMERIC(9, 6),
  ADD COLUMN IF NOT EXISTS location_lng         NUMERIC(10, 6),
  ADD COLUMN IF NOT EXISTS location_received_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS backup_vehicle       VARCHAR(20);

ALTER TABLE messages DROP CONSTRAINT IF EXISTS messages_message_type_check;
ALTER TABLE messages ADD CONSTRAINT messages_message_type_check
  CHECK (message_type IN ('TEXT', 'AUDIO', 'IMAGE', 'DOCUMENT', 'BUTTON', 'SYSTEM', 'LOCATION', 'VIDEO'));

-- Driver vehicle details.

ALTER TABLE drivers
    ADD COLUMN IF NOT EXISTS vehicle_type   VARCHAR(60),
    ADD COLUMN IF NOT EXISTS license_plate  VARCHAR(30);

CREATE UNIQUE INDEX IF NOT EXISTS uq_drivers_license_plate
    ON drivers (license_plate)
    WHERE license_plate IS NOT NULL;

-- State-machine history.

CREATE INDEX IF NOT EXISTS idx_workflow_events_job_applied_type
    ON workflow_events (job_id, event_type)
    WHERE event_status = 'APPLIED';

CREATE INDEX IF NOT EXISTS idx_workflow_events_inferred
    ON workflow_events (job_id)
    WHERE event_data ? 'inferred';

CREATE OR REPLACE VIEW job_status_history AS
SELECT
    we.job_id,
    we.id                                      AS event_id,
    we.event_type,
    we.event_status,
    we.created_at,
    we.applied_at,
    we.source_message_id,
    COALESCE((we.event_data ->> 'inferred')::boolean, FALSE)   AS system_inferred,
    COALESCE((we.event_data ->> 'correction')::boolean, FALSE) AS is_correction,
    (we.event_data -> 'verification' ->> 'stage')              AS verified_stage,
    (we.event_data -> 'verification' ->> 'method')             AS verified_method,
    we.event_data
FROM workflow_events we
ORDER BY we.job_id, we.created_at;

-- Stage delays.

ALTER TABLE jobs
    ADD COLUMN IF NOT EXISTS pickup_actual_at       TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS pickup_delay_reason    TEXT,
    ADD COLUMN IF NOT EXISTS delivery_actual_at     TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS delivery_delay_reason  TEXT;

-- The auto-closure sweeper polls for delivered jobs past the closure window.
CREATE INDEX IF NOT EXISTS idx_jobs_auto_closure
    ON jobs (current_status)
    WHERE current_status IN ('DELIVERED', 'DELIVERED_WITH_EXCEPTION');

-- Supersede competing requests.
ALTER TABLE job_requests DROP CONSTRAINT job_requests_status_check;

ALTER TABLE job_requests ADD CONSTRAINT job_requests_status_check
    CHECK (status IN ('REQUESTED', 'CANCELLED_BY_DRIVER', 'REJECTED', 'APPROVED', 'EXPIRED', 'SUPERSEDED'));

ALTER TABLE conversations
  ADD COLUMN IF NOT EXISTS ai_paused_at TIMESTAMPTZ;

-- Track when the manager last opened each conversation so incoming driver
-- messages can be surfaced as unread in the conversation list.

ALTER TABLE conversations
    ADD COLUMN manager_last_read_at TIMESTAMPTZ;

-- Existing conversations were already visible before this feature shipped.
-- Treat their history as read so only newly received driver messages alert managers.
UPDATE conversations
   SET manager_last_read_at = now();

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

-- Job request window as a dashboard-editable guardrail.
--
-- The window within which drivers can see and request jobs (and within which
-- automatic job offers are sent on publish) used to be hardcoded to 24 hours
-- in workflow.js / jobOffers.js. Seeding this row reproduces that behavior
-- exactly; managers can change the hours from the Guardrails page.

INSERT INTO guard_rules (organization_id, code, name, description, category, config, enabled, is_system) VALUES
    ('00000000-0000-0000-0000-000000000001',
     'JOB_REQUEST_WINDOW', 'Job request window (hours)',
     'Drivers only see and can only request jobs whose pickup is within this many hours from now. Publishing a job outside this window sends no automatic offers.',
     'TIMING', '{"hours": 24}', TRUE, TRUE)
ON CONFLICT (organization_id, code) DO NOTHING;

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

