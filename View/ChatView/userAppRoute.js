import express from 'express';
import protectRoute from '../../middleware/ProtectRoute.js';
import { chatSearch } from '../../Controller/Chat/userAppController.js';
import Message from '../../Model/ChatModel/MessageModel.js';
import Conversation from '../../Model/ChatModel/Conversation.Model.js';
import UserDetails from '../../Model/UserModelDetails.js'

const router = express.Router();

router.get("/search", protectRoute, chatSearch);

router.post("/", async(req,res) => {
    let { type, createdBy, participants, groupName, url, cid } = req.body;
    try {
        if (!type || !["private", "group"].includes(type)) {
            return res.status(400).json({ message: "Invalid or missing conversation type." });
          }

        if (!Array.isArray(participants) || participants.length === 0) {
            return res.status(400).json({ message: "Participants must be a non-empty array." });
        }
      
        if (type === "private" && participants.length !== 2) {
            return res.status(400).json({ message: "Private conversations must have exactly two participants." });
        }

        let conversation;

        if (cid) {
            conversation = await Conversation.findById(cid);
        } else if (type === "private") {
            conversation = await Conversation.findOne({ type: 'private', "participants.userId":{ $all: participants.map(p => p.userId) }, });
        } else if (type === "group") {
            conversation = await Conversation.findOne({ type: 'group', "participants.userId": { $all: participants.map(p => p.userId) }, groupName: groupName });
        } else {
            throw new Error('Invalid conversation type');
        }

        console.log("Participants:", participants);

        // Create a new conversation if none exists
    if (!conversation) {
        if (!createdBy && type === "group") {
          return res.status(400).json({ message: "The creator's user ID is required to create a new conversation." });
        }
  
        // Correcting this part: Mapping participants with only userId and role
        conversation = new Conversation({
          type,
          createdBy,
          participants: participants.map((user) => ({
            userId: user.userId, // Only the userId and role are required here
            role: user.role || "member", // Default role is member
            joinDate: new Date(),
          })),
          groupName,
          url,
        });
  
        await conversation.save();
      }
      await Promise.all(
        conversation.participants.map(async (participant) => {
          try {
            const user = await UserDetails.findById(participant.userId).select("chatList");
            if (!user) {
              console.error(`User not found: ${participant.userId}`);
              return;
            }
  
            // Update or add the conversation in the user's chatList
            const existingChat = user.chatList.find((chat) => chat.cid === conversation._id.toString());
            if (existingChat) {
              existingChat.lastSeen = new Date();
            } else {
              user.chatList.push({ cid: conversation._id.toString(), lastSeen: new Date() });
            }
  
            await user.save();
          } catch (err) {
            console.error(`Failed to update chatList for user: ${participant.userId}`, err.message);
          }
        })
      );
        // Fetch participant details
        const participantDetails = await Promise.all(
            conversation.participants.map(async (participant) => {
                const user = await UserDetails.findById(participant.userId)
                return {
                    type: participant.role, 
                    profile: user?.userInfo?.Profile_ImgURL || null,
                    username: user?.userInfo?.Nickname || null,
                };
            })
        );

        res.status(200).json({status: true, message: "create private or group chat",conversation: { ...conversation.toObject(), participants: participantDetails } })   
    } catch (error) {
        console.log(error.message)
        res.status(500).json({status: false, message: "Failed to create private or group chat", error: error.message})     
    }
});

router.get("/chat-data/:id", async(req,res) => {
    const { page = 1, limit = 20 } = req.body; 
    const { cid } = req.params;
    try {
        const skip = (page - 1) * limit;

        const chat_data = await Message.find({ cid }).sort({ createdAt: -1 }).skip(skip).limit(parseInt(limit));
        const totalMessages = await Message.countDocuments({ cid });

        res.status(200).json({status: true, message: "Successfully Fetched", chat_data: {chat_data, 
            currentPage: parseInt(page), totalPages: Math.ceil(totalMessages / limit), totalMessages,}})     
    } catch (error) {
        res.status(500).json({status: false, message: "Failed to Fetched"})     
    }
});

router.get("/my-chat", async (req, res) => {
    let { userId, page = 1, limit = 20 } = req.query;
  
    try {
      // Validate userId
      if (!userId) {
        return res.status(400).json({ status: false, message: "User ID is required" });
      }
  
      const user = await UserDetails.findById(userId).select("chatList");
      if (!user) {
        return res.status(404).json({ status: false, message: "User not found" });
      }
  
      if (user.chatList.length === 0) {
        return res.status(200).json({ status: true, message: "No chats found", data: [] });
      }
  
      // Pagination logic
      page = parseInt(page);
      limit = parseInt(limit);
      const skip = (page - 1) * limit;
  
      const conversationIds = user.chatList.map((chat) => chat.cid);
  
      const conversations = await Conversation.find({ _id: { $in: conversationIds } })
        .sort({ updatedAt: -1 })
        .skip(skip)
        .limit(limit);
  
      const conversationsWithMessages = await Promise.all(
        conversations.map(async (conversation) => {
          const latestMessage = await Message.findOne({ cid: conversation._id }).sort({ createdAt: -1 });
  
          let participantsWithDetails = [];
          
          if (conversation.type === "private") {
            // Private: Find the participant that is not the current user
            const participant = conversation.participants.find(p => p.userId !== userId);
  
            if (participant) {
              const user = await UserDetails.findById(participant.userId);
              participantsWithDetails.push({
                userId: user._id,
                username: user?.userInfo?.Nickname || null,
                userProfile: user?.userInfo?.Profile_ImgURL || null,
                lastMessage: latestMessage ? latestMessage.message : null,
                latestMessageTimestamp: latestMessage ? latestMessage.createdAt : null,
              });
            }
          } else if (conversation.type === "group") {
            // Group: Use group name and profile for all participants, last message is null
            participantsWithDetails = conversation.participants.map(() => ({
              userId: null,
              username: conversation.groupName,  // Use group name for username
              userProfile: conversation.url,     // Use group URL as profile image
              lastMessage: null,                 // Group messages don't show the last message here
              latestMessageTimestamp: null,      // Group message timestamp is null
            }));
          }
  
          return {
            _id: conversation._id,
            type: conversation.type,
            groupname: conversation.type === "group" ? conversation.groupName : null,
            groupprofile: conversation.type === "group" ? conversation.url : null,
            username: conversation.type === "private" ? participantsWithDetails[0]?.username : null,
            userprofile: conversation.type === "private" ? participantsWithDetails[0]?.userProfile : null,
            lastMessage: conversation.type === "private" ? participantsWithDetails[0]?.lastMessage : null,
            latestMessageTimestamp: conversation.type === "private" ? participantsWithDetails[0]?.latestMessageTimestamp : null,
            participants: participantsWithDetails,
          };
        })
      );
  
      const totalConversations = conversationIds.length;
  
      res.status(200).json({
        status: true,
        message: "Successfully fetched user's chat list",
        data: {
          conversations: conversationsWithMessages,
          currentPage: page,
          totalPages: Math.ceil(totalConversations / limit),
          totalConversations,
        },
      });
    } catch (error) {
      console.error("Error in /my-chat:", error.message);
      res.status(500).json({ status: false, message: "Failed to fetch chat list", error: error.message });
    }
  });
// user 

export default router;