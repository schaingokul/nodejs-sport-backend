import mongoose from "mongoose";

const conversationSchema = mongoose.Schema(
    {
        type: { type: String, enum: ['group', 'one-on-one'], required: true }, 
        participants: [{ type: String, required: true }],
        groupName: { type: String },
        createdAt: { type: Date, default: Date.now },
    },
    {timestamps: true});

    const Conversation = mongoose.model("Conversation", conversationSchema);

    export default Conversation;