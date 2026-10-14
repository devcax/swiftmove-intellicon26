-- AlterTable
ALTER TABLE "attachments" ADD COLUMN     "organization_id" UUID,
ALTER COLUMN "message_id" DROP NOT NULL;

-- CreateTable
CREATE TABLE "evidence" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "organization_id" UUID NOT NULL,
    "subject_type" VARCHAR(20) NOT NULL,
    "subject_id" UUID NOT NULL,
    "name" VARCHAR(60) NOT NULL,
    "type" VARCHAR(20) NOT NULL,
    "value" JSONB NOT NULL DEFAULT '{}',
    "attachment_id" UUID,
    "recorded_by_type" VARCHAR(20) NOT NULL,
    "recorded_by_id" UUID,
    "source" VARCHAR(30) NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expires_at" TIMESTAMPTZ(6),
    "revoked_at" TIMESTAMPTZ(6),

    CONSTRAINT "evidence_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "idx_evidence_subject_name" ON "evidence"("organization_id", "subject_type", "subject_id", "name", "created_at" DESC);

-- CreateIndex
CREATE INDEX "idx_evidence_pending_age" ON "evidence"("subject_type", "created_at");

-- AddForeignKey
ALTER TABLE "attachments" ADD CONSTRAINT "attachments_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "evidence" ADD CONSTRAINT "evidence_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "evidence" ADD CONSTRAINT "evidence_attachment_id_fkey" FOREIGN KEY ("attachment_id") REFERENCES "attachments"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- Written by hand: Prisma cannot describe CHECK constraints.
-- An attachment belongs to a WhatsApp message or, when uploaded from the dashboard, directly to an organization.
ALTER TABLE "attachments" ADD CONSTRAINT "attachments_owner_check" CHECK ("message_id" IS NOT NULL OR "organization_id" IS NOT NULL);
ALTER TABLE "evidence" ADD CONSTRAINT "evidence_subject_type_check" CHECK ("subject_type" IN ('DRIVER', 'JOB', 'PENDING'));
ALTER TABLE "evidence" ADD CONSTRAINT "evidence_type_check" CHECK ("type" IN ('DOCUMENT', 'CONFIRMATION', 'TEXT', 'LOCATION', 'APPROVAL'));
ALTER TABLE "evidence" ADD CONSTRAINT "evidence_name_check" CHECK ("name" ~ '^[a-z][a-z0-9_]{1,59}$');
ALTER TABLE "evidence" ADD CONSTRAINT "evidence_recorded_by_type_check" CHECK ("recorded_by_type" IN ('DRIVER', 'MANAGER', 'SYSTEM'));
ALTER TABLE "evidence" ADD CONSTRAINT "evidence_document_needs_attachment_check" CHECK ("type" <> 'DOCUMENT' OR "attachment_id" IS NOT NULL);
