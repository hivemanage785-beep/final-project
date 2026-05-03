import axios from 'axios';

export async function getSuggestions(req, res, next) {
  try {
    const { lat, lng, month } = req.query;
    
    // Generate 5 points: the center, and 4 points around it (±0.02 deg ~ 2.2km)
    const offsets = [
      { dLat: 0, dLng: 0 },
      { dLat: 0.02, dLng: 0 },
      { dLat: -0.02, dLng: 0 },
      { dLat: 0, dLng: 0.02 },
      { dLat: 0, dLng: -0.02 }
    ];

    const points = offsets.map(offset => ({
      lat: Number(lat) + offset.dLat,
      lng: Number(lng) + offset.dLng,
      month: Number(month)
    }));

    const port = process.env.PORT || 3001;
    const url = `http://localhost:${port}/api/score`;

    const results = [];

    // Evaluate each point
    await Promise.all(points.map(async (point) => {
      try {
        const response = await axios.post(url, point, { timeout: 10000 });
        if (response.data && response.data.success) {
          const data = response.data.data;
          results.push({
            lat: point.lat,
            lng: point.lng,
            score: data.score,
            suitability_label: data.suitability_label || 'Unknown'
          });
        }
      } catch (err) {
        // Ignore failures for individual points (e.g., out of region)
      }
    }));

    // Sort by score descending
    results.sort((a, b) => b.score - a.score);

    // Return top 3
    res.json(results.slice(0, 3));
  } catch (err) {
    next(err);
  }
}
