import express from 'express';
import {googlesignUp, signUp, login, forgetPassword, verifycationCode, resetPassword, follow, following} from '../Controller/authController.js';
import ProtectRoute from '../middleware/ProtectRoute.js';
import { ErrorHandler } from '../utilis/ErrorHandlingMiddleware.js';
import UserDetails from '../Model/UserModelDetails.js';
import { deleteFile } from '../utilis/userUtils.js';
import {getNotificationsForUser} from '../Controller/getNotificationContollers.js';
import PostImage from '../Model/ImageModel.js';
import fs from "fs";
import path from "path";
import { fileURLToPath } from 'url';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);


const router = express.Router();

// googleAuth
router.post("/google", googlesignUp);

router.post("/signup", signUp);
router.post("/login", login);
router.post("/forget_password",forgetPassword);
router.post("/verify", ProtectRoute, verifycationCode);
router.post("/reset_password", ProtectRoute, resetPassword);
router.post("/follower/:id", ProtectRoute, follow);
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
    const { userId } = req.body;

    try {
        const deletionTasks = userId.map(async (id) => {
            const user = await UserDetails.findById(id);

            if (!user) {
                console.log(`User not found: ${id}`);
                return { id, status: false, message: "User not found" };
            }

            try {
                const deletionPromises = [];

                // Delete associated post images
                for (const postId of user.myPostKeys) {
                    const post = await PostImage.findById(postId);
                    if (post) {
                        // Delete the PostImage document itself
                        deletionPromises.push(PostImage.findByIdAndDelete(postId));
                    }
                }

                // Wait for all deletions to complete
                await Promise.all(deletionPromises);

                // Delete user-specific folder
                const userFolderPath = path.join(__dirname, `../Uploads/${user.uuid}`);
                if (fs.existsSync(userFolderPath)) {
                    fs.rmSync(userFolderPath, { recursive: true, force: true });
                    console.log(`Deleted folder for user: ${user.uuid}`);
                }

                // Delete the user document
                await UserDetails.findByIdAndDelete(id);

                return { id, status: true, message: "User and associated files successfully deleted" };
            } catch (error) {
                console.error(`Error deleting user ${id}:`, error.message);
                return { id, status: false, message: error.message };
            }
        });

        const results = await Promise.all(deletionTasks);

        const successCount = results.filter(result => result.status).length;
        const failureCount = results.length - successCount;

        return res.status(200).json({
            status: true,
            message: `${successCount} user(s) deleted successfully, ${failureCount} failed.`,
            results,
        });
    } catch (error) {
        console.error("Error deleting users:", error.message);
        return res.status(500).json({ status: false, message: "Error deleting user data.", error: error.message });
    }
};

/* old
export const adminUserDelete = async (req, res) => {
    const { userId } = req.body;

    try {
        const deletionTasks = userId.map(async (id) => {
            const user = await UserDetails.findById(id);

            if (!user) {
                console.log(`User not found: ${id}`);
                return { id, status: false, message: "User not found" };
            }

            try {
                const deletionPromises = [];

                // Delete associated post images
                for (const postId of user.myPostKeys) {
                    const post = await PostImage.findById(postId);
                    if (post) {
                        if (post.URL) {
                            for (const file of post.URL) {
                                await deleteFile(file, 'image');
                                await deleteFile(file, 'video');
                            }
                        }
                        // Delete the PostImage document itself
                        deletionPromises.push(PostImage.findByIdAndDelete(postId));
                    }
                }

                // Wait for all deletions to complete
                await Promise.all(deletionPromises);

                // Delete the user document
                await UserDetails.findByIdAndDelete(id);

                return { id, status: true, message: "User and associated files successfully deleted" };
            } catch (error) {
                console.error(`Error deleting user ${id}:`, error.message);
                return { id, status: false, message: error.message };
            }
        });

        const results = await Promise.all(deletionTasks);

        const successCount = results.filter(result => result.status).length;
        const failureCount = results.length - successCount;

        return res.status(200).json({
            status: true,
            message: `${successCount} user(s) deleted successfully, ${failureCount} failed.`,
            results,
        });
    } catch (error) {
        console.error("Error deleting users:", error.message);
        return res.status(500).json({ status: false, message: "Error deleting user data.", error: error.message });
    }
};*/


router.get("/admin", adminUser);
router.delete("/admin", adminUserDelete);


router.use(ErrorHandler);

export default router;