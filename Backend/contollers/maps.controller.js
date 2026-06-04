import { validationResult } from "express-validator";
import * as mapService from "../services/maps.service.js";

export const getCoordinates = async (req, res) => {
    try {
        const coordinates = await mapService.getAddressCoordinate(req.query);
        res.status(200).json(coordinates);
    } catch (err) {
        res.status(500).json({ message: "Server error in map controller" });
    }
};

export const getDistanceTime = async (req, res) => {
    try {
        const error = validationResult(req);
        if (!error.isEmpty()) return res.status(400).json({ message: "Invalid input", errors: error.array() });
        const { origins, destinations } = req.query;
        const distanceTime = await mapService.getDistanceTime(origins, destinations);
        res.status(200).json(distanceTime);
    } catch (err) {
        res.status(500).json({ message: "Server error in map controller" });
    }
};

export const getReverseGeocode = async (req, res) => {
    try {
        const error = validationResult(req);
        if (!error.isEmpty()) return res.status(400).json({ message: "Invalid input", errors: error.array() });
        const { lat, lng } = req.query;
        const result = await mapService.getReverseGeocode(lat, lng);
        res.status(200).json(result);
    } catch (err) {
        res.status(500).json({ message: "Server error in map controller" });
    }
};

export const getAutoCompleteSuggestions = async (req, res) => {
    try {
        const error = validationResult(req);
        if (!error.isEmpty()) return res.status(400).json({ message: "Invalid input", errors: error.array() });
        const { input } = req.query;
        const suggestions = await mapService.getAutoCompleteSuggestions(input);
        res.status(200).json(suggestions);
    } catch (err) {
        res.status(500).json({ message: "Server error in map controller" });
    }
};
