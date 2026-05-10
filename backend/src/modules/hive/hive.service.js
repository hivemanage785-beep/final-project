import { Hive } from './hive.model.js';

const formatDoc = (doc) => {
  const obj = doc.toObject ? doc.toObject() : doc;
  obj.id = obj._id ? obj._id.toString() : obj.id;
  delete obj._id;
  delete obj.__v;
  return obj;
};

export const hiveService = {
  async getHives(userId, queryUid) {
    const query = [];
    query.push({ ownerId: userId });
    if (queryUid && queryUid !== userId) query.push({ uid: queryUid });

    const snapshot = await Hive.find({ $or: query });
    return snapshot.map(formatDoc);
  },

  async createHive(payload, userId) {
    const newHive = await Hive.create({ ...payload, ownerId: userId });
    return formatDoc(newHive);
  },

  async updateHive(id, userId, payload) {
    const updated = await Hive.findOneAndUpdate(
      { _id: id, $or: [{ ownerId: userId }, { uid: userId }] },
      payload,
      { returnDocument: 'after' }
    );
    if (!updated) return null;
    return formatDoc(updated);
  },

  async deleteHive(id, userId) {
    const deleted = await Hive.findOneAndDelete(
      { _id: id, $or: [{ ownerId: userId }, { uid: userId }] }
    );
    if (!deleted) return null;
    return { id };
  }
};
