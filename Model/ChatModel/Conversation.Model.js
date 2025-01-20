import mongoose from "mongoose";

const conversationSchema = mongoose.Schema(
    {
        type: { type: String, enum: ['group', 'private'], required: true },
        createdBy: {type: String},
        participants: 
            [
                {
                    userId: {  type: String,  required: true  },
                    role: {  type: String,  enum: ['admin', 'member'],  required: true,  default: "member" },
                    joinDate: {  type: Date,  default: Date.now },
                    _id: false 
                  }   
            ],
        groupName: { type: String },
        url:{type: String},
        isDelete:{type:Boolean, default: "false"},
        createdAt: { type: Date, default: Date.now },
    },
    {timestamps: true});

conversationSchema.index({ type: 1, createdBy: 1 });
conversationSchema.index({ 'participants.userId': 1 });
conversationSchema.index({ groupName: 1 });

const Conversation = mongoose.model("Conversation", conversationSchema);

    export default Conversation;
// //Schema 
//     {
//         "type":{ type: String, enum: ['group', 'private'], required: true }
//         "participants": [
//           {
//             "userId": { type: String, required: true },
//             "role":{ type: String, enum: ['admin', 'member'], required: true , default: "member"}
//             "joinDate": 
//           }
//         ],
//         "groupName": "Developers Community",{ type: String },
//         "groupDp": "https://example.com/group-dp.png",{ type: String },
//         "createdAt": ISODate("2025-10-01T10:00:00Z"),
//         "updatedAt": ISODate("2025-10-01T10:00:00Z"),
//          "isDelete":{type:Boolean, default: "false"} 
//       }