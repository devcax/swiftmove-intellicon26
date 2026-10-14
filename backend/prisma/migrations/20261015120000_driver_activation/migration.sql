CREATE TABLE "driver_activations" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "account_id" UUID NOT NULL,
  "token" VARCHAR(64) NOT NULL,
  "expires_at" TIMESTAMPTZ(6) NOT NULL,
  "used_at" TIMESTAMPTZ(6),
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT now(),
  CONSTRAINT "driver_activations_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "driver_activations_token_key" ON "driver_activations"("token");
CREATE INDEX "driver_activations_account_id_idx" ON "driver_activations"("account_id");

ALTER TABLE "driver_activations"
  ADD CONSTRAINT "driver_activations_account_id_fkey" FOREIGN KEY ("account_id")
  REFERENCES "driver_whatsapp_accounts"("id") ON DELETE CASCADE ON UPDATE NO ACTION;
