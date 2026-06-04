import PRICING from "../config/pricing.js";

const VEHICLES = ["car", "auto", "motorcycle"];

/**
 * Classify a trip from two geocoded endpoints carrying { city, state }.
 * Different state => interstate; different city => intercity; else local.
 */
function classifyTrip(origin, destination) {
    if (origin.state && destination.state && origin.state !== destination.state) {
        return "interstate";
    }
    if (origin.city && destination.city && origin.city !== destination.city) {
        return "intercity";
    }
    return "local";
}

/**
 * Pure fare computation. Returns { total, breakup } for one vehicle type.
 */
function computeFare({ tripType, vehicleType = "car", distanceM, durationS, when = Date.now(), surge = 1 }) {
    const p = PRICING[tripType] || PRICING.local;
    const km = distanceM / 1000;
    const min = durationS / 60;

    const base = p.base[vehicleType] ?? p.base.car;
    const distanceFare = (p.perKm[vehicleType] ?? p.perKm.car) * km;
    const timeFare = (p.perMin[vehicleType] ?? 0) * min;
    const driverAllowance = p.driverAllowance ?? 0;
    const interStateTax = p.interStateTaxPerTrip ?? 0;
    const tollEstimate = tripType === "local" ? 0 : Math.round(km * PRICING.tollPerKmInterCity);

    let subtotal = base + distanceFare + timeFare + driverAllowance + interStateTax + tollEstimate;

    const hour = new Date(when).getHours();
    const isNight = hour >= 22 || hour < 5;
    const nightSurcharge = isNight ? subtotal * PRICING.nightSurchargePct : 0;

    const surgeMult = PRICING.surge.enabled ? Math.min(surge, PRICING.surge.max) : 1;
    subtotal = (subtotal + nightSurcharge) * surgeMult;

    const platformFee = subtotal * PRICING.platformFeePct;
    const total = Math.round(subtotal + platformFee);
    const minFare = p.minFare?.[vehicleType] ?? 0;

    return {
        total: Math.max(total, minFare),
        breakup: {
            base,
            distanceFare: Math.round(distanceFare),
            timeFare: Math.round(timeFare),
            driverAllowance,
            interStateTax,
            tollEstimate,
            nightSurcharge: Math.round(nightSurcharge),
            platformFee: Math.round(platformFee),
            surgeMultiplier: surgeMult,
        },
    };
}

/** Fares for every vehicle type at once. */
function computeAllFares(args) {
    const fares = {};
    let breakup = null;
    for (const v of VEHICLES) {
        const r = computeFare({ ...args, vehicleType: v });
        fares[v] = r.total;
        if (v === "car") breakup = r.breakup;
    }
    return { fares, breakup };
}

export { classifyTrip, computeFare, computeAllFares, VEHICLES };
