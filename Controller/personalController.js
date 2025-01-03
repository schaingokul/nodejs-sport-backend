import UserDetails from '../Model/UserModelDetails.js';
import ImageModel from '../Model/ImageModel.js';
import path from 'path';
import { fileURLToPath } from 'url';
import { findUser, deleteFile , generateUniqueNickname} from '../utilis/userUtils.js';
import { PORT, HOST, IP } from '../env.js';
import { error } from 'console';


const __filename = fileURLToPath(import.meta.url);


export const viewUserProfile = async(req,res) => {
    const {uuid} = req.user;
    try {
        const user = await UserDetails.findOne({ uuid })
        if (!user) {
            return res.status(404).json({ status: false, message: "User not found" });
        }
        const userInfo = user.userInfo;
        const UI = userInfo
            ? {
                Email_ID: user.Email_ID,
                First_Name: user.First_Name,
                Last_Name: user.Last_Name,
                uuid: user.uuid,
                userInfo,
            }
            : {
                Email_ID: user.Email_ID,
                First_Name: user.First_Name,
                Last_Name: user.Last_Name,
                uuid: user.uuid,
            };

        console.log(`Step 3: Constructed UI: ${JSON.stringify(UI)}`);

        res.status(200).json({status: true, message: "UserInfo Success", UserDetails: UI})
    } catch (error) {
        res.status(500).json({status: false, message: "UserInfo, Causes Route Error"});
    }
};


export const SaveUserProfile = async (req, res) => {
    const {id: userId, uuid: userUuid } = req.user;
    const saveFields = req.body;

    try {
        // Check if the user exists
        const user = await UserDetails.findOne({ uuid: userUuid });
        if (!user) {
            return res.status(404).json({ status: false, message: "User not found" });
        }

        // Validate nickname uniqueness
        if (saveFields.Nickname) {
            try {
                saveFields.NickName = await generateUniqueNickname(saveFields.Nickname);
            } catch (error) {
                console.error("Nickname error:", error.message);
                return res.status(400).json({ status: false, message: error.message });
            }
        }
        console.log("saveFields.NickName", saveFields['Nickname']);
        // Handle profile image upload
        let profileImageUrl = "";
        if (req?.files?.Profile_ImgURL?.length > 0) {
            const file = req.files.Profile_ImgURL[0];
            profileImageUrl = `${IP}/Uploads/${userUuid}/images/${file.filename}`;

            // Delete the existing image if it's not the placeholder
            if (user.userInfo?.Profile_ImgURL !== "https://placehold.co/150/orange/white?text=Profile") {
                const existingImage = user.userInfo?.Profile_ImgURL;
                await deleteFile(existingImage, "image", userUuid);
            }
        }

        // Prepare update object
        const saveObj = {};
        if (typeof saveFields === "object" && saveFields !== null) {
            Object.keys(saveFields).forEach((field) => {
                saveObj[`userInfo.${field}`] = saveFields[field];
            });
        } else {
            return res.status(400).json({ status: false, message: "Invalid data format" });
        }

        // Add profile image URL to update object
        if (profileImageUrl) {
            saveObj["userInfo.Profile_ImgURL"] = profileImageUrl;
        }

        // Ensure there are fields to update
        if (Object.keys(saveObj).length === 0) {
            return res.status(400).json({ status: false, message: "No fields to update" });
        }

        // Update user in the database
        const updatedUser = await UserDetails.findOneAndUpdate(
            { uuid: userUuid },
            { $set: saveObj },
            { new: true }
        ).select("userInfo");

        if (updatedUser) {
            const updateResult = await ImageModel.updateMany(
                { "postedBy.id": userId },
                { $set: { "postedBy.name": updatedUser?.userInfo?.Nickname } }
            );
            console.log(`Updated ${updateResult.nModified} posts with new nickname.`);
        }

        if (!updatedUser) {
            return res.status(500).json({ status: false, message: "Failed to update user profile" });
        }
                
        res.status(200).json({ status: true, message: "User profile updated successfully", updateInformation: updatedUser });
    } catch (error) {
        console.error("Error updating user profile:", error.message);

        // Delete newly uploaded profile image on error
        if (req?.files?.Profile_ImgURL?.length > 0) {
            const file = req.files.Profile_ImgURL[0];
            console.error("Cleaning up uploaded file due to error:", file.filename);
            await deleteFile(file.filename, "image", userUuid);
        }

        res.status(500).json({ status: false, message: "An unexpected error occurred while updating the profile" });
    }
};



