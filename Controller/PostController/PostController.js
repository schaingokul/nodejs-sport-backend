import PostImage from '../../Model/ImageModel.js';
import UserDetails from '../../Model/UserModelDetails.js';
import { deleteFile } from '../../utilis/userUtils.js';
import {HOST, PORT} from '../../env.js'

export const createPost = async (req, res) => {
    let URL = [];
    try {
        const { id: loginId } = req.user;
        const { location, description , type} = req.body;
        
        const user = await UserDetails.findById(loginId).select("uuid _id First_Name Last_Name myPostKeys");
        
        if (!user) {
            return res.status(404).json({status: false, message: "User not found" });
        }
        
                // Process and validate uploaded files
        if (req?.files?.URL && req.files.URL.length > 0) {
            req.files.URL.forEach((file) => {
                try {
                    // Determine file type
                    const isImage = ["image/jpeg", "image/png", "image/jpg"].includes(file.mimetype);
                    const isVideo = ["video/mp4", "video/avi", "video/mkv"].includes(file.mimetype);

                    // Validate based on 'type' parameter
                    if (type === "image" || type === "event" && isImage) {
                        URL.push(`${HOST}:${PORT}/Uploads/images/${file.filename}`);
                    } else if ((type === "video" || type === "reel" || type === "event") && isVideo) {
                        URL.push(`${HOST}:${PORT}/Uploads/videos/${file.filename}`);
                    } else {
                        // Invalid file type for the specified 'type'
                        deleteFile(file.path, isImage ? "image" : "video");
                        throw new Error(
                            `Invalid file type: ${file.mimetype}. Expected ${
                                type === "image" ? "images" : "videos"
                            }.`
                        );
                    }
                } catch (error) {
                    console.error(`File validation error: ${error.message}`);
                    throw error; // Rethrow to handle cleanup in the calling block
                }
            });
        }

        const addPost = {
            postedBy: { id: loginId, name: `${user.First_Name} ${user.Last_Name}` },
            location: location,
            description: description,
            type: type
        };

        if (URL.length > 0) {
            addPost.URL = URL;
        }

        // Create a new post object
        const newPost = new PostImage(addPost);
        await newPost.save();

        // Update the user's post keys
        if (Array.isArray(user.myPostKeys)) {
            user.myPostKeys.push(newPost._id);
            await user.save();
        }

        const response = {
            postId: newPost._id,
            userId: newPost.postedBy.id,
            userName: newPost.postedBy.name,
            location: newPost.location,
            description: newPost.description,
            type: newPost.type,
            URL: newPost.URL,
        }

        res.status(201).json({ status: true, message: "Post added successfully!", info: response });

    } catch (error) {

        if (URL.length > 0 && error) {
            URL.forEach((filePath) => {
                const fileType = filePath.includes("/images/") ? "image" : "video";
                deleteFile(filePath, fileType);
            });
        }
        console.log("Posted Images are removed due to error");
        console.log(error.message);
        res.status(500).json({ status: false, message: "An error occurred while posting & Posted Images are removed due to error", error: error.message });
    }
};

export const deletePost = async (req, res) => {

    try {
        const { id: loginId } = req.user;
        const { id: postId } = req.params;

        // Fetch the user
        const user = await UserDetails.findById(loginId).select("uuid _id First_Name Last_Name myPostKeys");
        if (!user) {
            return res.status(404).json({status: false, message: "User not found" });
        }

        // Fetch the post to delete
        const post = await PostImage.findById(postId);
        if (!post) {
            return res.status(404).json({status: false, message: "Post not found" });
        }

        // Check if the post belongs to the user
        if (post.postedBy.id.toString() !== loginId) {
            return res.status(403).json({ status: false, message: "Unauthorized to delete this post" });
        }

        // Delete associated files (images/videos)
        if (Array.isArray(post.URL) && post.URL.length > 0) {
            await Promise.all(
                post.URL.map(async (filePath) => {
                    const fileType = filePath.includes("/images/") ? "image" : "video";
                    deleteFile(filePath, fileType);
                })
            );
        }

        // Delete the post
        await post.deleteOne();

        // Remove the post ID from the user's myPostKeys
        user.myPostKeys = user.myPostKeys.filter((key) => key.toString() !== postId);
        await user.save();
        res.status(201).json({ status: true, message: "Post Deleted successfully!", info: user });

    } catch (error) {
       
        console.log(error.message);
        res.status(500).json({ status: false, message: "An error occurred while posting", error: error.message });
    }
};

