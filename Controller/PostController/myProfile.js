import PostImage from '../../Model/ImageModel.js';
import UserDetails from '../../Model/UserModelDetails.js';
import { sendErrorResponse } from '../../utilis/ErrorHandlingMiddleware.js';


// No_Changes
export const myProfile = async (req, res) => {
    const { uuid: userUuid, id: userId } = req.user;

    try {
        const user = await UserDetails.findById(userId).select("-Password");
        if (!user) {
            return res.status(404).json({ status: false, message: "User not found." });
        }

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
            sp: sport.Sports_ProfileImage_URL,   
            sURL: sport.Sports_PostImage_URL[0],  
            sName: sport.Sports_Name,            
            year: sport.Year_Playing,            
            best: sport.BestAt,                   
            matches: sport.Matches,              
            sVURL: sport.Sports_videoImageURL[0], 
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

        res.status(200).json({ status: true, message: "My Profile", info: response });
    } catch (error) {
        sendErrorResponse(res, 500, "My Profile. Failed to process the request.", error.message, "MY_PROFILE_CAUSES_ERROR")
    }
};

export const myPost = async(req,res) => {
    const {uuid: userUuid, id: userId } = req.user
    try {
        const userFound = await UserDetails.findById(userId);

        // Fetch all posts
        const postIds = userFound.myPostKeys.map((postid) => postid.toString());
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
            id: userFound._id,
            uuid: userFound.uuid,
            userName: userFound.userInfo.Nickname,
            profile: userFound.userInfo.Profile_ImgURL,
            myPostKeys: postDetails,
        };

        res.status(200).json({status: true, message: 'View MyPost', data:response })
    } catch (error) {
        sendErrorResponse(res, 500, "My Post. Failed to process the request.", error.message, "MY_POST_CAUSES_ERROR")
    }
}