export const sportsView = async(req,res) => {
    const {uuid: userUuid} = req.user;
    try {
        const user = await UserDetails.findOne({uuid: userUuid})
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


        const message = user.sportsInfo.length > 0 ? "ViewSports Success" : "No sports found.";

        res.status(200).json({status: true, message, UserInfo: simplifiedSportsInfo});
    } catch (error) {
        res.status(500).json({status: false, message: "ViewSports Causes Route Error", error: error.message});
    }
};

export const sportsAdd = async (req, res) => {
    const { uuid: userUuid } = req.user;
    const { sName, year, best, matches } = req.body;

    let sp = '';
    let sURL = [];
    let sVURL = [];

    try {
        // Handling image uploads
        if (req?.files?.sp?.[0]) {
            sp = `${IP}/Uploads/${userUuid}/images/${req.files.sp[0].filename}`;
        }

        // Handling post image uploads
        if (req?.files?.sURL?.length > 0) {
            sURL = req.files.sURL.map(file => `${IP}/Uploads/${userUuid}/images/${file.filename}`);
        }

        // Handling video uploads
        if (req?.files?.sVURL?.length > 0) {
            sVURL = req.files.sVURL.map(file => `${IP}/Uploads/${userUuid}/videos/${file.filename}`);
        }

        // Check if user exists
        const user = await UserDetails.findOne({ uuid: userUuid });
        if (!user) {
            const error = new Error("User not found" );
            error.statusCode = 404; // Set the custom status code
            throw error;
        }

        // Check if the sport already exists
        const existingSport = user.sportsInfo.find(sport => sport.sName.toLowerCase() === sName.toLowerCase());
        if (existingSport) {
            const error = new Error("Sport with this name already exists.");
            error.statusCode = 400; // Set the custom status code
            throw error;

        }

        // Create new sports entry
        const newSports = {
            sp,
            sName: sName.toLowerCase(),
            year,
            best,
            matches,
            sURL,
            sVURL,
            isActive: false
        };

        // Save the new sport to the user's sportsInfo
        user.sportsInfo.push(newSports);
        await user.save();

        // Respond with the new sports details
        return res.status(200).json({ status: true, message: "Sports Details added successfully.", sport: newSports });

    } catch (error) {
        console.error("Error adding sports details:", error.message);

        // Clean up uploaded files in case of error (using finally block)
        try {
            // Check if files are uploaded and delete them
            if (req?.files?.sp) {
                await deleteFile(req.files.sp[0].filename, "image", userUuid);
            }

            if (req?.files?.sURL) {
                for (let file of req.files.sURL) {
                    await deleteFile(file.filename, "image", userUuid);
                }
            }

            if (req?.files?.sVURL) {
                for (let file of req.files.sVURL) {
                    await deleteFile(file.filename, "video", userUuid);
                }
            }
        } catch (deleteError) {
            console.error("Error deleting uploaded files:", deleteError.message);
        }

        // Return a generic error message if something goes wrong
        return res.status(500).json({ status: false, message: `Sports Details Route Error: ${error.message}` });
    }
};

