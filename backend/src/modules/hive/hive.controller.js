import { hiveService } from './hive.service.js';

export async function getHives(req, res, next) {
  try {
    if (!req.user || !req.user.id) {
      return res.status(401).json({ error: "Unauthorized" });
    }
    const hives = await hiveService.getHives(req.user.id);
    res.status(200).json(hives);
  } catch (error) {
    console.error("HIVES API ERROR:", {
      user: req.user?.id,
      message: error.message,
      stack: error.stack
    });
    res.status(500).json({ error: "Failed to fetch hives" });
  }
}

export async function createHive(req, res, next) {
  try {
    const newHive = await hiveService.createHive(req.body, req.user.id);
    res.status(201).json({ success: true, data: newHive });
  } catch (error) {
    next(error);
  }
}

export async function updateHive(req, res, next) {
  try {
    const updated = await hiveService.updateHive(req.params.id, req.user.id, req.body);
    if (!updated) return res.status(404).json({ success: false, error: 'Hive not found or not owned by you' });
    res.status(200).json({ success: true, data: updated });
  } catch (error) {
    next(error);
  }
}

export async function deleteHive(req, res, next) {
  try {
    const deleted = await hiveService.deleteHive(req.params.id, req.user.id);
    if (!deleted) return res.status(404).json({ success: false, error: 'Hive not found or not owned by you' });
    res.status(200).json({ success: true, data: deleted });
  } catch (error) {
    next(error);
  }
}

export async function getHiveTrace(req, res, next) {
  try {
    const trace = await hiveService.getHiveTrace(req.params.id);
    if (!trace) return res.status(404).json({ success: false, error: 'Hive not found' });
    res.status(200).json({ success: true, data: trace });
  } catch (error) {
    next(error);
  }
}

