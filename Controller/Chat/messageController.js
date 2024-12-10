import Conversation from "../../Model/ChatModel/Conversation.Model.js";
import Message from "../../Model/ChatModel/MessageModel.js";

export const  sendMessage = async(req,res) => {
    const {id:senderId} = req.user //senderId
    const {id:reciverId} = req.params
    const {message} = req.body
    try {
        let conversation = await Conversation.findOne({
            participants: {$all:[senderId, reciverId]},
        });

        if(!conversation){
            conversation = await Conversation.create({
                participants: [senderId, reciverId],
            })
        }
        const newMessage = new Message({
            senderId,
            reciverId,
            message,
        })
        if(message){
            conversation.message.push(newMessage._id)
        }
        // await conversation.save(); await newMessage.save();
        await Promise.all([conversation.save(), newMessage.save()]);

        res.status(200).json({message: "Message Sent Succefully", newMessage});
    } catch (error) {
        console.log("Error in SendMessage Controllers : ", error.message);
        res.status(200).json({status: false, message: "Internal Server Error on SendMessage Route"})
    }
};

export const getMessage = async(req,res) => {
    const {id: userToChatId } = req.params;
    const {id: senderId} = req.user
    try {
        const conversation = await Conversation.findOne({
            participants: {$all :[senderId, userToChatId]},
        }).populate("message");
        if(!conversation)return res.status(200).json([]);
        const message = conversation.message;
        res.status(200).json({status: true, message })
    } catch (error) {
        console.log(error.message)
        res.status(200).json({status: false, Message: `Internal Server error  GetMessage Route ${error.message}` })
    }
}