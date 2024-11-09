import express from "express";

import { createFlat, deleteFlat, getFlatById, getFlats, updateFlat } from "../controllers/flat.controller.js";

const router = express.Router();

router.post('/',createFlat);
router.get("/",getFlats);
router.get("/:id",getFlatById);
router.put("/:id",updateFlat);
//El delete es un borrado logico
router.delete("/:id",deleteFlat);


export default router;