import PostImage from '../../Model/ImageModel.js';
import UserDetails from '../../Model/UserModelDetails.js';
import { sendErrorResponse } from '../../utilis/ErrorHandlingMiddleware.js';

// No_Changes
export const otherProfile = async (req, res) => {
    const { id: userId } = req.user;
    const { id: otherUserUuid } = req.params;

    try {
        const current = await UserDetails.findById(userId).select("-Password");
        if (!current) return res.status(404).json({ status: false, message: "User not found." });

        const user = await UserDetails.findOne({uuid: otherUserUuid }).select("-Password");
        if (!user) return res.status(404).json({ status: false, message: "User not found." });

        // Ensure properties exist and have default values
        user.following = user.following || [];
        user.followers = user.followers || [];
        user.myPostKeys = user.myPostKeys || [];
        user.MyTeamBuild = user.MyTeamBuild || [];
        user.PlayFor = user.PlayFor || [];
        user.userInfo = user.userInfo || {};
        user.sportsInfo = user.sportsInfo || [];

        // Fetch all posts
        const postIds = user.myPostKeys.map((postid) => postid.toString());
        const posts = await PostImage.find({ _id: { $in: postIds } });

        // Simplify post details
        const postDetails = posts.map((post) => ({
            postId: post._id,
            type: post.type,
            URL: post.URL[0], // Convert URL array to single string
        }));

         // Simplify sportsInfo details with shortened property names
         const simplifiedSportsInfo = user.sportsInfo.map((sport) => ({
            sp: sport.sp,   
            sURL: sport.sURL[0],  
            sName: sport.sName,            
            year: sport.year,            
            best: sport.best,                   
            matches: sport.matches,              
            sVURL: sport.sVURL[0], 
            isActive: sport.isActive,
            _id: sport._id,
        }));

        // Flattened response object
        const response = {
            id: user._id,
            uuid: user.uuid,
            userName: user.userInfo.Nickname,
            profile: user.userInfo.Profile_ImgURL,
            sportsInfo: simplifiedSportsInfo,
            followingCount: user.following.length,
            followersCount: user.followers.length,
            myPostKeysCount: user.myPostKeys.length,
            myPostKeys: postDetails,
            MyTeamBuildCount: user.MyTeamBuild.length,
            MyTeamBuild: user.MyTeamBuild,
            PlayForCount: user.PlayFor.length,
            PlayFor: user.PlayFor,
        };

        res.status(200).json({ status: true, message: "View Others Profile", info: response });
    } catch (error) {
        console.error(error.message);
        res.status(500).json({ status: false, message: "Error fetching profile", error: error.message });
    }
};


export const otherPost = async(req,res) => {
    const {uuid: userUuid, id: userId } = req.user
    const {id: otherUserUuid} = req.params
    try {
        const userFound = await UserDetails.findById(userId);
        if (!userFound) return res.status(404).json({ status: false, message: "User not found." });

        const findUser = await UserDetails.findOne({uuid: otherUserUuid })
        if (!findUser) return res.status(404).json({ status: false, message: "Other User POST Not found." });
        // Fetch all posts
        const postIds = findUser.myPostKeys.map((postid) => postid.toString());
        const posts = await PostImage.find({ _id: { $in: postIds } });

        // Simplify post details
        const postDetails = posts.map((post) => ({
            postId: post._id,
            location: post.location,
            likes: post.likes.length,
            comments: post.comments.length,
            description: post.description,
            type: post.type,
            URL: post.URL[0], // Convert URL array to single string
        }));

        const response = {
            id: findUser._id,
            uuid: findUser.uuid,
            userName: findUser.userInfo.Nickname,
            profile: findUser.userInfo.Profile_ImgURL,
            myPostKeys: postDetails,
        };

        res.status(200).json({status: true, message: 'View otherPost', data:response })
    } catch (error) {
        sendErrorResponse(res, 500, "My Post. Failed to process the request.", error.message, "MY_POST_CAUSES_ERROR")
    }
};