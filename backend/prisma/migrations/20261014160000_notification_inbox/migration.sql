ALTER TABLE "notifications"
  ADD COLUMN "source_key" VARCHAR(180),
  ADD COLUMN "target_path" VARCHAR(500);

CREATE UNIQUE INDEX "notifications_recipient_source_key"
  ON "notifications" ("recipient_user_id", "source_key");
