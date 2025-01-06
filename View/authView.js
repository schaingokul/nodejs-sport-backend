import express from 'express';
import {googlesignUp, signUp, login, forgetPassword, verifycationCode, resetPassword,follow_following, follow} from '../Controller/authController.js';
import ProtectRoute from '../middleware/ProtectRoute.js';
import { ErrorHandler } from '../utilis/ErrorHandlingMiddleware.js';
import UserDetails from '../Model/UserModelDetails.js';
import { deleteFile } from '../utilis/userUtils.js';
import {getNotificationsForUser} from '../Controller/getNotificationContollers.js';
import PostImage from '../Model/ImageModel.js';
import fs from "fs";
import path from "path";
import { fileURLToPath } from 'url';
import ImageModel from '../Model/ImageModel.js';
import Notification from '../Model/NotificationModel.js';
import eventRequest from '../Model/eventRequestModel.js';
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
router.get("/account", ProtectRoute, follow_following);

// notification
router.get("/notification", ProtectRoute, getNotificationsForUser);

export const adminUser = async(req,res) => {
    try {
        const users = await UserDetails.find().select("id uuid First_Name Email_ID userInfo");
        let response = users.map((user) => {
            return {
                userId: user._id,
                userUuid: user.uuid,
                userName:user?.userInfo?.Nickname,
                userProfile:user?.userInfo?.Profile_ImgURL,
                userEmail:user?.Email_ID
            }
        })
        res.status(200).json({status: true, message: "AdminView userlist Details" ,Info: response} )
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


router.get("/admin", adminUser);
router.delete("/admin", adminUserDelete);
router.get("/collection", async (req, res) => {
    let { colName } = req.query;
    
    // Normalize collection name to lower case
    colName = colName ? colName.toLowerCase() : "";

    try {
        let finded;
        
        // Map of collection names to corresponding models
        const collectionMap = {
            post: ImageModel,
            notify: Notification,
            event: eventRequest
        };

        // Check if the requested collection exists in the map
        if (collectionMap[colName]) {
            finded = await collectionMap[colName].find();
        } else {
            return res.status(404).json({ status: false, message: `Collection ${colName} not found` });
        }

        console.log(`Collection DB is ${colName}`);
        return res.status(200).json({ status: true, message: `Collection DB is ${colName}`, finded });

    } catch (error) {
        console.error("Error fetching collection:", error.message);
        return res.status(500).json({ status: false, message: "Error fetching collection data", error: error.message });
    }
});

router.delete("/deletecollection", async (req, res) => {
    let { colName, id } = req.query;

    // Normalize collection name to lower case
    colName = colName ? colName.toLowerCase() : "";

    // Validate that the id is provided and valid
    if (!id) {
        return res.status(400).json({ status: false, message: "ID is required for deletion" });
    }

    try {
        let finded;

        // Map of collection names to corresponding models
        const collectionMap = {
            post: ImageModel,
            notify: Notification,
            event: eventRequest
        };

        // Check if the requested collection exists in the map
        if (collectionMap[colName]) {
            // Attempt to delete the document with the specified id
            finded = await collectionMap[colName].findByIdAndDelete(id);

            // If the document wasn't found, return a not found error
            if (!finded) {
                return res.status(404).json({ status: false, message: `No item found with ID: ${id} in ${colName}` });
            }

        } else {
            return res.status(404).json({ status: false, message: `Collection ${colName} not found` });
        }

        console.log(`Collection ${colName} deleted, ID: ${id}`);
        return res.status(200).json({ status: true, message: `Collection ${colName} deleted successfully`, deletedItem: finded });

    } catch (error) {
        console.error(`Error deleting collection ${colName}:`, error.message);
        return res.status(500).json({ status: false, message: "Error deleting collection data", error: error.message });
    }
});

router.get("/show", async (req, res) => {
    try {
        // Step 1: Aggregate allPostKeys
        const result = await UserDetails.aggregate([
            { $project: { myPostKeys: 1 } }, // Select 'myPostKeys' field
            { $unwind: "$myPostKeys" }, // Flatten the 'myPostKeys' arrays
            { $group: { _id: null, allPostKeys: { $addToSet: "$myPostKeys" } } } // Combine into a single array
        ]);

        const allPostKeys = result[0]?.allPostKeys || [];

        // Step 2: Delete documents in ImageModel not in allPostKeys
        const deleteResult = await ImageModel.deleteMany({ _id: { $nin: allPostKeys } });

        res.status(200).json({
            status: true,
            message: "Unused images deleted successfully",
            data: {
                deletedCount: deleteResult.deletedCount // Number of documents deleted
            }
        });
    } catch (error) {
        console.error(`Error processing request:`, error.message);
        return res.status(500).json({
            status: false,
            message: "Error processing request",
            error: error.message
        });
    }
});

router.use(ErrorHandler);

export default router;