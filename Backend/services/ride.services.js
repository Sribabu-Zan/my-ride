const rideModel = require("../db/Models/ride.model");
const mapService = require("../services/maps.service");
const { classifyTrip, computeAllFares } = require("./fare.service");
const crypto = require('crypto');

// Returns vehicle fares (backward-compatible top-level keys) PLUS the trip
// classification, distance/duration and fare breakup for richer clients.
async function getFare(pickup, destination) {
    if (!pickup || !destination) {
        throw new Error("Missing pickup or destination");
    }

    const origin = await mapService.getGeocodeDetailed(pickup);
    const dest = await mapService.getGeocodeDetailed(destination);
    const tripType = classifyTrip(origin, dest);

    const { distance, duration } = await mapService.getRouteByCoords(origin, dest);
    const { fares, breakup } = computeAllFares({ tripType, distanceM: distance, durationS: duration });

    return {
        ...fares,            // car, auto, motorcycle (kept for the web app)
        fares,               // same, namespaced for new clients
        tripType,            // local | intercity | interstate
        distance,            // metres
        duration,            // seconds
        breakup,
    };
}
module.exports.getFare = getFare;
module.exports.createRide = async ({ user, pickup, destination, vehicleType, bookingMode = "now", scheduledAt }) => {

    if(!user || !pickup || !destination || !vehicleType){
        throw new Error("Missing user, pickup, destination or vehicle type")
        }
    const fareInfo = await getFare(pickup, destination);

    const ride = rideModel.create({
        user,
        pickup,
        destination,
        otp: getOTP(6),
        fare: fareInfo[vehicleType],
        vehicleType,
        tripType: fareInfo.tripType,
        distance: fareInfo.distance,
        duration: fareInfo.duration,
        bookingMode,
        scheduledAt: bookingMode === "scheduled" ? scheduledAt : undefined,
    });
    return ride;
};
function getOTP(num){
    const otp = crypto.randomInt(Math.pow(10, num - 1), Math.pow(10, num)).toString();
    return otp;
}
module.exports.confirmRide=async (rideId,captainId)=>{
    if(!rideId ){
        throw new Error("Missing ride id")
    }
    await rideModel.findOneAndUpdate({_id:rideId},{status:"accepted",
        captain:captainId
    })
    const ride=await rideModel.findOne({_id:rideId}).populate("user").populate("captain").select("+otp")
    if(!ride){
        throw new Error("Ride not found")
    }
    return ride
}
module.exports.startRide = async ({ rideId, otp, captain }) => {
    if (!rideId || !otp) {
        throw new Error('Ride id and OTP are required');
    }

    const ride = await rideModel.findOne({
        _id: rideId
    }).populate('user').populate('captain').select('+otp');

    if (!ride) {
        throw new Error('Ride not found');
    }

    if (ride.status !== 'accepted') {
        throw new Error('Ride not accepted');
    }

    if (ride.otp !== otp) {
        throw new Error('Invalid OTP');
    }

    await rideModel.findOneAndUpdate({
        _id: rideId
    }, {
        status: 'ongoing'
    })
    return ride;
}
module.exports.endRide = async ({rideId,captain})=>{
    if(!rideId){
        throw new Error("Missing ride id")
    }
    const ride=await rideModel.findOne({_id:rideId}).populate("user").populate("captain").select("+otp")
    if(!ride){
        throw new Error("Ride not found")
    }
    if(ride.status!=="ongoing"){
        throw new Error("Ride not ongoing")
    }
    await rideModel.findOneAndUpdate({_id:rideId},{status:"completed"})
    return ride
       
    
        
}

module.exports.getFare = getFare;