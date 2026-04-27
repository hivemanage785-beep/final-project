import express from 'express';
import { traceScore } from '../controllers/traceController.js';

const router = express.Router();

router.get('/', async (req, res, next) => {
    try {
        const lat = parseFloat(req.query.lat);
        const lng = parseFloat(req.query.lng);
        const month = parseInt(req.query.month, 10);
        
        if (isNaN(lat) || isNaN(lng) || isNaN(month)) {
            return res.status(400).json({ success: false, error: "Invalid lat, lng, or month parameters" });
        }

        const trace = await traceScore(lat, lng, month);
        res.json({ success: true, data: trace });
    } catch (e) {
        next(e);
    }
});

export default router;