export const sportsEdit = async (req, res) => {
    const { sportid } = req.params;
    const { uuid: userUuid } = req.user;
    const updateFields = { ...req.body };

    try {
        // Find the user
        const user = await UserDetails.findOne({ uuid: userUuid });
        if (!user) {
            const error = new Error("User not found.");
            error.statusCode = 404; // User not found should return a 404 status code
            throw error;
        }

        // Find the sport to update
        const sport = user.sportsInfo.find(sport => sport._id.toString() === sportid);
        if (!sport) {
            const error = new Error("Sport not found.");
            error.statusCode = 404; // Sport not found should return a 404 status code
            throw error;
        }

        // Check if the new sport name already exists (excluding the current sport)
        if (updateFields.sName) {
            const existingSport = user.sportsInfo.find(
                s => s.sName.toLowerCase() === updateFields.sName.toLowerCase() && s._id.toString() !== sportid
            );
            if (existingSport) {
                const error = new Error("Sport with this name already exists.");
                error.statusCode = 400; // Conflict status code for duplicate name
                throw error;
            }
        }

        const updateObj = {};

        // Handle profile image update (sp)
        if (req?.files?.sp?.[0]) {
            if (sport.sp) {
                await deleteFile(sport.sp[0], "image", userUuid); // Delete existing profile image
            }
            updateObj['sportsInfo.$.sp'] = `${IP}/Uploads/${userUuid}/images/${req.files.sp[0].filename}`;
        }

        // Handle post image updates (sURL)
        if (req?.files?.sURL?.length > 0) {
            sport.sURL.forEach(oldPath => deleteFile(oldPath, "image", userUuid)); // Delete existing post images
            updateObj['sportsInfo.$.sURL'] = req.files.sURL.map(file => `${IP}/Uploads/${userUuid}/images/${file.filename}`);
        }

        // Handle video image updates (sVURL)
        if (req?.files?.sVURL?.length > 0) {
            sport.sVURL.forEach(oldPath => deleteFile(oldPath, "video", userUuid)); // Delete existing video images
            updateObj['sportsInfo.$.sVURL'] = req.files.sVURL.map(file => `${IP}/Uploads/${userUuid}/videos/${file.filename}`);
        }

        // Dynamically update other fields (sName, year, best, etc.)
        Object.keys(updateFields).forEach(field => {
            if (field !== 'sName') { // To avoid modifying the name twice if it's present
                updateObj[`sportsInfo.$.${field}`] = updateFields[field];
            }
        });

        // Update the user's sports info
        const userUpdate = await UserDetails.findOneAndUpdate(
            { uuid: userUuid, "sportsInfo._id": sportid },
            { $set: updateObj },
            { new: true }
        ).select("sportsInfo");

        res.status(200).json({ status: true, message: "Sport updated successfully.", sport: userUpdate });

    } catch (error) {
        // Clean up uploaded files in case of error
        try {
            if (req?.files?.sp) {
                await deleteFile(req.files.sp[0].filename, "image", userUuid);
            }

            if (req?.files?.sURL) {
                for (let file of req.files.sURL) {
                    await deleteFile(file.filename, "image", userUuid);
                }
            }

            if (req?.files?.sVURL) {
                for (let file of req.files.sVURL) {
                    await deleteFile(file.filename, "video", userUuid);
                }
            }
        } catch (deleteError) {
            console.error("Error deleting uploaded files:", deleteError.message);
        }

        // Respond with error details
        const statusCode = error.statusCode || 500; // Use custom status code or default to 500
        res.status(statusCode).json({ status: false, message: error.message });
    }
};

export const sportsClear = async (req, res) => {
    const { sportid } = req.params;
    const { uuid: userUuid } = req.user;

    try {
        // Find the user by UUID
        const user = await UserDetails.findOne({ uuid: userUuid });
        if (!user) {
            return res.status(404).json({ status: false, message: "User not found." });
        }

        // Find the sport to be deleted
        const sport = user.sportsInfo.find(s => s._id.toString() === sportid);
        if (!sport) {
            return res.status(404).json({ status: false, message: "Sport not found." });
        }

        // Delete the profile image (if exists)
        if (sport.sp) {
            try {
                await deleteFile(sport.sp[0], "image", userUuid);  // Handle single image deletion safely
            } catch (error) {
                console.error("Error deleting profile image:", error.message);
            }
        }

        // Delete all post images (sURL)
        if (sport.sURL?.length > 0) {
            for (const file of sport.sURL) {
                try {
                    await deleteFile(file, "image", userUuid);  // Handle multiple image deletions
                } catch (error) {
                    console.error("Error deleting post image:", error.message);
                }
            }
        }

        // Delete all video files (sVURL)
        if (sport.sVURL?.length > 0) {
            for (const file of sport.sVURL) {
                try {
                    await deleteFile(file, "video", userUuid);  // Handle multiple video deletions
                } catch (error) {
                    console.error("Error deleting video file:", error.message);
                }
            }
        }

        // Remove the sport from the user's sportsInfo
        await UserDetails.findOneAndUpdate(
            { uuid: userUuid },
            { $pull: { sportsInfo: { _id: sportid } } },
            { new: true }
        );

        res.status(200).json({ status: true, message: "Sport removed successfully" });

    } catch (error) {
        console.error("Error during sport removal:", error.message);
        res.status(500).json({ status: false, message: "Failed to remove sport", error: error.message });
    }
};

