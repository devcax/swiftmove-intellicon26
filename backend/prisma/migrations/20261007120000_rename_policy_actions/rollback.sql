-- Undo rename_policy_actions. Run by hand: psql "$DATABASE_URL" -f rollback.sql
-- job.requestClosure policies of the system go back to AUTO_CLOSE_JOB (their actor match is removed); every other one goes back to END_JOB.
-- The actor match added to the driver's closure rules is kept: it does no harm under the old names.
-- The setting "closure.auto-request" always goes back to AUTO_CLOSE_JOB.
UPDATE "policy_definitions"
   SET "action" = 'AUTO_CLOSE_JOB', "match" = "match" - 'actor', "updated_at" = now()
 WHERE "action" = 'job.requestClosure' AND ("match" @> '{"actor": "SYSTEM"}'::jsonb);

UPDATE "policy_definitions"
   SET "action" = 'AUTO_CLOSE_JOB', "updated_at" = now()
 WHERE "action" = 'job.requestClosure' AND "key" = 'closure.auto-request';

UPDATE "policy_definitions"
   SET "action" = CASE "action"
     WHEN 'request.submit' THEN 'REQUEST_JOB'
     WHEN 'request.withdraw' THEN 'CANCEL_JOB_REQUEST'
     WHEN 'offer.accept' THEN 'ACCEPT_OFFER'
     WHEN 'offer.decline' THEN 'DECLINE_OFFER'
     WHEN 'trip.start' THEN 'START_JOB'
     WHEN 'trip.milestone' THEN 'APPLY_MILESTONE'
     WHEN 'trip.verifyDocument' THEN 'VERIFY_DOCUMENT'
     WHEN 'incident.report' THEN 'REPORT_INCIDENT'
     WHEN 'trip.requestCancellation' THEN 'REQUEST_CANCELLATION'
     WHEN 'job.requestClosure' THEN 'END_JOB'
     WHEN 'job.complete' THEN 'COMPLETE_JOB'
     WHEN 'incident.resolve' THEN 'RESOLVE_INCIDENT'
     WHEN 'job.create' THEN 'CREATE_JOB'
     WHEN 'conversation.receive' THEN 'INBOUND_MESSAGE'
   END,
   "updated_at" = now()
 WHERE "action" IN (
   'request.submit', 'request.withdraw', 'offer.accept', 'offer.decline', 'trip.start', 'trip.milestone', 'trip.verifyDocument', 'incident.report',
   'trip.requestCancellation', 'job.requestClosure', 'job.complete', 'incident.resolve', 'job.create', 'conversation.receive'
 );

UPDATE "policy_store_meta" SET "version" = "version" + 1, "updated_at" = now();
