-- The guard_rules table was replaced by policies (settings and gateway rules). Its values were read once when policies were first seeded.
-- BEFORE running this on a database you keep, export the table: npm run db:export-guard-rules > guard_rules.json
-- Rollback: recreate the table from the "init" migration's definition and load guard_rules.json; nothing in the application reads it.
DROP TABLE IF EXISTS "guard_rules";
