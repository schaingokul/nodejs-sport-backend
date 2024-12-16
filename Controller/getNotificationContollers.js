import Notification from '../Model/NotificationModel.js';
import UserDetails from '../Model/UserModelDetails.js';
import { sendErrorResponse } from '../utilis/ErrorHandlingMiddleware.js';

export const getNotificationsForUser = async(req,res) =>  {
    const {id: userId} = req.user;
    let { page, limit } = req.query;
    try {
        
        // Ensure default values for pagination if not provided
        page = page ? parseInt(page) : 1;
        limit = limit ? parseInt(limit) : 20;

        // Fetch notifications for the user, applying pagination
        const notifications = await Notification.find({ toUserId: userId })
            .skip((page - 1) * limit) // Skip notifications for previous pages
            .limit(limit) // Limit the number of notifications per page
            .sort({ createdAt: -1 });  // Sort by createdAt in descending order

        // Map over notifications to add user details
        const notificationsWithUserDetails = await Promise.all(
            notifications.map(async (notification) => {
                const user = await UserDetails.findById(notification.fromUserId);
                return {
                    ...notification.toObject(),
                    username: user.userInfo.Nickname,  // Add the username
                    profileImage: user.userInfo.Profile_ImgURL,  // Add the profile image
                };
            })
        );

        res.status(200).json({status: true, message: 'View Recent Notifications', data: notificationsWithUserDetails})
    } catch (error) {
        sendErrorResponse(res, 500, "FAILED TO REQUEST IN GET_NOTIFICATION", error.message, "GET_NOTIFICATION_ERROR");
    }
};