import mongoose from 'mongoose'

const AdminSchema = new mongoose.Schema({
  name: String,
  image: String,
  email: { type: String, unique: true },
  password: String,
})

export const Admin = mongoose.models.admins || mongoose.model('admins', AdminSchema)
