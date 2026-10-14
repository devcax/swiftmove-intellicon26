-- Rename the action names stored in policies from the old UPPER_SNAKE names to the module action names (plan section 7).
-- Rollback: rollback.sql in this folder (Prisma ignores it; run it by hand with psql).

-- The driver's closure rules (END_JOB) stay the driver's now that one action serves the driver and the timer.
UPDATE "policy_definitions"
   SET "match" = "match" || '{"actor": {"in": ["DRIVER"]}}'::jsonb, "updated_at" = now()
 WHERE "action" = 'END_JOB' AND "enforcement" = 'GATEWAY' AND NOT ("match" ? 'actor');

-- The timer's closure rules (AUTO_CLOSE_JOB) apply to the system only.
UPDATE "policy_definitions"
   SET "match" = "match" || '{"actor": "SYSTEM"}'::jsonb, "updated_at" = now()
 WHERE "action" = 'AUTO_CLOSE_JOB' AND "enforcement" = 'GATEWAY' AND NOT ("match" ? 'actor');

UPDATE "policy_definitions"
   SET "action" = CASE "action"
     WHEN 'REQUEST_JOB' THEN 'request.submit'
     WHEN 'CANCEL_JOB_REQUEST' THEN 'request.withdraw'
     WHEN 'ACCEPT_OFFER' THEN 'offer.accept'
     WHEN 'DECLINE_OFFER' THEN 'offer.decline'
     WHEN 'START_JOB' THEN 'trip.start'
     WHEN 'APPLY_MILESTONE' THEN 'trip.milestone'
     WHEN 'VERIFY_DOCUMENT' THEN 'trip.verifyDocument'
     WHEN 'REPORT_INCIDENT' THEN 'incident.report'
     WHEN 'REQUEST_CANCELLATION' THEN 'trip.requestCancellation'
     WHEN 'END_JOB' THEN 'job.requestClosure'
     WHEN 'AUTO_CLOSE_JOB' THEN 'job.requestClosure'
     WHEN 'COMPLETE_JOB' THEN 'job.complete'
     WHEN 'RESOLVE_INCIDENT' THEN 'incident.resolve'
     WHEN 'CREATE_JOB' THEN 'job.create'
     WHEN 'INBOUND_MESSAGE' THEN 'conversation.receive'
   END,
   "updated_at" = now()
 WHERE "action" IN (
   'REQUEST_JOB', 'CANCEL_JOB_REQUEST', 'ACCEPT_OFFER', 'DECLINE_OFFER', 'START_JOB', 'APPLY_MILESTONE', 'VERIFY_DOCUMENT', 'REPORT_INCIDENT',
   'REQUEST_CANCELLATION', 'END_JOB', 'AUTO_CLOSE_JOB', 'COMPLETE_JOB', 'RESOLVE_INCIDENT', 'CREATE_JOB', 'INBOUND_MESSAGE'
 );

-- Every running backend re-reads the policies.
UPDATE "policy_store_meta" SET "version" = "version" + 1, "updated_at" = now();
