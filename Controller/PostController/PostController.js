import PostImage from '../../Model/ImageModel.js';
import UserDetails from '../../Model/UserModelDetails.js';
import { deleteFile, getPlayerDetails } from '../../utilis/userUtils.js';
import eventRequest from '../../Model/eventRequestModel.js';
import {HOST, PORT, IP} from '../../env.js'
import mongoose from "mongoose";
import UserDetailsModel from '../../Model/UserModelDetails.js';


export const createPost = async (req, res) => {
    let URL = [];
    const { id: loginId , uuid: userUuid} = req.user;
    const { location, description , type} = req.body;
    try {
        console.log("Step1 loginId:", loginId,"userUuid :", userUuid )
        const user = await UserDetails.findById(loginId).select("uuid _id First_Name Last_Name myPostKeys userInfo");
        
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
                        URL.push(`${IP}/Uploads/${userUuid}/images/${file.filename}`);
                    } else if ((type === "video" || type === "reel" || type === "event") && isVideo) {
                        URL.push(`${IP}/Uploads/${userUuid}/videos/${file.filename}`);
                    } else {
                        // Invalid file type for the specified 'type'
                        deleteFile(file.path, isImage ? "image" : "video", userUuid);
                        throw new Error(`Invalid file type: ${file.mimetype}. Expected ${type === "image" ? "images" : "videos"}.`);
                    }
                } catch (error) {
                    console.error(`File validation error: ${error.message}`);
                    throw error; // Rethrow to handle cleanup in the calling block
                }
            });
        }

        const addPost = {
            postedBy: { id: loginId, name: `${user.userInfo?.Nickname}` },
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
        };

        res.status(201).json({ status: true, message: "Post added successfully!", info: response });

    } catch (error) {
        if (URL.length > 0 && error) {
            URL.forEach((filePath) => {
                const fileType = filePath.includes("/images/") ? "image" : "video";
                deleteFile(filePath, fileType, userUuid); // Correct userUuid here
            });
        }
        console.log("Posted Images are removed due to error: ", error.message);
        
        res.status(500).json({ status: false, message: "An error occurred while posting & Posted Images are removed due to error", error: error.message });
    }
};

