/** The driver as the dashboard has always received it. Takes a row from repo.js. */
function presentDriver(row) {
  return {
    id: row.id,
    name: row.name,
    phone: row.phone ?? '',
    verified: row.verificationStatus === 'VERIFIED',
    status: row.status,
    currentJob: row.currentJob ?? null,
    completedTrips: Number(row.completedTrips ?? 0),
    vehicleType: row.vehicleType ?? null,
    licensePlate: row.licensePlate ?? null,
  };
}

module.exports = { presentDriver };
