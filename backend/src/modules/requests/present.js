const quantityText = (row) => (row.quantity != null ? `${row.quantity} ${row.unit ?? ''}`.trim() : null);

const toRequestLine = (r) => ({
  id: r.id, status: r.status, requestedAt: r.requested_at, reviewedAt: r.reviewed_at,
  job: { id: r.job_id, jobNumber: r.job_number, cargo: r.cargo_description, pickup: r.pickup, delivery: r.delivery, quantity: quantityText(r), pickupAt: r.pickup_at, status: r.job_status },
  driver: { id: r.driver_id, name: r.driver_name, phone: r.driver_phone ?? '', verified: r.verification_status === 'VERIFIED' },
});

const toHistoryLine = (r) => ({
  id: r.id, type: r.type, decision: r.decision, decidedAt: r.decided_at,
  job: { id: r.job_id, jobNumber: r.job_number, cargo: r.cargo, pickup: r.pickup, delivery: r.delivery },
  driver: { id: r.driver_id, name: r.driver_name ?? 'Unassigned', phone: r.driver_phone ?? '', verified: r.verification_status === 'VERIFIED' },
});

module.exports = { toRequestLine, toHistoryLine };