export const deletePost = async (req, res) => {

    try {
        const { id: loginId, uuid: userUuid } = req.user;
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
                    deleteFile(filePath, fileType, userUuid);
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
    const { id: userId, uuid: userUuid } = req.user;
    let { page, limit } = req.query;
    let count= 0;
    try {
        const limitNum = parseInt(limit, 10) || 10;
        const eventLimitNum =  parseInt(limit, 10) || 10;
        const pageNum = parseInt(page, 10) || 10;
        const isPaginationRequested = parseInt(page, 10) || parseInt(limit, 10);

        // Fetch user details
        const user = await UserDetails.findById(userId).select("uuid _id following MyTeamBuild");
        if (!user) {
            return res.status(404).json({ status: false, message: "User not found" });
        }

        const following = user.following || [];
        const validFollowingIds = following.filter(id => mongoose.Types.ObjectId.isValid(id));
        const teamIds = user.MyTeamBuild.map(team => team._id).filter(id => mongoose.Types.ObjectId.isValid(id));

        // Fetch followedEvents and followedPosts
        const [followedEvents, followedPosts] = await Promise.all([
            eventRequest.find().sort({ createdAt: -1 })
              .skip(isPaginationRequested ? (pageNum - 1) * eventLimitNum : 0)
              .limit(eventLimitNum),

            validFollowingIds.length > 0
                ? PostImage.find({ "postedBy.id": { $in: validFollowingIds } }).sort({ createdAt: -1 })
                  .skip(isPaginationRequested ? (pageNum - 1) * limitNum : 0)
                  .limit(isPaginationRequested ? limitNum : 10)
                : []
        ]);

        // Fetch unfollowedEvents and unfollowedPosts
        const [unfollowedEvents, unfollowedPosts] = await Promise.all([
            eventRequest
            .find()
            .sort({ createdAt: -1 })
            .skip(isPaginationRequested ? (pageNum - 1) * eventLimitNum : 0)
            .limit(eventLimitNum),

             PostImage.find({
                "postedBy.id": { $nin: validFollowingIds },
                })
                .sort({ createdAt: -1 })
                .skip(isPaginationRequested ? (pageNum - 1) * limitNum : 0)
                .limit(isPaginationRequested ? limitNum : 10)
            ,
        ]);

        // Combine events and posts and remove duplicates
        let combinedFeed = [];

        // Add followedEvents if available
        followedEvents.forEach(event => {
            combinedFeed.push({ ...event.toObject(), type: "event" }); 
        });

        // Add followedPosts and ensure uniqueness
        followedPosts.forEach(post => {
            combinedFeed.push({ ...post.toObject(), type: "post" });
        });

        // Add unfollowedEvents if available
        unfollowedEvents.forEach(event => {
            combinedFeed.push({ ...event.toObject(), type: "event" });
        });

        // Add unfollowedPosts and ensure uniqueness
        unfollowedPosts.forEach(post => {
            combinedFeed.push({ ...post.toObject(), type: "post" });
        });

        // Add trending posts if necessary
        const trendingPosts = await PostImage.find({ type: { $in: ["video", "reel", "image", "event"] } })
            .sort({ likesCount: -1 })
            .limit(limitNum);

        trendingPosts.forEach(post => {
            combinedFeed.push({ ...post.toObject(), type: "post" });
        });

        // Check if more data exists for infinite scroll (pagination based)
        const hasMore = isPaginationRequested ? (combinedFeed.length === limitNum) : true;

        // Separate the posts and events into two arrays
        const posts = combinedFeed.filter(item => item.type === "post");
        const events = combinedFeed.filter(item => item.type === "event");

        // Sort each array by createdAt in descending order
        posts.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        events.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

        // Merge the arrays alternately
        let result = [];
        let i = 0, j = 0;
        while (i < posts.length || j < events.length) {
        if (j < events.length) {
            result.push(events[j]);
            j++;
        }
        if (i < posts.length) {
            result.push(posts[i]);
            i++;
        }
        }

        combinedFeed = result;
        // Format the response
        const response = await Promise.all(
            combinedFeed.map(async (item, index) => {

                if (item.type === "post") {
                    const prf = await UserDetails.findById(item.postedBy.id).select("uuid userInfo");
                    return {
                        localId: index + 1,
                        postId: item._id,
                        userId: item.postedBy.id,
                        userUuid: prf?.uuid,
                        userProfile: prf?.userInfo?.Profile_ImgURL,
                        userName: prf?.userInfo?.Nickname,
                        description: item.description,
                        type: item.type,
                        URL: item.URL[0],
                        lc: item.likes.length,
                        location: item.location,
                        isLiked: item.likes.some(like => like.likedByUuid === userUuid.toString()),
                        createdAt: item.createdAt
                    };
                } else if (item.type === "event") {
                 
                    if (!item.myTeam) {
                        console.log("item.myTeam is missing", item);
                        return null; // Skip processing if myTeam is undefined
                      }
                    
                      const users = await UserDetails.find({ "MyTeamBuild.role": "captain" }).select("MyTeamBuild");
                    
                      const teamDetails = users
                        ?.flatMap(user => user.MyTeamBuild)
                        .find(team => team._id.equals(item.myTeam ? item.myTeam.toString() : ""));
                    
                      if (!teamDetails) {
                        console.log("No matching team found for item.myTeam:", item.myTeam);
                        return null;
                      }
                    
                      const myTeamPlayers = await Promise.all(
                        teamDetails.playersList.map(player => getPlayerDetails(player, teamDetails.createdBy))
                      );
                    
                      return {
                        postId: item._id,
                        userId: item.eventBy?.id,
                        userName: item.eventBy?.name,
                        myTeam: {
                          myTeamId: teamDetails?._id,
                          myTeamName: teamDetails?.Team_Name,
                          sportsName: teamDetails?.Sports_Name,
                          playerList: myTeamPlayers,
                        },
                        type: "event",
                        status: item.status,
                        eventTime: item.eventTime,
                        location: item.loc,
                        link: item.link,
                        createdAt: item.createdAt,
                      };
                }
            })
        );

        return res.status(200).json({
            status: true,
            message: "Home feed fetched successfully",
            feed: response,
            hasMore: hasMore
        });
    } catch (error) {
        console.error(error.message);
        res.status(500).json({ status: false, message: "Error fetching home feed", error: error.message });
    }
};
/*
// working good latest
export const getHomeFeed = async (req, res) => {
    const { id: userId, uuid: userUuid } = req.user;
    let { page, limit } = req.query;

    try {
        const limitNum = parseInt(limit, 10) || 10;
        const eventLimitNum =  parseInt(limit, 10) || 10;
        const pageNum = parseInt(page, 10) || 10;
        const isPaginationRequested = parseInt(page, 10) || parseInt(limit, 10);

        // Fetch user details
        const user = await UserDetails.findById(userId).select("uuid _id following MyTeamBuild");
        if (!user) {
            return res.status(404).json({ status: false, message: "User not found" });
        }

        const following = user.following || [];
        const validFollowingIds = following.filter(id => mongoose.Types.ObjectId.isValid(id));
        const teamIds = user.MyTeamBuild.map(team => team._id).filter(id => mongoose.Types.ObjectId.isValid(id));

        // Fetch followedEvents and followedPosts
        const [followedEvents, followedPosts] = await Promise.all([
            eventRequest.find().sort({ createdAt: -1 })
              .skip(isPaginationRequested ? (pageNum - 1) * eventLimitNum : 0)
              .limit(eventLimitNum),

            validFollowingIds.length > 0
                ? PostImage.find({ "postedBy.id": { $in: validFollowingIds } }).sort({ createdAt: -1 })
                  .skip(isPaginationRequested ? (pageNum - 1) * limitNum : 0)
                  .limit(isPaginationRequested ? limitNum : 10)
                : []
        ]);

        // Fetch unfollowedEvents and unfollowedPosts
        const [unfollowedEvents, unfollowedPosts] = await Promise.all([
            eventRequest
            .find()
            .sort({ createdAt: -1 })
            .skip(isPaginationRequested ? (pageNum - 1) * eventLimitNum : 0)
            .limit(eventLimitNum),

             PostImage.find({
                "postedBy.id": { $nin: validFollowingIds },
                })
                .sort({ createdAt: -1 })
                .skip(isPaginationRequested ? (pageNum - 1) * limitNum : 0)
                .limit(isPaginationRequested ? limitNum : 10)
            ,
        ]);

        // Combine events and posts and remove duplicates
        let combinedFeed = [];

        // Add followedEvents if available
        followedEvents.forEach(event => {
            combinedFeed.push({ ...event.toObject(), type: "event" }); 
        });

        // Add followedPosts and ensure uniqueness
        followedPosts.forEach(post => {
            combinedFeed.push({ ...post.toObject(), type: "post" });
        });

        // Add unfollowedEvents if available
        unfollowedEvents.forEach(event => {
            combinedFeed.push({ ...event.toObject(), type: "event" });
        });

        // Add unfollowedPosts and ensure uniqueness
        unfollowedPosts.forEach(post => {
            combinedFeed.push({ ...post.toObject(), type: "post" });
        });

        // Add trending posts if necessary
        const trendingPosts = await PostImage.find({ type: { $in: ["video", "reel", "image", "event"] } })
            .sort({ likesCount: -1 })
            .limit(limitNum);

        trendingPosts.forEach(post => {
            combinedFeed.push({ ...post.toObject(), type: "post" });
        });

        // Check if more data exists for infinite scroll (pagination based)
        const hasMore = isPaginationRequested ? (combinedFeed.length === limitNum) : true;

        // Separate the posts and events into two arrays
        const posts = combinedFeed.filter(item => item.type === "post");
        const events = combinedFeed.filter(item => item.type === "event");

        // Sort each array by createdAt in descending order
        posts.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        events.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

        // Merge the arrays alternately
        let result = [];
        let i = 0, j = 0;
        while (i < posts.length || j < events.length) {
        if (j < events.length) {
            result.push(events[j]);
            j++;
        }
        if (i < posts.length) {
            result.push(posts[i]);
            i++;
        }
        }

        combinedFeed = result;
        // Format the response
        const response = await Promise.all(
            combinedFeed.map(async (item, index) => {

                if (item.type === "post") {
                    const prf = await UserDetails.findById(item.postedBy.id).select("uuid userInfo");
                    return {
                        localId: index + 1,
                        postId: item._id,
                        userId: item.postedBy.id,
                        userUuid: prf?.uuid,
                        userProfile: prf?.userInfo?.Profile_ImgURL,
                        userName: prf?.userInfo?.Nickname,
                        description: item.description,
                        type: item.type,
                        URL: item.URL[0],
                        lc: item.likes.length,
                        location: item.location,
                        isLiked: item.likes.some(like => like.likedByUuid === userUuid.toString()),
                        createdAt: item.createdAt
                    };
                } else if (item.type === "event") {
                    const users = await UserDetails.find({ "MyTeamBuild.role": "captain" }).select("MyTeamBuild");

                    const teamDetails = users
                        .map(user => user.MyTeamBuild.find(team => team._id.equals(item.myTeam)))
                        .filter(team => team !== undefined);

                    return {
                        postId: item._id,
                        userId: item.eventBy?.id,
                        userName: item.eventBy?.name,
                        myTeam: teamDetails.length > 0 ? teamDetails.map(team => ({
                            myTeamId: team._id,
                            myTeamName: team.teamName || "TeamName",
                            sportsName:team.sportsName|| "SportName",
                            playerList: team.playersList,
                        })) : null,
                        type:"event",
                        status: item.status,
                        eventTime: item.eventTime,
                        location: item.loc,
                        link: item.link,
                        createdAt: item.createdAt
                    };
                }
            })
        );

        return res.status(200).json({
            status: true,
            message: "Home feed fetched successfully",
            feed: response,
            hasMore: hasMore
        });
    } catch (error) {
        console.error(error.message);
        res.status(500).json({ status: false, message: "Error fetching home feed", error: error.message });
    }
};*/

export const viewCurrentPost = async(req,res) => {
    const {id: userId} = req.user;
    const {id: postId} = req.params;
    try {
        const user = await UserDetails.findById(userId).select("uuid _id First_Name Last_Name myPostKeys ");

        if (!user) {
            return res.status(404).json({status: false ,message: "User not found" });
        }

        const filteredPosts = await PostImage.findById(postId);

        const obj = {
            postId: filteredPosts._id,
            userId: filteredPosts.postedBy.id,
            userName: filteredPosts.postedBy.name,
            location: filteredPosts.location,
            description: filteredPosts.description,
            type: filteredPosts.type,
            URL: filteredPosts.URL,
            likeCount: filteredPosts.likes.length,
        }

        res.status(200).json({status: true, message: "Views", info: obj});
    } catch (error) {
        console.log(error.message)
        res.status(500).json({status: false, message: "View Post Route Causes Error"});
    }
};

export const typeofViewPost = async (req, res) => {
    const { uuid: userUuid, id: userId } = req.user;
    const { type } = req.params; // Extract type from the route parameter
    const { page, limit } = req.query; // Extract pagination parameters

    try {
        // Validate input
        if (!type || typeof type !== "string") {
            return res.status(404).json({ status: false, message: "Invalid type parameter." });
        }

        const user = await UserDetails.findById(userId).select("uuid _id First_Name Last_Name userInfo");
        if (!user) {
            return res.status(404).json({ status: false, message: "User not found." });
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
            return res.status(404).json({ status: false, message: `No posts found for the type '${type}'.` });
        }

        // Shuffle the posts
        for (let i = posts.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [posts[i], posts[j]] = [posts[j], posts[i]];
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
                id: userId,
                Unique: userUuid,
                Name: `${user.First_Name} ${user.Last_Name}`,
                profile: user.userInfo.Profile_ImgURL,
                username: user.userInfo.Nickname
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
    const { id: userId, uuid: userUuid } = req.user;
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

                case "yours":
                    // Step 1: Fetch the current user's followers and following lists
                    const currentUser = await UserDetails.findById(userId);
                    if (!currentUser) {
                        return res.status(404).json({ message: "User not found" });
                    }

                    // Extract user IDs from followers and following
                    const followers = currentUser.followers.map(f => f.follwersBy_id);  
                    const following = currentUser.following.map(f => f.followingBy_id);  

                    // Combine the followers and following arrays
                    const usersToMatch = [...followers, ...following];  

                    const formate = await UserDetails.find({
                        _id: { $in: usersToMatch },
                        $or: [
                            { First_Name: { $regex: regex } },  // Case-insensitive search on First_Name
                            { Last_Name: { $regex: regex} },   // Case-insensitive search on Last_Name
                            { "userInfo.Nickname": { $regex: regex } }  // Case-insensitive search on Nickname
                        ]
                    })
                    .select("uuid First_Name Last_Name userInfo.Profile_ImgURL userInfo.Nickname")  // Select only the needed fields
                    .skip(paginationSkip)  // Apply skip for pagination
                    .limit(paginationLimit || 0); 
                
                    // Restructure the data to match the required format
                    posts = formate.map(post => ({
                        _id: post._id,
                        uuid: post.uuid,
                        First_Name: post.First_Name,
                        Last_Name: post.Last_Name,
                        Profile_ImgURL: post.userInfo?.Profile_ImgURL || "N/A",  // Fallback if Profile_ImgURL is missing
                        Nickname: post.userInfo?.Nickname || "N/A"  // Fallback if Nickname is missing
                    }));

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


/* home feed

export const getHomeFeed = async (req, res) => {
    const { id: userId, uuid: userUuid } = req.user;
    let { page, limit } = req.query;
    try {
        const pageNum = parseInt(page, 10) || 1;
        const limitNum = parseInt(limit, 10) || 10;

        // Fetch user details
        const user = await UserDetails.findById(userId).select("uuid _id following");
        if (!user) {
            return res.status(404).json({ status: false, message: "User not found" });
        }

        const following = user.following || []; // Users the current user follows
        let feed = []; // Array to hold the final feed

        // Step 1: HashSet for liked posts
        const likedPosts = new Set(
            (
                await PostImage.find({ "likes.likedById": userUuid }).select("_id")
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
            type: { $in: ["video", "reel", "image", "event"] }
        })
            .sort({ likesCount: -1 }) // Sort by likes count
            .limit(limitNum);

        feed.push(...trendingPosts);

        // Step 4: Random posts for new users
        if (following.length === 0) {
            const randomPosts = await PostImage.aggregate([{ $sample: { size: limitNum } }]);
            feed = feed.concat(randomPosts);
        }

        // Shuffle the feed array (Fisher-Yates shuffle)
        for (let i = feed.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [feed[i], feed[j]] = [feed[j], feed[i]];
        }

        // Paginate the feed
        const startIndex = (pageNum - 1) * limitNum;
        const paginatedFeed = feed.slice(startIndex, startIndex + limitNum);

        // Step 5: Format the response (Resolve all promises)
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

*/