import mongoose from "mongoose";

const MessageSchema = mongoose.Schema(
    {
        cid: {type:  String, require: true},
        sender: {type:String, require:true},
        message: { type: String, required: true },
        timestamp: { type: Date, default: Date.now },
    },
    {timestamps: true});

const Message = mongoose.model('Message' , MessageSchema );
export default Message;