const { NotFoundError } = require('../errors');

// Any 8-4-4-4-12 hex id: seeded ids such as 0000...0001 are valid in the database but not RFC UUIDs.
const ID_SHAPE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Make every route of `router` that has an `:id` parameter answer 404 unless that record belongs
 * to the caller's organization. `sql` takes ($1 = id, $2 = organizationId) and returns a row when
 * the record is theirs. A record of another organization is indistinguishable from a missing one.
 */
function scopeIdToOrganization(router, { query, sql, notFoundMessage }) {
  router.param('id', async (req, _res, next, id) => {
    try {
      if (!ID_SHAPE.test(id)) throw new NotFoundError(notFoundMessage);
      const { rows } = await query(sql, [id, req.actor.organizationId]);
      if (rows.length === 0) throw new NotFoundError(notFoundMessage);
      next();
    } catch (err) {
      next(err);
    }
  });
}

module.exports = { scopeIdToOrganization, ID_SHAPE };
