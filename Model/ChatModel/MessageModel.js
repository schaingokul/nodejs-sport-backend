import mongoose from "mongoose";

const MessageSchema = mongoose.Schema({
    senderId: { type: mongoose.Schema.Types.ObjectId, ref: "UserDetailsModel", required: true },
    reciverId: { type: mongoose.Schema.Types.ObjectId, ref: "UserDetailsModel", required: true },
    message: { type: String, required: true }
},{timestamps: true});

const Message = mongoose.model('Message' , MessageSchema );
export default Message;