-- Job request window as a dashboard-editable guardrail.
--
-- The window within which drivers can see and request jobs (and within which
-- automatic job offers are sent on publish) used to be hardcoded to 24 hours
-- in workflow.js / jobOffers.js. Seeding this row reproduces that behavior
-- exactly; managers can change the hours from the Guardrails page.

INSERT INTO guard_rules (organization_id, code, name, description, category, config, enabled, is_system) VALUES
    ('00000000-0000-0000-0000-000000000001',
     'JOB_REQUEST_WINDOW', 'Job request window (hours)',
     'Drivers only see and can only request jobs whose pickup is within this many hours from now. Publishing a job outside this window sends no automatic offers.',
     'TIMING', '{"hours": 24}', TRUE, TRUE)
ON CONFLICT (organization_id, code) DO NOTHING;
