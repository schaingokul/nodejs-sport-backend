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
       if(!cid){
        if (!type || !["private", "group"].includes(type)) {
            return res.status(400).json({ message: "Invalid or missing conversation type." });
          }

        if (!Array.isArray(participants) || participants.length === 0) {
            return res.status(400).json({ message: "Participants must be a non-empty array." });
        }
      
        if (type === "private" && participants.length !== 2) {
            return res.status(400).json({ message: "Private conversations must have exactly two participants." });
        }
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

router.get("/chat-data/:cid", async (req, res) => {
  const { loginid, page = 1, limit = 20 } = req.query; // Use query parameters for pagination
  const { cid } = req.params;

  try {
    // Validate CID
    if (!cid) {
      return res.status(400).json({ status: false, message: "Conversation ID (cid) is required." });
    }

    if(!loginid){
      return res.status(400).json({ status: false, message: "loginud is required i can show the chat using diffre based on loginid." });
    }

    // Parse pagination values
    const pageNumber = parseInt(page);
    const pageLimit = parseInt(limit);
    const skip = (pageNumber - 1) * pageLimit;

    // Fetch chat data
    const chat_data = await Message.find({ cid: cid.toString() }).sort({ updatedAt: -1 }).skip(skip).limit(pageLimit);

    const formattedChatData = await Promise.all(
      chat_data.map(async (message) => {
        // Fetch user details
        const user = await UserDetails.findById(message.sender).select("_id userInfo");
    
        return {
          id: message._id,
          message: message.message,
          is: message.sender === loginid ? "me" : "other",
          sender: message.sender,
          name: user?.userInfo?.Nickname, // Default to "Unknown" if Nickname is missing
          url: user?.userInfo?.Profile_ImgURL, // Default image URL
          timestamp: message.timestamp,
        };
      })
    );

    console.log("Chat Data:", formattedChatData);

    // Total messages count
    const totalMessages = await Message.countDocuments({ cid });

    // Send response
    res.status(200).json({ status: true, message: "Successfully Fetched",
      chat_data: {
        formattedChatData,
        currentPage: pageNumber,
        totalPages: Math.ceil(totalMessages / pageLimit),
        totalMessages,
      },
    });
  } catch (error) {
    console.error("Error fetching chat data:", error.message);
    res.status(500).json({ status: false, message: "Failed to fetch chat data", error: error.message, });
  }
});

router.get("/my-chat", async (req, res) => {
    let { loginid, page = 1, limit = 20 } = req.query;
  
    try {
      // Validate userId
      if (!loginid) {
        return res.status(400).json({ status: false, message: "User ID is required" });
      }
  
      const user = await UserDetails.findById(loginid).select("chatList");
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
        .skip(skip)
        .limit(limit);
  
      const conversationsWithMessages = await Promise.all(
        conversations.map(async (conversation) => {
          const latestMessage = await Message.findOne({ cid: conversation._id }).sort({ createdAt: -1 });
  
          let participantsWithDetails = [];
          
          if (conversation.type === "private") {
            // Private: Find the participant that is not the current user
            const participant = conversation.participants.find(p => p.userId !== loginid);
  
            if (participant) {
              const user = await UserDetails.findById(participant.userId);
              participantsWithDetails.push({
                userId: user._id,
                username: user?.userInfo?.Nickname ,
                userProfile: user?.userInfo?.Profile_ImgURL ,
                lastMessage: latestMessage ? latestMessage.message : "Start Conversation"
              });
            }
          }
  
          return {
            cid: conversation._id,
            type: conversation.type,
            name: conversation.type === "group" ? conversation.groupName : participantsWithDetails[0].username,
            userId: conversation.type === "group" ? conversation.createdBy : participantsWithDetails[0].userId,
            profile: conversation.type === "group" ? conversation.url : participantsWithDetails[0].userProfile,
            lastMessage: latestMessage  ? latestMessage.message : "Start Conversation"
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


router.post('/send', async(req,res) => {
  try {
    
  } catch (error) {
    console.error("Error in /SendMessage:", error.message);
      res.status(500).json({ status: false, message: "Failed to SendMessage", error: error.message });
    
  }
})

export default router;