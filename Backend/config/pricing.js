// Tunable pricing table. Could later be moved to the database / admin panel.
// Amounts are in INR. distance in metres, duration in seconds at compute time.
module.exports = {
    local: {
        base:    { car: 50, auto: 30, motorcycle: 20 },
        perKm:   { car: 12, auto: 9,  motorcycle: 6 },
        perMin:  { car: 2,  auto: 1.5, motorcycle: 1 },
        minFare: { car: 60, auto: 40, motorcycle: 25 },
    },
    intercity: {
        base:    { car: 300, auto: 200, motorcycle: 120 },
        perKm:   { car: 14,  auto: 11,  motorcycle: 8 },
        perMin:  { car: 0,   auto: 0,   motorcycle: 0 },
        minFare: { car: 800, auto: 600, motorcycle: 400 },
        driverAllowance: 250,
    },
    interstate: {
        base:    { car: 500, auto: 350, motorcycle: 200 },
        perKm:   { car: 16,  auto: 13,  motorcycle: 10 },
        perMin:  { car: 0,   auto: 0,   motorcycle: 0 },
        minFare: { car: 1500, auto: 1000, motorcycle: 700 },
        driverAllowance: 500,
        interStateTaxPerTrip: 400,    // permit/border estimate (simplified)
    },
    tollPerKmInterCity: 1.2,          // rough toll estimate for non-local trips
    nightSurchargePct: 0.10,          // applied between 22:00 and 05:00
    platformFeePct: 0.05,
    surge: { enabled: true, max: 2.0 },
};
