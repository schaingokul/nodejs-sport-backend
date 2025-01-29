import express from 'express';
import protectRoute from '../../middleware/ProtectRoute.js';
import { chatSearch } from '../../Controller/Chat/userAppController.js';
import Message from '../../Model/ChatModel/MessageModel.js';
import {groupUpload, uploadTemp} from '../../utilis/uploadFiles.js';
import Conversation from '../../Model/ChatModel/Conversation.Model.js';
import UserDetails from '../../Model/UserModelDetails.js'
import { IP } from '../../env.js';
import multer from "multer";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs";
import axios from 'axios';
import { deleteFile } from '../../utilis/userUtils.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const dirname = path.dirname(__dirname)
const name = path.dirname(dirname)
const router = express.Router();

router.get("/search", protectRoute, chatSearch);

const addParticipants = async (conversation, users) => {
  users.forEach(({ userId, role }) => {
      if (!conversation.participants.some(p => p.userId === userId)) {
          conversation.participants.push({
              userId: userId,
              role: role || "member",
              joinDate: new Date(),
          });
      }
  });
  await conversation.save();
};

const updateParticipantRoles = async (conversation, users) => {
  users.forEach(({ userId, role }) => {
      if (["admin", "member"].includes(role)) {
          let participant = conversation.participants.find(p => p.userId === userId);
          if (participant) {
              participant.role = role;
          }
      }
  });
  await conversation.save();
};

router.post('/edit',  protectRoute,  groupUpload.single("URL"), async (req, res) => {
  const { conversationId, action, users } = req.body;
  const { id: userId, uuid: userUuid } = req.user;
  let URL = req.file
  console.log("files fro routes", URL)
  try {
    if (!conversationId) {
      return res.status(400).json({ message: "Conversation ID is required" });
  }

  let conversation = await Conversation.findById(conversationId);
  if (!conversation) {
      return res.status(404).json({ message: "Conversation not found" });
  }

  // Find the requester in the participants list
  const requester = conversation.participants.find(p => p.userId === userId);

  const isAdmin = requester.role === "admin";

  if(action){
    switch (action) {
      case "add_users":
          if (!isAdmin) {
              return res.status(403).json({ message: "Only admins can add users" });
          }
          if (!Array.isArray(users) || users.length === 0) {
              return res.status(400).json({ message: "Users should be an array of objects with userId and role" });
          }
          await addParticipants(conversation, users);
          break;

      case "update_roles":
          if (!isAdmin) {
              return res.status(403).json({ message: "Only admins can update user roles" });
          }
          if (!Array.isArray(users) || users.length === 0) {
              return res.status(400).json({ message: "Users should be an array of objects with userId and role" });
          }
          await updateParticipantRoles(conversation, users);
          break;

      case "remove_users":
          if (!isAdmin) {
              return res.status(403).json({ message: "Only admins can remove users" });
          }
          if (!Array.isArray(users) || users.length === 0) {
              return res.status(400).json({ message: "Users should be an array of userId objects" });
          }
          conversation.participants = conversation.participants.filter(p => !users.some(u => u.userId === p.userId));
          await conversation.save();
          break;

      case "leave_group":
          conversation.participants = conversation.participants.filter(p => p.userId !== userId);

          if (isAdmin) {
              const hasAdmin = conversation.participants.some(p => p.role === "admin");

              if (!hasAdmin && conversation.participants.length > 0) {
                  // Assign the first available user as admin (not just members)
                  conversation.participants[0].role = "admin";
              }
          }

          if (conversation.participants.length === 0) {
              await Conversation.findByIdAndDelete(conversationId);
              await Message.updateMany({ cid: conversationId }, { $set: { deleted: true } });
              return res.status(200).json({ status: true, message: "Group deleted as no participants are left" });
          }

          await conversation.save();
          return res.status(200).json({ status: true, message: "You have left the group" });

      default:
          return res.status(400).json({ message: "Invalid action type" });
  }
  }else {
    // Handle Image Upload
    if (req.file && isAdmin === true) {
      const file = req.file;
      const isImage = ["image/jpeg", "image/jpg", "image/png"].includes(file.mimetype);
      console.log("Is Image?", isImage);
      console.log("File:", file);

      if (isImage) {
        let deleteFilePath = conversation.url;
      
          if (deleteFilePath) {
            // Delete the old file if it exists
            console.log("deleteFilePath",deleteFilePath)
            await deleteFile(deleteFilePath, "group", conversationId);
          }
        // Build new file path for the new image
        conversation.url = `${IP}/Uploads/group/${conversationId}/${file.filename}`;
        await conversation.save();
        console.log("New conversation URL:", conversation.url);
        return res.status(200).json({ status: true, message: "Image uploaded successfully", imageUrl: conversation.url, });
      } else {
        // Delete uploaded file if not an image
        await deleteFile(file.path, "group", conversationId);
        return res.status(400).json({ message: `Invalid file type: ${file.mimetype}. Expected an image.` });
      }
    
  }
  }
       
  return res.status(200).json({ status: true, message: "Conversation updated successfully", conversation });
      
  } catch (error) {
      console.error(error.message);
      res.status(500).json({ status: false, message: "Failed to update conversation", error: error.message });
  }
});

