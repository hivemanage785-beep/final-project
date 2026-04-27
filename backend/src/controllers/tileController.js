import Tile from '../models/Tile.js';
import { getTileBounds } from '../utils/tileUtils.js';

export const getTile = async (req, res) => {
  try {
    const z = parseInt(req.params.z, 10);
    const x = parseInt(req.params.x, 10);
    const y = parseInt(req.params.y, 10);
    const month = parseInt(req.query.month, 10);

    if (
      Number.isNaN(z) || Number.isNaN(x) || Number.isNaN(y) || Number.isNaN(month) ||
      z < 0 || x < 0 || y < 0 || month < 1 || month > 12
    ) {
      return res.status(400).json({ error: 'Invalid parameters' });
    }

    const tile = await Tile.findOne({ z, x, y, month }).sort({ gridSize: -1 }).lean();

    if (!tile || !tile.grid) {
      return res.status(404).json({ error: 'Tile not found' });
    }

    const bounds = getTileBounds(x, y, z);

    return res.json({
      data: tile.grid,
      bounds: [bounds.lng_min, bounds.lat_min, bounds.lng_max, bounds.lat_max]
    });
  } catch (error) {
    console.error("TILE ERROR:", error.message);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
};
