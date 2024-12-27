import express from 'express';
import protectRoute from '../../middleware/ProtectRoute.js';
import { chatSearch } from '../../Controller/Chat/userAppController.js';
import Message from '../../Model/ChatModel/MessageModel.js';
import Conversation from '../../Model/ChatModel/Conversation.Model.js';

const router = express.Router();

router.get("/search", protectRoute, chatSearch);

router.get("/chat-data/:id", async(req,res) => {
    const {id} = req.params;
    try {
        const viewMessages = await Message.find({cid: id}).sort({createdAt: -1});
        res.status(200).json({status: true, message: "Successfully Fetched", viewMessages})     
    } catch (error) {
        res.status(500).json({status: false, message: "Failed to Fetched"})     
    }
});

router.get("/create", async(req,res) => {
    try {
        const existingGroup = await Conversation.find()
        res.status(200).json({status: true, message: "group Created", viewMessages})   
    } catch (error) {
        res.status(500).json({status: false, message: "Failed to Fetched"})     
    }
});

export default router;