export const getHomeFeed = async (req, res) => {
    const { id: loginId, uuid: loginuuid } = req.user;
    let { page, limit} = req.query;

    try {

        page = page ? page : 1
        limit = limit ? limit : 30

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
            .limit(limit);

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
            paginatedFeed.map(async (post, index) => {
                const prf = await UserDetails.findById(post.postedBy.id).select("userInfo");
                return {
                    localId: index + 1,
                    postId: post._id,
                    userId: post.postedBy.id,
                    userProfile: prf?.userInfo?.Profile_ImgURL || null,
                    userName: post.postedBy.name,
                    description: post.description,
                    type: post.type,
                    URL: post.URL,
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
};

export const viewCurrentPost = async(req,res) => {
    const {id: loginId} = req.user;
    const {id: postId} = req.params;
    try {
        const user = await UserDetails.findById(loginId).select("uuid _id First_Name Last_Name myPostKeys ");

        if (!user) {
            return res.status(404).json({status: false ,message: "User not found" });
        }
        console.log("PostImages", user.myPostKeys)
        
        const filteredPosts = await PostImage.findById(postId);

        const obj = {
            postId: filteredPosts._id,
            userId: filteredPosts.postedBy.id,
            userName: filteredPosts.postedBy.name,
            location: filteredPosts.location,
            description: filteredPosts.description,
            type: filteredPosts.type,
            URL: filteredPosts.URL
        }

        res.status(200).json({status: true, message: "Views", info: obj});
    } catch (error) {
        console.log(error.message)
        res.status(500).json({status: false, message: "View Post Route Causes Error"});
    }
};

export const myViewPost = async (req, res) => {
    const { uuid: loginuuid, id: userId } = req.user;
    let { page, limit } = req.query; // Extract pagination parameters

    try {
        
        page = page ? page : 1
        limit = limit ? limit : 20

        const user = await UserDetails.findById(userId).select("uuid _id First_Name Last_Name userInfo");
        if (!user) {
            return res.status(404).json({status: false, message: "User not found." });
        }

        // Count total documents for the given type
        const totalCount = await PostImage.countDocuments(query);

        let posts;
        if (page && limit) {
            // If pagination parameters are provided, fetch paginated results
            const pageNum = parseInt(page) || 1;
            const limitNum = parseInt(limit) || 20;

            posts = await PostImage.findById()
                .skip((pageNum - 1) * limitNum)
                .limit(limitNum)
                .sort({ createdAt: -1 });
        } else {
            // If no pagination parameters, fetch all posts of the given type
            posts = await PostImage.find(query).sort({ createdAt: -1 });
        }

        if (posts.length === 0) {
            return res.status(404).json({status: false, message: `No posts found for the type '${type}'.` });
        }

        // Format the response
        const formattedPosts = posts.map(post => ({
            postId: post._id,
            userId: post.postedBy?.id,
            userName: post.postedBy?.name,
            location: post.location,
            description: post.description,
            type: post.type,
            URL: post.URL
        }));

        const response = {
            LoginUser: {
                id: loginId,
                Unique: loginuuid,
                Name: `${user.First_Name} ${user.Last_Name}`,
                profile: user.userInfo.Profile_ImgURL,
                username:user.userInfo.Nickname
            },
            totalPosts: totalCount,
            posts: formattedPosts
        };

        res.status(200).json({ status: true, message: `Category ${type} Views`, info: response });
    } catch (error) {
        console.error(error.message);
        res.status(500).json({ status: false, message: "Category Views Causes Error", error: error.message });
    }
};


export const typeofViewPost = async (req, res) => {
    const { uuid: loginuuid, id: loginId } = req.user;
    const { type } = req.params; // Extract type from the route parameter
    const { page, limit } = req.query; // Extract pagination parameters

    try {
        // Validate input
        if (!type || typeof type !== "string") {
            return res.status(404).json({status: false, message: "Invalid type parameter." });
        }

        const user = await UserDetails.findById(loginId).select("uuid _id First_Name Last_Name userInfo");
        if (!user) {
            return res.status(404).json({status: false, message: "User not found." });
        }

        // Base query to filter by type
        const query = { type: type.toLowerCase() };

        // Count total documents for the given type
        const totalCount = await PostImage.countDocuments(query);

        let posts;
        if (page && limit) {
            // If pagination parameters are provided, fetch paginated results
            const pageNum = parseInt(page) || 1;
            const limitNum = parseInt(limit) || 20;

            posts = await PostImage.find(query)
                .skip((pageNum - 1) * limitNum)
                .limit(limitNum)
                .sort({ createdAt: -1 });
        } else {
            // If no pagination parameters, fetch all posts of the given type
            posts = await PostImage.find(query).sort({ createdAt: -1 });
        }

        if (posts.length === 0) {
            return res.status(404).json({status: false, message: `No posts found for the type '${type}'.` });
        }

        // Format the response
        const formattedPosts = posts.map(post => ({
            postId: post._id,
            userId: post.postedBy?.id,
            userName: post.postedBy?.name,
            location: post.location,
            description: post.description,
            type: post.type,
            URL: post.URL
        }));

        const response = {
            LoginUser: {
                id: loginId,
                Unique: loginuuid,
                Name: `${user.First_Name} ${user.Last_Name}`,
                profile: user.userInfo.Profile_ImgURL,
                username:user.userInfo.Nickname
            },
            totalPosts: totalCount,
            posts: formattedPosts,
            
        };

        res.status(200).json({ status: true, message: `Category ${type} Views`, info: response });
    } catch (error) {
        console.error(error.message);
        res.status(500).json({ status: false, message: "Category Views Causes Error", error: error.message });
    }
};

export const searchAlgorithm = async (req, res) => {
    const { type, searchQuery, limit, skip } = req.body; // Get limit and skip from request body

    try {
        const { id } = req.user;
        const user = await UserDetails.findById(id);
        if (!user) {
            return res.status(403).json({ status: false, message: "User not found" });
        }

        // Case-insensitive regex for search
        const regex = new RegExp(searchQuery, 'i');

        // Pagination defaults
        const paginationLimit = limit ? parseInt(limit) : 0; // Use 0 for unlimited if limit is not provided
        const paginationSkip = skip ? parseInt(skip) : 0;

        // Common projection fields
        const commonProjection = {
            "postedBy.id": 1,
            "postedBy.name": 1,
            URL: { $ifNull: ["$URL", "N/A"] },
        };

        let posts = [];
        switch (type?.toString().toLowerCase()) {
            case "post":
                posts = await PostImage.aggregate([
                    {
                        $match: {
                            $or: [
                                { "postedBy.name": { $regex: regex } },
                                { location: { $regex: regex } }
                            ],
                            $and: [
                                { type: { $regex: "image" } }
                            ]
                        }
                    },
                    { $project: { ...commonProjection, PostId: "$_id" } },
                    { $sort: { createdAt: -1 } },
                    { $skip: paginationSkip },
                    ...(paginationLimit ? [{ $limit: paginationLimit }] : []),
                ]);
                break;

            case "video":
                posts = await PostImage.aggregate([
                    {
                        $match: {
                            $or: [
                                { "postedBy.name": { $regex: regex } },
                                { location: { $regex: regex } },
                            ],
                            $and: [
                                { type: { $regex: "video|reel" } }
                            ]
                        }
                    },
                    { $project: commonProjection },
                    { $sort: { createdAt: -1 } },
                    { $skip: paginationSkip },
                    ...(paginationLimit ? [{ $limit: paginationLimit }] : []),
                ]);
                break;

            case "location":
                posts = await PostImage.aggregate([
                    {
                        $match: {
                            $or: [
                                { "postedBy.name": { $regex: regex } },
                                { location: { $regex: regex } }
                            ]
                        }
                    },
                    { 
                        $project: { 
                            "postedBy.id": 1, 
                            "postedBy.name": 1, 
                            location: 1
                        } 
                    },
                    { $sort: { createdAt: -1 } },
                    { $skip: paginationSkip },
                    ...(paginationLimit ? [{ $limit: paginationLimit }] : []),
                ]);
                break;

            default: // Handle "people" search as the default case
                posts = await UserDetails.aggregate([
                    {
                        $match: {
                            $or: [
                                { First_Name: { $regex: regex } },
                                { Last_Name: { $regex: regex } },
                                { "userInfo.Nickname": { $regex: regex } }
                            ]
                        }
                    },
                    {
                        $project: {
                            _id: 1,
                            uuid: 1,
                            First_Name: 1,
                            Last_Name: 1,
                            Profile_ImgURL: { $ifNull: ["$userInfo.Profile_ImgURL", "N/A"] },
                            Nickname: { $ifNull: ["$userInfo.Nickname", "N/A"] },
                        }
                    },
                    { $sort: { createdAt: -1 } },
                    { $skip: paginationSkip },
                    ...(paginationLimit ? [{ $limit: paginationLimit }] : []),
                ]);
                break;
        }

        return res.status(200).json({ status: true, message: "Data received", info: posts });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ status: false, message: "Error while executing search algorithm" });
    }
};