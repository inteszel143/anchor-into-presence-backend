import mongoose, { Schema } from 'mongoose';

const consent = new Schema({
  userId: { type: Schema.Types.ObjectId, required: true, unique: true },
  allowed: { type: Boolean, default: false }, anonId: { type: String, select: false },
  platform: String, expiresAt: Date,
}, { timestamps: true });
const job = new Schema({
  key: { type: String, required: true, unique: true },
  platform: { type: String, required: true }, transactionId: String,
  purchaseToken: { type: String, select: false },
  userId: Schema.Types.ObjectId, productId: String,
  state: { type: String, default: 'pending' }, attempts: { type: Number, default: 0 },
  nextAt: { type: Date, default: Date.now }, leaseUntil: Date, error: String,
}, { timestamps: true });
job.index({ state: 1, nextAt: 1 });
const payment = new Schema({
  key: { type: String, required: true, unique: true }, userId: Schema.Types.ObjectId,
  anonId: { type: String, select: false },
  platform: String, transactionId: String, originalId: { type: String, index: true },
  productId: String, plan: String, value: Number, currency: String, purchasedAt: Number,
  renewal: Boolean, production: Boolean,
  state: { type: String, default: 'pending' }, error: String,
}, { timestamps: true });
payment.index({ state: 1, createdAt: 1 });
export const AdConsent = mongoose.models.ad_consent || mongoose.model('ad_consent', consent);
export const AdJob = mongoose.models.ad_job || mongoose.model('ad_job', job);
export const AdPayment = mongoose.models.ad_payment || mongoose.model('ad_payment', payment);
