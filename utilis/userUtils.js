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
        filePathLoc = path.join('uploads', 'images', extractedFileName); // Correct file path
    } else if (fileType === 'video') {
        filePathLoc = path.join('uploads', 'videos', extractedFileName); // Correct file path
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


// Helper function to generate a unique nickname
export const generateUniqueNickname = async (firstName) => {
    let username = `${firstName}`;
    let existingUsersCount = await UserDetails.countDocuments({ "userInfo.NickName": { $regex: `^${firstName}` } });

    while (await UserDetails.findOne({ "userInfo.NickName": username })) {
        username = `${firstName}${existingUsersCount + Math.floor(Math.random() * 100) + 1}`;
        existingUsersCount++;
    }

    return username;
};

/* infinty feed
export const getHomeFeed = async (req, res) => {
    const { id: loginId, uuid: loginuuid } = req.user;
    const { page = 1, limit = 20 } = req.query; // Default page = 1 and limit = 20

    try {
        // Fetch user details
        const user = await UserDetails.findById(loginId).select("uuid _id following");
        if (!user) {
            return res.status(404).json({ status: false, message: "User not found" });
        }

        const following = user.following || []; // Users the current user follows
        let feed = []; // Array to hold the final feed

        // Step 1: HashSet for liked posts
        const likedPosts = new Set(
            (
                await PostImage.find({ "likes.likedById": loginuuid }).select("_id")
            ).map((post) => post._id.toString())
        );

        // Step 2: Fetch posts from followed users
        if (following.length > 0) {
            const followedPosts = await PostImage.find({ "postedBy.id": { $in: following } });
            followedPosts.forEach((post) => {
                if (!likedPosts.has(post._id.toString())) {
                    feed.push(post);
                }
            });
        }

        // Step 3: Priority Queue (Max Heap) for trending posts
        const trendingPosts = await PostImage.find({
            type: { $in: ["video", "reel", "image"] }
        })
            .sort({ likesCount: -1 }) // Sort by likes count
            .limit(10);

        feed.push(...trendingPosts);

        // Step 4: Random posts for new users
        if (following.length === 0) {
            const randomPosts = await PostImage.aggregate([{ $sample: { size: 20 } }]);
            feed = feed.concat(randomPosts);
        }

        // Step 5: Handle infinite scrolling (repeat posts if fewer)
        while (feed.length < limit * page) {
            feed = feed.concat(feed.slice(0, Math.min(feed.length, limit * page - feed.length)));
        }

        // Paginate the feed
        const startIndex = (page - 1) * limit;
        const paginatedFeed = feed.slice(startIndex, startIndex + limit);

        // Step 6: Format the response (Resolve all promises)
        const response = await Promise.all(
            paginatedFeed.map(async (post) => {
                const prf = await UserDetails.findById(post.postedBy.id).select("userInfo");
                return {
                    postId: post._id,
                    userId: post.postedBy.id,
                    userProfile: prf?.userInfo?.Profile_ImgURL || null,
                    userName: post.postedBy.name,
                    description: post.description,
                    type: post.type,
                    URL: post.URL,
                    likes: post.likes,
                    comments: post.comments,
                    location: post.location
                };
            })
        );

        return res.status(200).json({
            status: true,
            message: "Home feed fetched successfully",
            posts: response,
        });
    } catch (error) {
        console.error(error.message);
        res.status(500).json({ status: false, message: "Error fetching home feed", error: error.message });
    }
};*/