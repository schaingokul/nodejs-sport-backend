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

/*
join_chat
{
    "type":"one-on-one",
    "participants":["upffA137Z3Fw5hRlkBGxn", "ZWU-WoM0s2wwSxsOdxip_"]
}

send_message
{
    "cid":"676e44412d67b1ccc192377b",
    "sender":"ZWU-WoM0s2wwSxsOdxip_",
    "message": "Hello EveryOne"
}
*/