router.post("/", uploadTemp.single("URL"),  async(req,res) => {
    let { type, createdBy, participants, groupName, cid } = req.body;
    

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
          groupName
        });
  
        await conversation.save();
      }
      
      const finalConversationId = conversation._id.toString();

        if (req.file) {
          const tempPath = req.file.path;
          const uploadDir = path.join(dirname, `../Uploads/group/${finalConversationId}`);
          // Create folder if it doesn't exist
          if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir, { recursive: true });
          }

          const finalPath = path.join(uploadDir, req.file.filename);
          console.log("finalPath", finalPath)
          try {
            // Move the file from the temp folder to the desired folder
            await fs.promises.rename(tempPath, finalPath);

            const imageUrl = `${IP}/Uploads/group/${finalConversationId}/${req.file.filename}`;
            conversation.url = imageUrl;
            await conversation.save();

          } catch (err) {
            console.log("Error moving file: ", err.message);
            throw new Error("Failed to move file");
          }
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


// Join-Chat
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

    await Message.updateMany(
      {
        cid: cid, 
        "sender": { $ne: loginid }, 
        "readBy.userId": { $ne: loginid },
      },
      {
        $addToSet: { readBy: { userId: loginid, readAt: new Date() } }, 
      }
    );

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
          timestamp: message.createdAt,
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
  
      const conversations = await Conversation.find({ _id: { $in: conversationIds } }).sort({ updatedAt: -1 }).skip(skip).limit(limit);
  
      const conversationsWithMessages = await Promise.all(
        conversations.map(async (conversation) => {
          const latestMessage = await Message.findOne({ cid: conversation._id }).sort({ createdAt: -1 });

          const unreadCount = await Message.find({ cid: conversation._id, "sender": { $ne: loginid },  readBy: { $not: { $elemMatch: { userId: loginid } } } }).countDocuments();

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
                // lastMessage: latestMessage ? latestMessage.message : "Start Conversation",
                // unreadCount: unreadCount
              });
            }
          }

          return {
            cid: conversation._id,
            type: conversation.type,
            name: conversation.type === "group" ? conversation.groupName : participantsWithDetails[0].username,
            userId: conversation.type === "group" ? conversation.createdBy : participantsWithDetails[0].userId,
            profile: conversation.type === "group" ? conversation.url : participantsWithDetails[0].userProfile,
            lastMessage: latestMessage  ? latestMessage.message : "Start Conversation",
            unreadCount: unreadCount
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
/*


export const upload = multer({
    storage: multer.diskStorage({
        destination: function (req, file, cb) {
            try {
                // Ensure ProtectRoute runs before this middleware
                if (!req.user || !req.user.uuid) {
                    return cb(new Error("User not authenticated"), false);
                }

                const { uuid: currentUserFolder } = req.user;
                const uploadDir = path.join(__dirname, `../Uploads/${currentUserFolder}`);
                const uploadGroupDir = path.join(__dirname, `../Uploads/group`);

                // Create user-specific folder
                if (!fs.existsSync(uploadDir)) {
                    fs.mkdirSync(uploadDir, { recursive: true });
                    console.log(`User folder created: ${uploadDir}`);
                }

                // Create subfolders for images and videos
                const imagesDir = path.join(uploadDir, "images");
                const videosDir = path.join(uploadDir, "videos");
                const groupDir = path.join(uploadGroupDir, "group");

                if (!fs.existsSync(imagesDir)) fs.mkdirSync(imagesDir, { recursive: true });
                if (!fs.existsSync(videosDir)) fs.mkdirSync(videosDir, { recursive: true });
                if (!fs.existsSync(groupDir)) fs.mkdirSync(groupDir, { recursive: true });

                // Determine the correct folder based on MIME type
                const allowedImageTypes = ["image/jpeg", "image/jpg", "image/png", "image/gif"];
                const allowedVideoTypes = ["video/mp4", "video/avi", "video/mkv"];
                const allowedGroupTypes = ["image/jpeg", "image/jpg", "image/png", "image/gif"];

                if (allowedImageTypes.includes(file.mimetype)) {
                    cb(null, imagesDir);
                } else if (allowedVideoTypes.includes(file.mimetype)) {
                    cb(null, videosDir);
                } else if (allowedGroupTypes.includes(file.mimetype)) {
                    cb(null, groupDir);
                } else {
                    cb(new Error("Invalid file type"), false);
                }

            } catch (error) {
                console.error("Error setting upload directory:", error.message);
                cb(error);
            }
        },

        filename: function (req, file, cb) {
            const extname = path.extname(file.originalname); // Get file extension
            const filename = `${Date.now()}-${file.originalname}`; // Generate unique filename
            cb(null, filename);
        },
    }),
    fileFilter: (req, file, cb) => {
        const allowedImageTypes = ["image/jpeg", "image/jpg", "image/png", "image/gif"];
        const allowedVideoTypes = ["video/mp4", "video/avi", "video/mkv"];
        const allowedGroupTypes = ["image/jpeg", "image/jpg", "image/png", "image/gif"];

        if (allowedImageTypes.includes(file.mimetype) || allowedVideoTypes.includes(file.mimetype) || allowedGroupTypes.includes(file.mimetype)) {
            cb(null, true);
        } else {
            cb(new Error("Invalid file type"), false);
        }
    },
});

*/