import { Router } from 'express';
import { fetchNDVI } from '../integrations/ndviService.js';

const router = Router();

router.get('/', async (req, res, next) => {
  try {
    const lat = parseFloat(req.query.lat);
    const lng = parseFloat(req.query.lng);
    const dateQuery = req.query.date || new Date().toISOString();

    if (isNaN(lat) || isNaN(lng)) {
      return res.status(400).json({ error: 'Valid lat and lng required' });
    }

    const ndviResult = await fetchNDVI(lat, lng, dateQuery);
    return res.status(200).json(ndviResult);
  } catch (error) {
    next(error);
  }
});

export default router;
