import { Hive } from '../models/Hive.js';

const formatDoc = (doc) => {
  const obj = doc.toObject ? doc.toObject() : doc;
  obj.id = obj._id ? obj._id.toString() : obj.id;
  delete obj._id;
  delete obj.__v;
  return obj;
};

export async function getHives(req, res, next) {
  try {
    const uid = req.query.uid || req.user.id;

    const snapshot = await Hive.find({ $or: [{ ownerId: req.user.id }, { uid }, { uid: 'demo-uid-fixed-001' }] });
    const hives = snapshot.map(formatDoc);

    res.status(200).json({ success: true, data: hives });
  } catch (error) {
    next(error);
  }
}

export async function createHive(req, res, next) {
  try {
    const payload = req.body;
    
    const newHive = await Hive.create({ ...payload, ownerId: req.user.id });
    
    res.status(201).json({ success: true, data: formatDoc(newHive) });
  } catch (error) {
    next(error);
  }
}

export async function updateHive(req, res, next) {
  try {
    const { id } = req.params;
    const payload = req.body;
    
    const updated = await Hive.findOneAndUpdate(
      { _id: id, $or: [{ ownerId: req.user.id }, { uid: req.user.id }] },
      payload,
      { new: true }
    );
    
    if (!updated) return res.status(404).json({ success: false, error: 'Hive not found or not owned by you' });

    res.status(200).json({ success: true, data: formatDoc(updated) });
  } catch (error) {
    next(error);
  }
}

export async function deleteHive(req, res, next) {
  try {
    const { id } = req.params;
    
    const deleted = await Hive.findOneAndDelete(
      { _id: id, $or: [{ ownerId: req.user.id }, { uid: req.user.id }] }
    );
    
    if (!deleted) return res.status(404).json({ success: false, error: 'Hive not found or not owned by you' });

    res.status(200).json({ success: true, data: { id } });
  } catch (error) {
    next(error);
  }
}

