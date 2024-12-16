import express from 'express';
import {googlesignUp, signUp, login, forgetPassword, verifycationCode, resetPassword, follower, following} from '../Controller/authController.js';
import ProtectRoute from '../middleware/ProtectRoute.js';
import { ErrorHandler } from '../utilis/ErrorHandlingMiddleware.js';
import UserDetails from '../Model/UserModelDetails.js';
import { deleteFile } from '../utilis/userUtils.js';
import {getNotificationsForUser} from '../Controller/getNotificationContollers.js';

const router = express.Router();

// googleAuth
router.post("/google", googlesignUp);

router.post("/signup", signUp);
router.post("/login", login);
router.post("/forget_password",forgetPassword);
router.post("/verify", ProtectRoute, verifycationCode);
router.post("/reset_password", ProtectRoute, resetPassword);
router.post("/follower/:id", ProtectRoute, follower);
router.post("/following/:id", ProtectRoute, following);

// notification
router.get("/notification", ProtectRoute, getNotificationsForUser);

export const adminUser = async(req,res) => {
    try {
        const users = await UserDetails.find().select("id First_Name Email_ID");
        res.status(200).json({status: true, message: "AdminView userlist Details" ,Info: users} )
    } catch (error) {
        res.status(500).json({status: false, message: "Admin causes error"})
    }
}

export const adminUserDelete = async (req, res) => {
    
    const {userId} = req.body;
    try {
        // Find the user by ID
        for (const id of userId) {
            const store = await UserDetails.findById(id);
            if (!store) {
                return res.status(404).json({status: false, message: "User not found" });
            }
    
            // Delete profile image if it exists
            if (store?.userInfo?.Profile_ImgURL) {
                deleteFile(store?.userInfo?.Profile_ImgURL, 'image');
            }
    
            // Delete sports profile images
            const sportsProfileImages = store.sportsInfo.map(file => file.Sports_ProfileImage_URL).filter(Boolean);
            for (const image of sportsProfileImages) {
                await deleteFile(image, 'image');
            }
    
            // Delete sports post images
             for (const file of store.sportsInfo) {
                 for (const image of file.Sports_PostImage_URL || []) {
                    await deleteFile(image, 'image');
                }
            }
    
            // Delete sports video URLs
            for (const file of store.sportsInfo) {
                for (const video of file.Sports_videoImageURL || []) {
                    await deleteFile(video, 'video');
                }
            }
    
            // Delete post videos
            for (const postId of store.myPostKeys) {
                const post = await postImage.findById(postId);
                if (post?.URL) {
                    for (const file of post.URL) {
                        deleteFile(file, 'image');
                        deleteFile(file, 'video');
                    }
                }
            }
    
            // Optionally: delete the user document
            await UserDetails.findByIdAndDelete(id);
        }
    
        return res.status(200).json({ status: true, message: "User and associated files successfully deleted.", });
    } catch (error) {
        console.error(error.message);
        return res.status(500).json({ status: false, message: "Error deleting user data.", error: error.message });
    }
};

router.get("/admin", adminUser);
router.delete("/admin", adminUserDelete);


router.use(ErrorHandler);

export default router;