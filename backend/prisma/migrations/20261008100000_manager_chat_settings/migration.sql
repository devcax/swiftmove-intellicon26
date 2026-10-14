-- A chat gets a title (taken from its first message) and its own context size: how many of its latest messages the assistant may read.
ALTER TABLE "manager_chats" ADD COLUMN "title" VARCHAR(80);
ALTER TABLE "manager_chats" ADD COLUMN "context_messages" INTEGER NOT NULL DEFAULT 6;
ALTER TABLE "manager_chats" ADD CONSTRAINT "manager_chats_context_messages_check" CHECK ("context_messages" BETWEEN 2 AND 30);
