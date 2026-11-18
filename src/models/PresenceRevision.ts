import mongoose from "mongoose";
const schema = new mongoose.Schema({ _id: String, revision: String });
export const PresenceRevision = mongoose.models.PresenceRevision || mongoose.model("PresenceRevision", schema);
