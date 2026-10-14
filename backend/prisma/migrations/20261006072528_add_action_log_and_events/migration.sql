-- CreateTable
CREATE TABLE "action_log" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "organization_id" UUID NOT NULL,
    "action" VARCHAR(80) NOT NULL,
    "actor_type" VARCHAR(20) NOT NULL,
    "actor_id" UUID,
    "source" VARCHAR(30) NOT NULL,
    "request_id" VARCHAR(64),
    "subject_type" VARCHAR(40),
    "subject_id" UUID,
    "outcome" VARCHAR(20) NOT NULL,
    "policy_key" VARCHAR(80),
    "error_code" VARCHAR(80),
    "duration_ms" INTEGER,
    "input_summary" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "action_log_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "events" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "organization_id" UUID NOT NULL,
    "type" VARCHAR(80) NOT NULL,
    "payload" JSONB NOT NULL DEFAULT '{}',
    "action_log_id" UUID,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "event_deliveries" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "event_id" UUID NOT NULL,
    "subscriber" VARCHAR(80) NOT NULL,
    "status" VARCHAR(20) NOT NULL DEFAULT 'PENDING',
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "next_attempt_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "last_error" TEXT,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "event_deliveries_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "idx_action_log_org_time" ON "action_log"("organization_id", "created_at");

-- CreateIndex
CREATE INDEX "idx_action_log_subject" ON "action_log"("subject_type", "subject_id");

-- CreateIndex
CREATE INDEX "idx_events_org_time" ON "events"("organization_id", "created_at");

-- CreateIndex
CREATE INDEX "idx_events_action_log" ON "events"("action_log_id");

-- CreateIndex
CREATE INDEX "idx_event_deliveries_due" ON "event_deliveries"("status", "next_attempt_at");

-- CreateIndex
CREATE UNIQUE INDEX "event_deliveries_event_id_subscriber_key" ON "event_deliveries"("event_id", "subscriber");

-- AddForeignKey
ALTER TABLE "action_log" ADD CONSTRAINT "action_log_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "events" ADD CONSTRAINT "events_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "events" ADD CONSTRAINT "events_action_log_id_fkey" FOREIGN KEY ("action_log_id") REFERENCES "action_log"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "event_deliveries" ADD CONSTRAINT "event_deliveries_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "events"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- Written by hand: Prisma cannot describe CHECK constraints or triggers.
ALTER TABLE "action_log" ADD CONSTRAINT "action_log_outcome_check" CHECK ("outcome" IN ('ALLOWED', 'BLOCKED', 'FAILED', 'DENIED'));
ALTER TABLE "action_log" ADD CONSTRAINT "action_log_actor_type_check" CHECK ("actor_type" IN ('DRIVER', 'MANAGER', 'SYSTEM'));
ALTER TABLE "event_deliveries" ADD CONSTRAINT "event_deliveries_status_check" CHECK ("status" IN ('PENDING', 'DONE', 'FAILED'));
CREATE TRIGGER trg_event_deliveries_updated_at BEFORE UPDATE ON event_deliveries FOR EACH ROW EXECUTE FUNCTION set_updated_at();