export const sportsCertificateAdd = async(req,res) => {
    const {spi: sportId} = req.params;
    const {uuid} = req.user;
    const updateFields = req.body;
    try {
        const updateObj = {}; // Initialize empty object to store updates

        // Check and update the Post Image URLs if they exist
        if (req?.files?.Sports_PostImage_URL && req.files.Sports_PostImage_URL.length > 0) {
            updateObj['sportsInfo.Certificate.$.Upload_certificate'] = req.files.Sports_PostImage_URL.map(file => `${IP}/Uploads/images/${file.filename}`);
        }

        // Check and update the Video Image URLs if they exist
        if (req?.files?.Sports_videoImageURL && req.files.Sports_videoImageURL.length > 0) {
            updateObj['sportsInfo.Certificate.$.Upload_Photos'] = req.files.Sports_videoImageURL.map(file => `${IP}/Uploads/videos/${file.filename}`);
        }

        // Loop through the updateFields object and add them to updateObj
        for (const field in updateFields) {
            if (updateFields.hasOwnProperty(field)) {
                updateObj[`sportsInfo.Certificate.$.${field}`] = updateFields[field]; // Update additional fields dynamically
            }
        }
        
        const user = await findUser({ uuid: uuid })
        if (!user) {
            return res.status(404).json({ status: false, message: "User not found" });
        }

        user.sportsInfo.Certificate.push(updateObj);
        await user.save();

        res.status(201).json({status: true,  message: "Certificate added successfully.", sport:  user.sportsInfo.Certificate});
        
    } catch (error) {
       if(error) {
        if (req?.files?.Sports_ProfileImage_URL) {
            deleteFile(path.basename(req?.files?.Sports_ProfileImage_URL), "image");
        }

        // Clean up uploaded files if an error occurs
        if (req?.files?.Sports_PostImage_URL) {
            req.files.Sports_PostImage_URL.forEach(file =>
                deleteFile(`Uploads/images/${file.filename}`, "image")
            );
        }
        if (req?.files?.Sports_videoImageURL) {
            req.files.Sports_videoImageURL.forEach(file =>
                deleteFile(`Uploads/videos/${file.filename}`, "video")
            );
        }
       }
        res.status(500).json({status: false, message: "Certificate Causes Route Error"});
    }
};
/*
export const sportsCertificateEdit = async(req, res) => {
    const {sportid, certificateid} = req.params;
    const {uuid} = req.user;
    const updateFields = req.body; 
    try {
        const updateObj = {}; // Initialize empty object to store updates

        // Check and update the Post Image URLs if they exist
        if (req?.files?.Sports_PostImage_URL && req.files.Sports_PostImage_URL.length > 0) {
            updateObj['sportsInfo.Certificate.$.Upload_certificate'] = req.files.Sports_PostImage_URL.map(file => `${IP}/Uploads/images/${file.filename}`);
        }

        // Check and update the Video Image URLs if they exist
        if (req?.files?.Sports_videoImageURL && req.files.Sports_videoImageURL.length > 0) {
            updateObj['sportsInfo.Certificate.$.Upload_Photos'] = req.files.Sports_videoImageURL.map(file => `${IP}/Uploads/videos/${file.filename}`);
        }

        // Loop through the updateFields object and add them to updateObj
        for (const field in updateFields) {
            if (updateFields.hasOwnProperty(field)) {
                updateObj[`sportsInfo.Certificate.$.${field}`] = updateFields[field]; // Update additional fields dynamically
            }
        }
        //$set is update
        const user = await UserDetails.findOneAndUpdate(
            { uuid, "sportsInfo._id": sportid, "Certificate._id": certificateid },  
            { `sportsInfo.Certificate.${set}`: updateObj },  
            { new: true } 
        ).select("sportsInfo.Certificate");

        if (!user) {
            return res.status(200).json({ status: false, message: "User or sport not found." });
        }

        console.log("Updated SportInfo:", user.sportsInfo);
        
        res.status(200).json({status: true,  message: "Updated successfully.", sportsInformation: user.sportsInfo.id(sportid)});
    } catch (error) {
        res.status(200).json({status: false, message: "Updates Causes Route Error"});
    }
};
*/
/*
schma 
select machine ="",
Select Mold  ="",
Date = CurrrentDate,
startTime: CurrentTime, 
Records =[{id: 1, value1: "", value2: ""},{id: 2, value1: "", value2: ""},{id: 3, value1: "", value2: ""}]
EmergencyStop = [{id: 1, Reason: "Machine Failure", date: "", time: "", NoofProduction: ""}],
StopTime: StopCurrentTime,
*/
