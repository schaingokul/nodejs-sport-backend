import UserDetails from '../Model/UserModelDetails.js';
import path from 'path';
import { fileURLToPath } from 'url';
import { findUser, deleteFile } from '../utilis/userUtils.js';
import { PORT, HOST } from '../env.js';

const __filename = fileURLToPath(import.meta.url);


export const viewUserProfile = async(req,res) => {
    const {uuid} = req.user;
    try {
        const user = await UserDetails.findOne({ uuid })
        if (!user) {
            return res.status(200).json({ status: false, message: "User not found" });
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
        res.status(200).json({status: false, message: "UserInfo, Causes Route Error"});
    }
};

export const SaveUserProfile = async(req,res) => {
    const {uuid} = req.user;
    const saveFields = req.body;
    try {
         // Check if file is uploaded and then build the image URL
        let profileImageUrl = '';
        const user = await UserDetails.findOne({ uuid });
        if (!user) {
            return res.status(200).json({ status: false, message: "User not found" });
        }

        if(req?.files?.Profile_ImgURL && req.files.Profile_ImgURL.length > 0){
            
            if (req?.files?.Profile_ImgURL && req.files.Profile_ImgURL[0]) {
                profileImageUrl = `${HOST}:${PORT}/Uploads/images/${req.files.Profile_ImgURL[0].filename}`;
            }
            
            // If there's an existing image, delete it
            if(user.userInfo && user.userInfo.Profile_ImgURL){
                if (user.userInfo.Profile_ImgURL) {
                    const fileName = user.userInfo.Profile_ImgURL
                    console.log("Step 2 - fileName Before Delete",fileName)
                    deleteFile(fileName, "image")
                }
            }
        }

        const saveObj = {};
         // Ensure saveFields is an object before attempting to iterate over it
         if (typeof saveFields === 'object' && saveFields !== null) {
            // Iterate through the object fields and add them to saveObj
            Object.keys(saveFields).forEach(field => {
                saveObj[`userInfo.${field}`] = saveFields[field];
            });
        } else {
            return res.status(200).json({ status: false, message: "Invalid data format" });
        }

        // If there is a profile image, add it to the saveObj
        if (profileImageUrl) {
            saveObj['userInfo.Profile_ImgURL'] = profileImageUrl;
            
        }

        // If no fields to update, return an error message
        if (Object.keys(saveObj).length === 0) {
            return res.status(200).json({ status: false, message: "No fields to update" });
        }

        // Perform the update in the database
        const saveUser = await UserDetails.findOneAndUpdate(
            { uuid },  
            { $set: saveObj },  
            { new: true } 
        ).select("userInfo");

        res.status(200).json({ status: true, message: "UserInfo Updated", updateInformation: saveUser });
        
    } catch (error) {
        res.status(200).json({status: false, message: error.message});
    }
};

export const sportsView = async(req,res) => {
    const {uuid} = req.user;
    try {
        const sportsInfo = await UserDetails.findOne({uuid}).select("sportsInfo")
        console.log(sportsInfo.sportsInfo[0]);
        const message = sportsInfo.sportsInfo.length > 0 ? "ViewSports Success" : "No sports found.";

        res.status(200).json({status: true, message, UserInfo: sportsInfo});
    } catch (error) {
        res.status(200).json({status: false, message: "ViewSports Causes Route Error"});
    }
};

export const sportsAdd = async(req,res) => {
    const {uuid} = req.user;
    const {Sports_Name, Year_Playing, BestAt, Matches} = req.body;
    try { //Sports_ImgURL Video_ImgURL

        let Sports_ProfileImage_URL = '';
        let Sports_PostImage_URL = [];
        let Sports_videoImageURL = [];

        if (req?.files?.Sports_ProfileImage_URL?.[0]) {
            Sports_ProfileImage_URL = `${HOST}:${PORT}/Uploads/images/${req.files.Sports_ProfileImage_URL[0].filename}`;
        }

        if (req?.files?.Sports_PostImage_URL?.length > 0) {
            Sports_PostImage_URL = req.files.Sports_PostImage_URL.map(file => `${HOST}:${PORT}/Uploads/images/${file.filename}`);
        }

        if (req?.files?.Sports_videoImageURL?.length > 0) {
            Sports_videoImageURL = req.files.Sports_videoImageURL.map(file => `${HOST}:${PORT}/Uploads/videos/${file.filename}`);
        }
        
        const user = await UserDetails.findOne({ uuid });
        
        if (!user) {
            return res.status(200).json({ status: false, message: "User not found" });
        }

        const existingSport = user.sportsInfo.find(sport => sport.Sports_Name.toLowerCase() === Sports_Name.toLowerCase());
          if (existingSport) {
            return res.status(200).json({ status: false, message: "Sport with this name already exists." });
          }

        const newSports = {
            Sports_ProfileImage_URL, 
            Sports_Name : Sports_Name.toLowerCase(),
            Year_Playing,
            BestAt,
            Matches,
            Sports_PostImage_URL,
            Sports_videoImageURL,
            isActive: false
        }
        user.sportsInfo.push(newSports);
        await user.save();

        res.status(200).json({status: true,  message: "Sports Details added successfully.", sport: newSports });
        
    } catch (error) {
        res.status(200).json({status: false, message: `Sports Details Causes Route Error, ${error.message}`});
    }
};

export const sportsEdit = async(req, res) => {
    const {sportid} = req.params;
    const {uuid} = req.user;
    const updateFields = {...req.body}; 
    try {

        const user = await UserDetails.findOne({ uuid });
        if (!user) {
            return res.status(404).json({ status: false, message: "User not found." });
        }

        const sport = user.sportsInfo.find(sport => sport._id.toString() === sportid);
        if (!sport) {
            return res.status(404).json({ status: false, message: "Sport not found." });
        }

        if (updateFields.Sports_Name) {
            const existingSport = user.sportsInfo.find(
                s => s.Sports_Name.toLowerCase() === updateFields.Sports_Name.toLowerCase() && s._id.toString() !== sportid
            );
            if (existingSport) {
                return res.status(409).json({ status: false, message: "Sport with this name already exists." });
            }
        }

        const updateObj = {};

        // Handle profile image update
        if (req?.files?.Sports_ProfileImage_URL?.[0]) {
            if (sport.Sports_ProfileImage_URL) {
                deleteFile(path.basename(sport.Sports_ProfileImage_URL), "image");
            }
            updateObj['sportsInfo.$.Sports_ProfileImage_URL'] = `${HOST}:${PORT}/Uploads/images/${req.files.Sports_ProfileImage_URL[0].filename}`;
        }

        // Handle post image updates
        if (req?.files?.Sports_PostImage_URL?.length > 0) {
            sport.Sports_PostImage_URL.forEach(oldPath => deleteFile(path.basename(oldPath), "image"));
            updateObj['sportsInfo.$.Sports_PostImage_URL'] = req.files.Sports_PostImage_URL.map(file => `${HOST}:${PORT}/Uploads/images/${file.filename}`);
        }

        // Handle video image updates
        if (req?.files?.Sports_videoImageURL?.length > 0) {
            sport.Sports_videoImageURL.forEach(oldPath => deleteFile(path.basename(oldPath), "video"));
            updateObj['sportsInfo.$.Sports_videoImageURL'] = req.files.Sports_videoImageURL.map(file => `${HOST}:${PORT}/Uploads/videos/${file.filename}`);
        }

        // Dynamically update additional fields
        Object.keys(updateFields).forEach(field => {
            updateObj[`sportsInfo.$.${field}`] = updateFields[field];
        });

        const userUpdate = await UserDetails.findOneAndUpdate(
            { uuid, "sportsInfo._id": sportid },
            { $set: updateObj },
            { new: true }
        ).select("sportsInfo");

        res.status(200).json({ status: true, message: "Sport updated successfully.", sport: userUpdate });
    } catch (error) {
        res.status(200).json({status: false, message: `Updates Causes Route Error ${error.message}`});
    }
};

export const sportsClear = async(req, res) => {
    const {sportid} = req.params;
    const {uuid} = req.user;
    try {
        const user = await UserDetails.findOne({ uuid });
        if (!user) {
            return res.status(404).json({ status: false, message: "User not found." });
        }

        const sport = user.sportsInfo.find(s => s._id.toString() === sportid);
        if (!sport) {
            return res.status(404).json({ status: false, message: "Sport not found." });
        }

        if (sport.Sports_ProfileImage_URL) {
            deleteFile(path.basename(sport.Sports_ProfileImage_URL), "image");
        }

        sport.Sports_PostImage_URL.forEach(file => deleteFile(path.basename(file), "image"));
        sport.Sports_videoImageURL.forEach(file => deleteFile(path.basename(file), "video"));

        await UserDetails.findOneAndUpdate(
            { uuid },
            { $pull: { sportsInfo: { _id: sportid } } },
            { new: true }
        );

        res.status(200).json({status: true,  message: "Sport removed successfully"});
    } catch (error) {
        res.status(200).json({status: false, message: "Updates Causes Route Error"});
    }
};

export const sportsCertificateAdd = async(req,res) => {
    const {uuid} = req.user;
    const updateFields = req.body;
    try {
        const updateObj = {}; // Initialize empty object to store updates

        // Check and update the Post Image URLs if they exist
        if (req?.files?.Sports_PostImage_URL && req.files.Sports_PostImage_URL.length > 0) {
            updateObj['sportsInfo.Certificate.$.Upload_certificate'] = req.files.Sports_PostImage_URL.map(file => `${HOST}:${PORT}/Uploads/images/${file.filename}`);
        }

        // Check and update the Video Image URLs if they exist
        if (req?.files?.Sports_videoImageURL && req.files.Sports_videoImageURL.length > 0) {
            updateObj['sportsInfo.Certificate.$.Upload_Photos'] = req.files.Sports_videoImageURL.map(file => `${HOST}:${PORT}/Uploads/videos/${file.filename}`);
        }

        // Loop through the updateFields object and add them to updateObj
        for (const field in updateFields) {
            if (updateFields.hasOwnProperty(field)) {
                updateObj[`sportsInfo.Certificate.$.${field}`] = updateFields[field]; // Update additional fields dynamically
            }
        }

        const user = await findUser({ uuid: uuid })
        if (!user) {
            return res.status(200).json({ status: false, message: "User not found" });
        }

        user.sportsInfo.Certificate.push(updateObj);
        await user.save();

        res.status(200).json({status: true,  message: "Certificate added successfully.", sport:  user.sportsInfo.Certificate});
        
    } catch (error) {
        res.status(200).json({status: false, message: "Certificate Causes Route Error"});
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
            updateObj['sportsInfo.Certificate.$.Upload_certificate'] = req.files.Sports_PostImage_URL.map(file => `${HOST}:${PORT}/Uploads/images/${file.filename}`);
        }

        // Check and update the Video Image URLs if they exist
        if (req?.files?.Sports_videoImageURL && req.files.Sports_videoImageURL.length > 0) {
            updateObj['sportsInfo.Certificate.$.Upload_Photos'] = req.files.Sports_videoImageURL.map(file => `${HOST}:${PORT}/Uploads/videos/${file.filename}`);
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
