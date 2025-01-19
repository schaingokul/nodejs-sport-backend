import UserDetails from "../../Model/UserModelDetails.js";
import Conversation from '../../Model/ChatModel/Conversation.Model.js'
import Message from '../../Model/ChatModel/MessageModel.js';

export const chatSearch = async (req, res) => {
    const {searchQuery, limit, skip } = req.body; // Get limit and skip from request body
    try {
        const { id } = req.user;
        const user = await UserDetails.findById(id);
        if (!user) {
            return res.status(403).json({ status: false, message: "User not found" });
        }

        // Case-insensitive regex for search
        const regex = new RegExp(searchQuery, 'i');

        // Pagination defaults
        const paginationLimit = limit ? parseInt(limit) : 0; // Use 0 for unlimited if limit is not provided
        const paginationSkip = skip ? parseInt(skip) : 0;

        let posts = [];
                posts = await UserDetails.aggregate([
                    {
                        $match: {
                            $or: [
                                { First_Name: { $regex: regex } },
                                { "userInfo.Nickname": { $regex: regex } }
                            ]
                        }
                    },
                    {
                        $project: {
                            _id: 1,
                            uuid: 1,
                            Profile_ImgURL: { $ifNull: ["$userInfo.Profile_ImgURL"] },
                            Nickname: { $ifNull: ["$userInfo.Nickname"] },
                        }
                    },
                    { $sort: { createdAt: -1 } },
                    { $skip: paginationSkip },
                    ...(paginationLimit ? [{ $limit: paginationLimit }] : []),
                ]);
                
        return res.status(200).json({ status: true, message: "user Chat ", info: posts });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ status: false, message: "Chat search algorithm" });
    }
};

export const getCoversation = async (type = null, createdBy=null, participants = null, groupName = null, url = null, cid = null) => {
    try {

        let conversation;
        if (!type || !["private", "group"].includes(type)) {
            throw new Error("Invalid or missing conversation type.");
          }

          if (!Array.isArray(participants) || participants.length === 0) {
            throw new Error("Participants must be a non-empty array.");
          }

        if (type === "private" && participants.length !== 2) {
            throw new Error("Private conversations must have exactly two participants.");
        }

        if (type === "group" && (!groupName || typeof groupName !== "string" || !groupName.trim())) {
            throw new Error("Group name is required for group conversations.");
          }

        if (typeof groupName !== "string" || !groupName.trim()) {
            throw new Error("Group name is required.");
        }

        if (cid) {
            conversation = await Conversation.findById(cid);
        } else if (type === "private") {
            conversation = await Conversation.findOne({ type: 'private', "participants.userId": { $all: participants } });
        } else if (type === "group") {
            conversation = await Conversation.findOne({ type: 'group', "participants.userId": { $all: participants }, groupName: groupName });
        } else {
            throw new Error('Invalid conversation type');
        }

        // If no conversation exists, create a new one
        if (!conversation) {
           if(!createdBy){
            throw new Error('Please send the created UserId');
           }

            conversation = new Conversation({ type, createdBy, 
            participants: participants.map((user) => ({userId: user.userId, role: user.role})), groupName, url });
            await conversation.save();
        }

        // Fetch participant details
        const participantDetails = await Promise.all(
            conversation.participants.map(async (participant) => {
                const user = await UserDetails.findById(participant.userId)
                return {
                    cid: participant._id, // Ensure participant structure supports this
                    type: participant.type, 
                    profile: user?.userInfo?.Profile_ImgURL || null,
                    username: user?.userInfo?.Nickname || null,
                };
            })
        );

        // Return both conversation and messages
        return { conversation: { ...conversation.toObject(), participants: participantDetails }};
    } catch (error) {
        console.error('Error fetching or creating conversation:', error);
        throw error;
    }
};

export const sendMessage = async(cid, sender, message) => {
    try {
        const newMessage = new Message({ cid, sender, message });
        console.log("SendMessagePass")
        const sendMessage = await newMessage.save();
        return sendMessage
    } catch (error) {
        console.error('Error fetching or creating conversation:', error);
        throw error
    }
};

/* 
export const getUsersForSidebar = async(req,res) => {
    const {id: loggedInUserId} = req.user
    try {
        const filteredUser = await UserDetails.find({_id: {$ne: loggedInUserId}}).select("id uuid userInfo")

        console.log(filteredUser);
        res.status(200).json({status: true, message: `All User`, UsersList: filteredUser})
    } catch (error) {
        console.log(error.message)
        res.status(200).json({status: false })
    }
};
*/
