import mongoose from "mongoose";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";

const captainSchema = new mongoose.Schema({
    fullname: {
        firstname: {
            type: String,
            required: true,
            minlength: [3, "Name must be atleast 3 characters long"]
        },
        lastname: {
            type: String,
            minlength: [3, "Name must be atleast 3 characters long"]
        }
    },
    email: {
        type: String,
        required: true,
        unique: true,
        lowercase: true,
        validate: {
            validator: function () {
                return /^([\w-\.]+@([\w-]+\.)+[\w-]{2,4})?$/.test(this.email);
            },
            message: "Invalid email"
        }
    },
    password: {
        type: String,
        required: true,
        select: false
    },
    socketId: {
        type: String
    },
    status: {
        type: String,
        enum: ["active", "inactive"],
        default: "inactive"
    },
    vehicle: {
        color: {
            type: String,
            required: true,
            minlength: [3, "Color must be atleast 3 characters long"]
        },
        plate: {
            type: String,
            required: true,
            minlength: [3, "Plate must be atleast 3 characters long"]
        },
        capacity: {
            type: Number,
            required: true,
            min: [1, "Capacity must be atleast 1"]
        },
        vehicleType: {
            type: String,
            required: true,
            enum: ["car", "motorcycle", "auto"]
        }
    },
    // Which trip categories this captain serves. Defaults to all so demo
    // matching works; real onboarding would let drivers opt in.
    serviceTypes: {
        type: [String],
        enum: ["local", "intercity", "interstate"],
        default: ["local", "intercity", "interstate"]
    },
    baseCity: { type: String },
    baseState: { type: String },
    // GeoJSON point [longitude, latitude] for $near matching.
    location: {
        type: {
            type: String,
            enum: ["Point"],
            default: "Point"
        },
        coordinates: {
            type: [Number],
            default: undefined
        }
    }
});

// 2dsphere index enables geospatial $near/$geoWithin queries.
captainSchema.index({ location: "2dsphere" });

captainSchema.methods.generateAuthToken = function () {
    return jwt.sign({ _id: this._id, email: this.email }, process.env.JWT_SECRET, { expiresIn: "24h" });
};

captainSchema.methods.comparePassword = async function (enteredPassword) {
    return await bcrypt.compare(enteredPassword, this.password);
};

captainSchema.statics.hashPassword = async function (password) {
    return await bcrypt.hash(password, 10);
};

const captainModel = mongoose.model("Captain", captainSchema);
export default captainModel;
