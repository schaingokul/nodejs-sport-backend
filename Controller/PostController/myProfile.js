import PostImage from '../../Model/ImageModel.js';
import UserDetails from '../../Model/UserModelDetails.js';
import { sendErrorResponse } from '../../utilis/ErrorHandlingMiddleware.js';


export const myProfile = async (req, res) => {
    const { uuid: userUuid, id: userId } = req.user;

    try {
        const user = await UserDetails.findById(userId).select("-Password");
        if (!user) {
            return res.status(404).json({ status: false, message: "User not found." });
        }

        // Fetch all posts
        const postIds = user.myPostKeys?.map((postid) => postid.toString()) || [];
        const posts = await PostImage.find({ _id: { $in: postIds } });

        // Simplify post details
        const postDetails = posts.map((post) => ({
            postId: post._id,
            type: post.type,
            URL: post.URL?.[0] || "", // Handle empty or missing URL
        }));

        // Simplify sportsInfo details with shortened property names
        const simplifiedSportsInfo = user.sportsInfo?.map((sport) => ({
            sp: sport.sp,
            sURL: sport.sURL?.[0], // Handle empty or missing sURL
            sName: sport.sName,
            year: sport.year,
            best: sport.best,
            matches: sport.matches,
            sVURL: sport.sVURL?.[0], // Handle empty or missing sVURL
            isActive: sport.isActive,
            _id: sport._id,
        })) || [];

        // Flattened response object
        const response = {
            id: user._id,
            uuid: user.uuid,
            userName: user.userInfo?.Nickname,
            profile: user.userInfo?.Profile_ImgURL,
            sportsInfo: simplifiedSportsInfo,
            followingCount: user.following?.length ,
            followersCount: user.followers?.length ,
            myPostKeysCount: user.myPostKeys?.length,
            myPostKeys: postDetails
        };

        res.status(200).json({ status: true, message: "My Profile", info: response });
    } catch (error) {
        sendErrorResponse(res, 500, "My Profile. Failed to process the request.", error.message, "MY_PROFILE_CAUSES_ERROR");
    }
};

export const myPost = async(req,res) => {
    const {uuid: userUuid, id: userId } = req.user
    try {
        const currentUser = await UserDetails.findById(userId);

        // Fetch all posts
        const postIds = currentUser.myPostKeys.map((postid) => postid.toString());
        const posts = await PostImage.find({ _id: { $in: postIds } });

        // Simplify post details
        const postDetails = posts.map((post) => ({
            postId: post._id,
            userId: post?.postedBy?.id,
            userProfile: currentUser.userInfo.Profile_ImgURL,
            userName: currentUser.userInfo.Nickname,
            description: post.description,
            type: post.type,
            URL: post.URL[0], // Convert URL array to single string
            lc: post.likes.length,
            location: post.location,
            comments: post.comments.length,
            isLiked: post.likes.some((like) => like.likedByUuid === userUuid.toString())  // Check if post UUID is in likedPosts
        }));

        const response = {
            id: currentUser._id,
            uuid: currentUser.uuid,
            userProfile: currentUser?.userInfo?.Profile_ImgURL,
            userName: currentUser?.userInfo?.Nickname,
            myPostKeys: postDetails,
        };

        res.status(200).json({status: true, message: 'View MyPost', data:response })
    } catch (error) {
        sendErrorResponse(res, 500, "My Post. Failed to process the request.", error.message, "MY_POST_CAUSES_ERROR")
    }
};