const express=require("express")
const router=express.Router()
const authMiddleware=require("../middlewares/auth.middleware")
const mapContoller=require("../contollers/maps.controller")
const {query} =require("express-validator")

router.get("/get-coordinates",authMiddleware.authUser,mapContoller.getCoordinates)
router.get("/get-distance-time",
    query("origins").isString().isLength({min:3}),
    query("destinations").isString().isLength({min:3}),
    authMiddleware.authUser,
    mapContoller.getDistanceTime
)
router.get("/get-suggestions",
    query("input").isString().isLength({min:3}),
    authMiddleware.authUser,
    mapContoller.getAutoCompleteSuggestions
)
router.get("/reverse-geocode",
    query("lat").isFloat(),
    query("lng").isFloat(),
    authMiddleware.authUser,
    mapContoller.getReverseGeocode
)

module.exports=router;