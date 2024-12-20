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

export const getCoversation = async(type = null, participants = null, groupName = null, cid = null ) => {
    try {
        let conversation;
        if(cid){
            conversation = await Conversation.findById(cid);
        }else if(type === "one-on-one"){
            conversation = await Conversation.findOne({ type: 'one-on-one', participants: {$all: participants} });

        }else if(type === "group"){
            conversation = await Conversation.findOne({ type: 'group', groupName: groupName });
        }else {
            throw new Error('Invalid conversation type');
        }

        if(!conversation){
            conversation = new Conversation({ type, participants, groupName });
            await conversation.save();
        }

        const message = await Message.find({cid: conversation._id}).sort({timestamp: 1});
        // Fetch participant details
        const participantDetails = await Promise.all(
            conversation.participants.map(async (participant) => {
                const user = await UserDetails.findOne({ uuid: participant.uuid });
                return {
                    ...participant, // Ensure participant structure supports this
                    profile: user?.userInfo?.Profile_ImgURL || null,
                    username: user?.userInfo?.Nickname || null,
                };
            })
        );

        return { conversation: { ...conversation.toObject(), participants: participantDetails }, message}
    } catch (error) {
        console.error('Error fetching or creating conversation:', error);
        throw error
    }
};


export const sendMessage = async(cid, sender, message) => {
    try {
        const newMessage = new Message({ cid, sender, message });
        await newMessage.save();
        return newMessage
    } catch (error) {
        console.error('Error fetching or creating conversation:', error);
        throw error
    }
}

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
