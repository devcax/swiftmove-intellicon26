ALTER TABLE "drivers"
  ADD COLUMN "address" VARCHAR(1000),
  ADD COLUMN "nic" VARCHAR(20),
  ADD COLUMN "date_of_birth" DATE,
  ADD COLUMN "bank_name" VARCHAR(160),
  ADD COLUMN "bank_branch" VARCHAR(160),
  ADD COLUMN "bank_account_holder" VARCHAR(160),
  ADD COLUMN "bank_account_number" VARCHAR(80);
