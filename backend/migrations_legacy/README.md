# Legacy SQL migrations (history only)

These 16 files were applied by the old `scripts/migrate.js` and tracked in `schema_migrations`.
They are **not run any more**. They were joined, unchanged, into
`prisma/migrations/0_init/migration.sql`, and all new schema changes go through Prisma.

Do not edit these files.

For a database that already has these tables (created by the old runner), mark the baseline as
applied once, instead of running it:

    npx prisma migrate resolve --applied 0_init

The old `schema_migrations` table can stay; nothing reads it.
