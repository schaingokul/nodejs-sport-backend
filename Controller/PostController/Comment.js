import PostImage from '../../Model/ImageModel.js';
import UserDetails from '../../Model/UserModelDetails.js';
import Notification from '../../Model/NotificationModel.js';
import { sendErrorResponse } from '../../utilis/ErrorHandlingMiddleware.js';

export const viewPostComments = async (req, res) => {
    const { id: postId } = req.params; // Post ID
    try {
        // Fetch post by ID and retrieve the comments field
        const post = await PostImage.findById(postId).select('comments');

        if (!post) {
            return res.status(404).json({ status: false, message: `Post not found with ID: ${postId}` });
        }
        const { comments } = post; // Extract comments array
        // Map over comments to add user details
        const commentsWithUserDetails = await Promise.all(
             comments.map(async (comment) => {
                const user = await UserDetails.findById(comment.commentBy);
                 return {
                    ...comment.toObject(),
                    username: user?.userInfo?.Nickname || 'Unknown', // Add the username
                    Img: user?.userInfo?.Profile_ImgURL || '', // Add the profile image
                };
            })
        ); 

        return res.status(200).json({status: true, message:`ViewAllComments`, data: {commentsWithUserDetails}});
    } catch (error) {
        sendErrorResponse(res, 500, "View Comments Failed to process the request.", error.message, "VIEW_COMMENT_ERROR")
    }
};

export const createPostComment = async(req,res) => {
    const {id: postId} = req.params;
    const {uuid: userUuid, id: userId} = req.user;
    const {comment} = req.body;
    try {

        const postInfo = await PostImage.findById(postId);
        const userInfo = await UserDetails.findById(userId).select('userInfo');

        if (!postInfo) {
            return res.status(404).json({status: false ,message: "Post not found" });
        }
        const comments = {
            commentBy: userId, 
            comment: comment
        };

        postInfo.comments.push(comments);
        await postInfo.save();

        // Send notification to the post owner
        const notification = new Notification({
            fromUserId: userId, // Liker's user ID
            toUserId: postInfo.postedBy.id, // Post owner's user ID
            field: postId,
            type: 'comment', // Type of action
            message: `${userInfo.userInfo.Nickname} is ${comments.comment} your post`, // Notification message
        });

        await notification.save();

        res.status(201).json({ status: true, message: `${userInfo.userInfo.Nickname} added a comment to the post`, data: {comments}});
    } catch (error) {
        sendErrorResponse(res, 500, "Create Comments Failed to process the request.", error.message, "CREATE_COMMENT_ERROR")
    }
 };

 export const deletePostComment = async (req, res) => {
    const { id: postId } = req.params; // Post ID
    const { commentBy } = req.body;   // Comment ID to delete
    
    try {
        await Promise.all(
            commentBy.map(async (commentId) => {
                await PostImage.updateOne(
                    { _id: postId }, // Match the post by its ID
                    { $pull: { comments: { _id: commentId } } } // Remove the comment by its ID
                );
            })
        );
    
        return res.status(200).json({status: true, message:`Comment deleted from post`,});
    } catch (error) {
        sendErrorResponse(res, 500, "Delete Comments Failed to process the request.", error.message, "DELETE_COMMENT_ERROR")
    }
};
