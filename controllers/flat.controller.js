import { Flat } from "../models/flat.models.js";
const createFlat = (req, res) => {
    try {
        const flat= new Flat(req.body);
        flat.save();
        res.status(201).json(flat);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
};
const getFlats = async (req, res) => {
    try {
        const flats = await Flat.find();
        res.status(200).json(flats);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
};
const getFlatById = (req, res) => {
    try {
        const flat = Flat.findById(req.params.id);
        res.status(200).json(flat);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
};
const updateFlat = (req, res) => {
    try {
        const flat = Flat.findByIdAndUpdate(req.params.id, req.body, { new: true });
        res.status(200).json(flat);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
};
const deleteFlat = (req, res) => {
    try {
        const flat = Flat.findByIdAndDelete(req.params.id);
        res.status(200).json(flat);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
};

export { createFlat, getFlats, getFlatById, updateFlat, deleteFlat };