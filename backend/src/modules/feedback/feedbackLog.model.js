import mongoose from 'mongoose';

const FeedbackLogSchema = new mongoose.Schema({
  lat: { type: Number, required: true },
  lng: { type: Number, required: true },
  temperature: { type: Number, required: true },
  humidity: { type: Number, required: true },
  rainfall: { type: Number, required: true },
  predicted_score: { type: Number, required: true },
  actual_outcome: { type: String, required: true },
  uid: { type: String, required: true },
  created_at: { type: Date, default: Date.now }
});

const FeedbackLog = mongoose.model('FeedbackLog', FeedbackLogSchema, 'feedback_logs');
export default FeedbackLog;
