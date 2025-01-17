import mongoose from "mongoose";

const MessageSchema = mongoose.Schema(
    {
        cid: {type:  String, require: true},
        sender: {type:String, require:true},
        message: { type: String},
        attachments: [
            {
              url: { type: String, }, // URL of the file (image, video, etc.)
              type: { type: String, enum: ["image", "video", "audio", "file"], required: true }, // Type of the attachment
              ext:{type: String},
              size: { type: Number }, // Size of the file in bytes (optional)
              uploadedAt: { type: Date, default: Date.now }, // Timestamp of upload
            },
          ],
        readBy: [
                  {
                    userId: { type: String}, // User who read the message
                    readAt: { type: Date, default: Date.now }, // Timestamp when the user read the message
                  }
                ],
        deletedBy: 
                [ 
                    {
                        userId: { type: String }, // User who deleted the message
                        deletedAt: { type: Date, default: Date.now }, // Timestamp of deletion
                    }
                ],
        deleted: { type: Boolean, default: false }
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
// //Schema 
// {
//     cid: { type: String, required: true }, // Link to Conversation schema
//     sender: { type: String, required: true }, // ID of the sender
//     message: { type: String, required: true }, // Message content
//     readBy: [
//       {
//         userId: { type: String, required: true }, // User who read the message
//         readAt: { type: Date, default: Date.now }, // Timestamp when the user read the message
//       }
//     ],
//     deletedBy: [ // Track users who have deleted the message
//       {
//         userId: { type: String, required: true }, // User who deleted the message
//         deletedAt: { type: Date, default: Date.now }, // Timestamp of deletion
//       }
//     ],
//     deleted: { type: Boolean, default: false }, // Flag to indicate if message is deleted
//   },
//   { timestamps: true }
// 
