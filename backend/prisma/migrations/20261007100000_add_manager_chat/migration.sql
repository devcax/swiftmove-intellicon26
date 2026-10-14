-- CreateTable
CREATE TABLE "manager_chats" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "organization_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "manager_chats_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "manager_chat_messages" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "chat_id" UUID NOT NULL,
    "role" VARCHAR(20) NOT NULL,
    "content" TEXT NOT NULL DEFAULT '',
    "tool_name" VARCHAR(80),
    "tool_input_summary" TEXT,
    "tool_outcome" VARCHAR(30),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "manager_chat_messages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "manager_chat_confirmations" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "chat_id" UUID NOT NULL,
    "token_hash" VARCHAR(64) NOT NULL,
    "action_name" VARCHAR(80) NOT NULL,
    "input" JSONB NOT NULL,
    "summary" TEXT NOT NULL,
    "expires_at" TIMESTAMPTZ(6) NOT NULL,
    "used_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "manager_chat_confirmations_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "idx_manager_chats_user" ON "manager_chats"("user_id", "updated_at" DESC);

-- CreateIndex
CREATE INDEX "idx_manager_chat_messages_chat" ON "manager_chat_messages"("chat_id", "created_at");

-- CreateIndex
CREATE UNIQUE INDEX "manager_chat_confirmations_token_hash_key" ON "manager_chat_confirmations"("token_hash");

-- CreateIndex
CREATE INDEX "idx_manager_chat_confirmations_chat" ON "manager_chat_confirmations"("chat_id");

-- AddForeignKey
ALTER TABLE "manager_chats" ADD CONSTRAINT "manager_chats_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "manager_chats" ADD CONSTRAINT "manager_chats_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "manager_chat_messages" ADD CONSTRAINT "manager_chat_messages_chat_id_fkey" FOREIGN KEY ("chat_id") REFERENCES "manager_chats"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "manager_chat_confirmations" ADD CONSTRAINT "manager_chat_confirmations_chat_id_fkey" FOREIGN KEY ("chat_id") REFERENCES "manager_chats"("id") ON DELETE CASCADE ON UPDATE NO ACTION;
