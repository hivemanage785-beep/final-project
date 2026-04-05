import { Inspection } from '../models/Inspection.js';

const formatDoc = (doc) => {
  const obj = doc.toObject ? doc.toObject() : doc;
  obj.id = obj._id ? obj._id.toString() : obj.id;
  delete obj._id;
  delete obj.__v;
  return obj;
};

export async function getInspections(req, res, next) {
  try {
    const { hive_id } = req.query;
    if (!hive_id) return res.status(400).json({ success: false, error: 'hive_id required' });

    const snapshot = await Inspection.find({ hive_id, uid: req.user.id });
    const inspections = snapshot.map(formatDoc);

    res.status(200).json({ success: true, data: inspections });
  } catch (error) {
    next(error);
  }
}

export async function createInspection(req, res, next) {
  try {
    const payload = req.body;
    
    const newDoc = await Inspection.create({ ...payload, uid: req.user.id });
    
    res.status(201).json({ success: true, data: formatDoc(newDoc) });
  } catch (error) {
    next(error);
  }
}

