import mongoose from "mongoose";

const conversationSchema = mongoose.Schema(
    {
        participants: [
            {
                type: mongoose.Schema.Types.ObjectId, ref: "UserDetailsModel", required: true
            }
        ],
        message:[
            {
                type: mongoose.Schema.Types.ObjectId, ref: "Message", default: []
            }
        ]
    },
    {timestamps: true});

    const Conversation = mongoose.model("Conversation", conversationSchema);

    export default Conversation;