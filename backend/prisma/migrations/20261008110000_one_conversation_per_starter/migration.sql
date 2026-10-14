-- One conversation per starter. The two built-in pairs that shared an intent and were told apart by an "only when" setting are now one
-- conversation each, with an IF step inside:
--   job.request + job.request-browse         -> job.request
--   cancellation.request + cancellation.direct -> cancellation.request
-- The old rows are removed here and the merged built-ins are inserted by `npm run db:seed` (the deploy runs it right after the migrations;
-- until it does, the bot falls back to its built-in behaviour for those two intents). Edits a manager made to these four built-in
-- conversations are not carried over.
DELETE FROM "flow_definitions"
 WHERE "is_system" = true
   AND "key" IN ('job.request', 'job.request-browse', 'cancellation.request', 'cancellation.direct');

-- The "only when" setting no longer exists.
UPDATE "flow_definitions" SET "trigger_config" = "trigger_config" - 'when' WHERE "trigger_config" ? 'when';
