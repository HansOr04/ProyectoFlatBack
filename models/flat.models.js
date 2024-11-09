import mongoose from "mongoose";
const flatSchema = new mongoose.Schema({
    city: { type: String, required: true },
    streetName: { type: String, required: true },
    streetNumber: { type: String, required: true },
    areaSize: { type: Number, required: true },
    hasAC: { type: Boolean, required: true },
    yearBuilt: { type: Number, required: true },
    rentPrice: { type: Number, required: true },
    dateAvailable: { type: Date, required: true },
    atCreated: {
        type: Date,
        default: Date.now
    },
    atUpdated: {
        type: Date,
        default: Date.now
    },
    owner: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "users",
        required: true
    },

});

export const Flat = mongoose.model("flats", flatSchema);