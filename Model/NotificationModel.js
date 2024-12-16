import mongoose from "mongoose";

// Define the notification schema
const notificationSchema = new mongoose.Schema({
    fromUserId: { type: mongoose.Schema.Types.ObjectId, ref: 'UserDetails', required: true },
    toUserId: { type: mongoose.Schema.Types.ObjectId, ref: 'UserDetails', required: true },
    message: { type: String, required: true },
    type: { type: String, required: true },
    isRead: {  type: Boolean, default: false },
    readAt: { type: Date },
    createdAt: { type: Date, default: Date.now }
});

const Notification = mongoose.model('Notification', notificationSchema);

export default Notification;