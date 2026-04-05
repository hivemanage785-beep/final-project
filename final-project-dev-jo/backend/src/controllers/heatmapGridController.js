import { GeoTile } from '../models/GeoTile.js';

/**
 * GET /api/heatmap-grid
 * Returns a dense grid of scores for high-resolution heatmap rendering.
 * Uses precomputed Tile data cached in the DB.
 */
export async function getHeatmapGrid(req, res, next) {
  try {
    const { 
      lat_min, lat_max, 
      lng_min, lng_max, 
      month = new Date().getMonth() + 1 
    } = req.query;

    if (!lat_min || !lat_max || !lng_min || !lng_max) {
      return res.status(400).json({ 
        success: false, 
        message: 'Missing required bounding box: lat_min, lat_max, lng_min, lng_max' 
      });
    }

    const query = {
      month: parseInt(month),
      lat: { $gte: parseFloat(lat_min), $lte: parseFloat(lat_max) },
      lng: { $gte: parseFloat(lng_min), $lte: parseFloat(lng_max) }
    };

    // Query precomputed grid points from DB (this acts as our high-perf cache)
    const tiles = await GeoTile.find(query)
      .select('lat lng mlScore')
      .lean();

    // Transform into dense matrix/array format requested
    const gridPoints = tiles
      .filter(t => t.mlScore !== null) // Filter out incomplete tiles
      .map(t => [t.lat, t.lng, t.mlScore]);

    // Safety: If DB is empty, return empty array (UI should show fallback)
    // The tileScheduler will be populating this in background.
    
    res.status(200).json({ 
      success: true, 
      count: gridPoints.length,
      data: gridPoints 
    });
  } catch (error) {
    next(error);
  }
}
