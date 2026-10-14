/** The shapes the dashboard reads. Rows come from raw SQL, so they keep their snake_case column names. */

const quantityText = (row) => (row.quantity != null ? `${row.quantity} ${row.unit ?? ''}`.trim() : null);
const fullAddress = (row, stop) => {
  const parts = [row[stop], row[`${stop}_address`], row[`${stop}_city`]].map(value => String(value ?? '').trim()).filter(Boolean);
  return parts.filter((part, index) => !parts.slice(0, index).some(earlier => earlier.toLowerCase().includes(part.toLowerCase()))).join(', ') || null;
};

/** One line of the jobs list (also what an action answers with after it changes a job). */
const toJobSummary = (r) => ({
  id: r.id, jobNumber: r.job_number, status: r.current_status, cargo: r.cargo_description, pickup: r.pickup, delivery: r.delivery,
  quantity: quantityText(r), pickupAt: r.pickup_at, deliveryAt: r.delivery_at, driver: r.driver_name,
  cancellationReason: r.cancellation_reason ?? null, assignmentStatus: r.assignment_status ?? null,
});

const toLiveJob = (r) => ({
  id: r.id, jobNumber: r.job_number, status: r.current_status, cargo: r.cargo_description, pickup: r.pickup, delivery: r.delivery,
  quantity: quantityText(r), pickupAt: r.pickup_at, deliveryAt: r.delivery_at, driver: r.driver_name, driverPhone: r.driver_phone ?? null,
  cancellationReason: r.cancellation_reason ?? null, lastEventType: r.last_event_type ?? null, lastEventAt: r.last_event_at ?? null,
  openIncidents: r.open_incidents ?? 0,
  pickupAddress: fullAddress(r, 'pickup'), deliveryAddress: fullAddress(r, 'delivery'),
  previousStatus: r.previous_status ?? null, milestoneChangedAt: r.milestone_changed_at ?? null,
});

function toJobDetail({ job, stops, items, assignment }) {
  return {
    id: job.id, jobNumber: job.job_number, status: job.current_status, cargo: job.cargo_description, specialInstructions: job.special_instructions,
    pickupAt: job.pickup_at, deliveryAt: job.delivery_at, completedAt: job.completed_at, pickupCode: job.pickup_code ?? null,
    deliveryCode: job.delivery_code ?? null, pickupVerifiedAt: job.pickup_verified_at, deliveryVerifiedAt: job.delivery_verified_at,
    pickupActualAt: job.pickup_actual_at ?? null, deliveryActualAt: job.delivery_actual_at ?? null,
    pickupDelayReason: job.pickup_delay_reason ?? null, deliveryDelayReason: job.delivery_delay_reason ?? null,
    stops: stops.map((s) => ({ type: s.stop_type, name: s.name, address: [s.address_line_1, s.city].filter(Boolean).join(', '), latitude: s.latitude ?? null, longitude: s.longitude ?? null })),
    items: items.map((i) => ({
      description: i.description, quantity: i.planned_quantity != null ? `${i.planned_quantity} ${i.unit ?? ''}`.trim() : null,
      quantityValue: i.planned_quantity != null ? Number(i.planned_quantity) : null, unit: i.unit ?? null,
    })),
    assignment: assignment
      ? {
        id: assignment.id, status: assignment.status, assignedAt: assignment.assigned_at, acceptedAt: assignment.accepted_at,
        startedAt: assignment.started_at, completionSubmittedAt: assignment.completion_submitted_at, cancellationReason: assignment.cancellation_reason,
        driver: { id: assignment.driver_id, name: assignment.driver_name, phone: assignment.driver_phone ?? '' },
      }
      : null,
  };
}

const toTimelineEvent = (e) => ({
  id: e.id, type: e.event_type, status: e.event_status, data: e.event_data, confidence: e.confidence_score != null ? Number(e.confidence_score) : null,
  appliedAt: e.applied_at, time: e.created_at, sourceMessage: e.source_message,
});

module.exports = { toJobSummary, toLiveJob, toJobDetail, toTimelineEvent };
