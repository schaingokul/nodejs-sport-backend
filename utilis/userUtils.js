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

// production is for VPS Server
// development is for Local Server

// Set base directory based on environment

// let server = process.env.NODE_ENV  || 'production';
let server = process.env.NODE_ENV  || 'production';

const basePath = server === 'productio' ? '/var/www/nodejs-sport-backend/Uploads' : 'Uploads' ;  // Local path for local development

// Function to delete a file
export const deleteFile = (filePath, fileType, uuid) => {
    const extractedFileName = path.basename(filePath);  // Extract file name from path
    let filePathLoc = "";

    // Construct the correct path for deletion based on environment
    if (fileType === "image") {
        filePathLoc = path.join(basePath, uuid, 'images', extractedFileName);
    } else if (fileType === "video") {
        filePathLoc = path.join(basePath, uuid, 'videos', extractedFileName);
    } else {
        console.error(`Invalid file type: ${fileType}`);
        return;
    }

    // Check if the file exists and delete it
    if (fs.existsSync(filePathLoc)) {
        try {
            fs.unlinkSync(filePathLoc);  // Delete the file synchronously
            console.log(`File deleted: ${filePathLoc}`);
        } catch (error) {
            console.error(`Error deleting file: ${error.message}`);
        }
    } else {
        console.log(`File not found: ${filePathLoc}`);
    }
};

const special = '@';

export const generateUniqueNickname = async (NickName) => {
    const MAX_ATTEMPTS = 1000; // Maximum number of retries to generate a unique username
    let baseUsername = `${special}${NickName.toString().toLowerCase()}`;

    // Fetch all nicknames that start with the base username
    const existingNicknames = await UserDetails.find(
        { "userInfo.Nickname": { $regex: `^${NickName.toLowerCase()}` } },
        { "userInfo.Nickname": 1, _id: 0 }
    );

     
    // Extract the nicknames into a set for quick lookup
    const nicknameSet = new Set(existingNicknames.map(user => user.userInfo.Nickname));

    // If the base username is already taken, throw an error
    if (nicknameSet.has(NickName)) {
        throw new Error(`The nickname "${NickName}" is already in use.`);
    }

    // Initialize a counter for uniqueness
    let counter = 1;
    let uniqueUsername = baseUsername;

    // Increment the counter until a unique nickname is found or MAX_ATTEMPTS is reached
    while (nicknameSet.has(uniqueUsername)) {
        uniqueUsername = `${baseUsername}${counter}`;
        counter++;

        if (counter > MAX_ATTEMPTS) {
            throw new Error("Username should be unique. Unable to generate a unique nickname.");
        }
    }

    return uniqueUsername;
};