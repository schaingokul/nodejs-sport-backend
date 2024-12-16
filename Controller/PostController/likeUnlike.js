import PostImage from '../../Model/ImageModel.js';
import UserDetails from '../../Model/UserModelDetails.js';
import Notification from '../../Model/NotificationModel.js';


// Like-UnLike Session
export const likeUnLikePost = async (req, res) => {
    const { id: postId } = req.params;
    const { uuid: userUuid, id: userId } = req.user;

    try {
        // Fetch both post and user info in parallel
        const [postInfo, userInfo] = await Promise.all([
            PostImage.findById(postId),
            UserDetails.findById(userId).select('userInfo'),
        ]);

        // Validate post and user existence
        if (!postInfo) {
            return sendErrorResponse(res, 404, "Post not found. Failed to process the request.", null, "LIKE_POST_ERROR");
        }
        if (!userInfo) {
            return sendErrorResponse(res,404,"User not found. Failed to process the request.",null,"LIKE_POST_ERROR");
        }

        // Extract user details for response
        const response = {
            profile: userInfo.userInfo?.Profile_ImgURL || null,
            username: userInfo.userInfo?.Nickname || "Unknown User",
        };

        // Check if the user has already liked the post
        const likeIndex = postInfo.likes.findIndex(
            (like) => like.likedByUuid === userUuid
        );

        if (likeIndex !== -1) {
            
            // User has already liked the post, so remove the like
            postInfo.likes.splice(likeIndex, 1);
            await postInfo.save();

            // Send notification to the post owner
            const notification = new Notification({
                fromUserId: userId, // Liker's user ID
                toUserId: postInfo.postedBy.id, // Post owner's user ID
                field: postId,
                type: 'like', // Type of action
                message: `${response.username} unliked your post`, // Notification message
            });

            await notification.save();

            return res.status(200).json({ status: true, message: `${response.username} unliked this post by ${postInfo.postedBy.name}`, userInfo: response,
                data: { postId, likesCount: postInfo.likes.length }, });
        }

        // Add the like
        postInfo.likes.push({ likedByUuid: userUuid });
        await postInfo.save();

         // Send notification to the post owner
         const notification = new Notification({
            fromUserId: userId, // Liker's user ID
            toUserId: postInfo.postedBy.id, // Post owner's user ID
            type: 'like', // Type of action
            field: postId,
            message: `${response.username} liked your post`, // Notification message
        });

        await notification.save();

        return res.status(201).json({ status: true, message: `${response.username} liked this post by ${postInfo.postedBy.name}`, userInfo: response,
            data: { postId, likesCount: postInfo.likes.length }, });
    } catch (error) {
        sendErrorResponse( res, 500, "Failed to process the request.", error.message, "LIKE_POST_ERROR");
    }
};

// Fetch Likes Count
export const likeCount = async (req, res) => {
    const { id: postId } = req.params;

    try {
        // Fetch post and calculate likes count using $size
        const postInfo = await PostImage.aggregate([
            { $match: { _id: postId } },
            { $project: { likesCount: { $size: "$likes" } } },
        ]);

        if (!postInfo) {
            return sendErrorResponse(
                res,
                404,
                "Post not found. Failed to process the request.",
                null,
                "LIKE_POST_COUNT_ERROR"
            );
        }

        const likesCount = postInfo[0].likesCount;

        return res.status(200).json({
            status: true,
            message: "Likes count fetched successfully.",
            likeCounts: likesCount,
        });
    } catch (error) {
        sendErrorResponse(
            res,
            500,
            "An error occurred while processing the request.",
            error.message,
            "LIKE_POST_COUNT_ERROR"
        );
    }
};