import UserDetails from '../Model/UserModelDetails.js';
import bcrypt from 'bcryptjs';
import emailConfig from '../utilis/EmailConfig.js';
import { generateToken } from '../utilis/generateToken.js';
import fs from 'fs';
import path from 'path';

// Find user by email or uuid
export const findUser = async (criteria) => {
    return await UserDetails.findOne(criteria);
};

// Hash a password
export const hashPassword = async (password) => {
    return await bcrypt.hash(password, 10);
};

// Compare passwords
export const comparePassword = async (enteredPassword, storedPassword) => {
    return await bcrypt.compare(enteredPassword, storedPassword);
};

// Send email with verification code
export const sendVerificationEmail = async (email, code) => {
    return await emailConfig({ Email: email, code });
};

// Generate JWT token
export const generateAuthToken = (user, res) => {
    const token = generateToken({ id: user._id, uuid: user.uuid, Email_ID: user.Email_ID }, res);
    return token;
};

//Directory created:
export const checkAndCreateDir = (dir) => {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
      console.log(`Directory created: ${dir}`);
    }
};

// File deletion function
export const deleteFile = (filePath, fileType) => {
    // Extract the file name from the filePath (removes the base URL if present)
    console.log("filePath - ", filePath, ' // fileType ', fileType)
    const extractedFileName = path.basename(filePath); 
    // Determine the correct file path based on file type
    let filePathLoc = '';
    
    if (fileType === 'image') {
        filePathLoc = path.join('Uploads', 'images', extractedFileName); // Correct file path
    } else if (fileType === 'video') {
        filePathLoc = path.join('Uploads', 'videos', extractedFileName); // Correct file path
    } else {
        console.log(`Invalid file type: ${fileType}`);
        return; // Exit if file type is invalid
    }

    // Check if the file exists and delete it
    if (fs.existsSync(filePathLoc)) {
        try {
            fs.unlinkSync(filePathLoc);
            console.log(`File deleted: ${filePathLoc}`);
        } catch (error) {
            console.error(`Error deleting file: ${error.message}`);
        }
    } else {
        console.log(`File not found: ${filePathLoc}`);
    }
};

export const generateUniqueNickname = async (firstName) => {
    // Fetch all nicknames that start with the given firstName
    const existingNicknames = await UserDetails.find(
        { "userInfo.Nickname": { $regex: `^${firstName.toString()}` } },
        { "userInfo.Nickname": 1, _id: 0 }
    );

    // Extract the nicknames into an array
    const nicknameSet = new Set(existingNicknames.map(user => user.userInfo.Nickname.toString()));

    let username = firstName;
    let randomNumber = Math.floor(Math.random() * (firstName.length * 100)) + 1;
    let counter = 1;

    // Generate a new unique nickname
    while (nicknameSet.has(username)) {
        username = `${firstName.toString()}_${randomNumber}`;
        counter++;
    }

    return username;
};
