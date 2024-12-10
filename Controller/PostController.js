import PostImage from '../Model/ImageModel.js';
import UserDetails from '../Model/UserModelDetails.js';
import mongoose from 'mongoose';
import { deleteFile } from '../utilis/userUtils.js';

export const postAdd = async (req, res) => {
    let session;
    let URL = [];
    try {
        const { id: loginId } = req.user;
        const { location, description , type} = req.body;
        
        const user = await UserDetails.findById(loginId).select("uuid _id First_Name Last_Name myPostKeys");
        if (!user) {
            return res.status(200).json({ status: false, message: "User not found" });
        }

        if (req?.files?.imageURL && req.files.imageURL.length > 0) {
            URL = req.files.imageURL.map(file => `http://localhost:4500/uploads/images/${file.filename}`);
        }

        if (req?.files?.videoURL && req.files.videoURL.length > 0) {
            URL = req.files.videoURL.map(file => `http://localhost:4500/uploads/videos/${file.filename}`);
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

        // Start transaction-like flow
        session = await mongoose.startSession();
        session.startTransaction();

        // Create a new post object
        const newPost = new PostImage(addPost);
        await newPost.save({ session });

        // Update the user's post keys
        if (Array.isArray(user.myPostKeys)) {
            user.myPostKeys.push(newPost._id);
            await user.save({ session });
        }

        // Commit the transaction if everything is successful
        await session.commitTransaction();
        session.endSession();

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
        if (session) {
            await session.abortTransaction();
            session.endSession();
        }
        
        // Delete files if they were uploaded
        try {
            if (URL.length > 0) {
                URL.forEach(file => deleteFile(file, 'image'))}

            if (URL.length > 0) {
                URL.forEach(file =>  deleteFile(file, 'videos'))}

        } catch (fileError) {
            console.error("Error deleting files:", fileError);
        }

        console.log(error.message);
        res.status(500).json({ status: false, message: "An error occurred while posting", error: error.message });
    }
};


export const deletePost = async (req, res) => {
    let session;
    let URL = [];
    try {
        const { id: loginId } = req.user;
        const { location, description , type} = req.body;
        
        const user = await UserDetails.findById(loginId).select("uuid _id First_Name Last_Name myPostKeys");
        if (!user) {
            return res.status(200).json({ status: false, message: "User not found" });
        }

        if (req?.files?.imageURL && req.files.imageURL.length > 0) {
            URL = req.files.imageURL.map(file => `http://localhost:4500/uploads/images/${file.filename}`);
        }

        if (req?.files?.videoURL && req.files.videoURL.length > 0) {
            URL = req.files.videoURL.map(file => `http://localhost:4500/uploads/videos/${file.filename}`);
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

        // Start transaction-like flow
        session = await mongoose.startSession();
        session.startTransaction();

        // Create a new post object
        const newPost = new PostImage(addPost);
        await newPost.save({ session });

        // Update the user's post keys
        if (Array.isArray(user.myPostKeys)) {
            user.myPostKeys.push(newPost._id);
            await user.save({ session });
        }

        // Commit the transaction if everything is successful
        await session.commitTransaction();
        session.endSession();

        const response = {
            postId: newPost._id,
            userId: newPost.postedBy.id,
            userName: newPost.postedBy.name,
            location: newPost.location,
            description: newPost.description,
            type: newPost.type,
            URL: newPost.URL,
        }

        res.status(201).json({ status: true, message: "Post Deleted successfully!", info: response });

    } catch (error) {
        if (session) {
            await session.abortTransaction();
            session.endSession();
        }
        
        // Delete files if they were uploaded
        try {
            if (URL.length > 0) {
                URL.forEach(file => deleteFile(file, 'image'))}

            if (URL.length > 0) {
                URL.forEach(file =>  deleteFile(file, 'videos'))}

        } catch (fileError) {
            console.error("Error deleting files:", fileError);
        }

        console.log(error.message);
        res.status(500).json({ status: false, message: "An error occurred while posting", error: error.message });
    }
};

export const postView = async(req,res) => {
    const {uuid: loginuuid, id: loginId} = req.user;
    try {
        const user = await UserDetails.findOne({uuid: loginuuid}).select("uuid _id First_Name Last_Name myPostKeys");
        
        if (!user) {
            return res.status(200).json({ status: false, message: "User not found" });
        }

        // Check if the user has posts (myPostKeys should not be empty)
        if (!user.myPostKeys || user.myPostKeys.length === 0) {
            return res.status(200).json({ status: true, message: "No posts available" });
        }

        // Query only the posts related to the user's post keys
        const posts = await PostImage.find({ _id: { $in: user.myPostKeys } }).select("postedBy location description type URL likes comments");
        
        // Map over the posts to create the response format
        const filteredPosts = posts.map(post => ({
            postId: post._id,
            userId: post.postedBy.id,
            userName: post.postedBy.name,
            location: post.location,
            description: post.description,
            type: post.type,
            URL: post.URL,
            likes: post.likes,
            comments: post.comments
        }));
        
        const response = {
            LoginUser: {
                id: loginId,
                Unique: loginuuid,
                Name: `${user.First_Name} ${user.Last_Name}`
            },
            post: filteredPosts
            
        }
        res.status(200).json({status: true, message: "Views", info: response});
    } catch (error) {
        console.log(error.message)
        res.status(200).json({status: false, message: "View Post Route Causes Error"});
    }
};

export const postCurrentView = async(req,res) => {
    const {id: loginId} = req.user;
    const {id: postId} = req.params;
    try {
        const user = await UserDetails.findById(loginId).select("uuid _id First_Name Last_Name myPostKeys ");

        if (!user) {
            return res.status(200).json({ status: false, message: "User not found" });
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
            URL: filteredPosts.URL,
            likes: filteredPosts.likes,
            comments: filteredPosts.comments
        }

        res.status(200).json({status: true, message: "Views", info: obj});
    } catch (error) {
        console.log(error.message)
        res.status(200).json({status: false, message: "View Post Route Causes Error"});
    }
};

export const typeView = async (req, res) => {
    const { uuid: loginuuid, id: loginId } = req.user;
    const { type } = req.params;
    const { page = 1, limit = 20 } = req.query;

    try {
        // Validate input
        if (!type || typeof type !== "string") {
            return res.status(400).json({ status: false, message: "Invalid type parameter." });
        }
        if (isNaN(page) || page <= 0 || isNaN(limit) || limit <= 0) {
            return res.status(400).json({ status: false, message: "Invalid pagination parameters." });
        }

        const user = await UserDetails.findById(loginId).select("uuid _id First_Name Last_Name");
        if (!user) {
            return res.status(404).json({ status: false, message: "User not found" });
        }
        
        // Ensure the query is filtering by `type` properly
        const totalCount = await PostImage.countDocuments({ type: type.toLowerCase().toString() }); // Case-insensitive match
        
        const posts = await PostImage.find({ type: type.toLowerCase() }) // Filter posts by `type`
            .skip((parseInt(page) - 1) * parseInt(limit)) // Paginate results
            .limit(parseInt(limit)) // Limit results
            .sort({ createdAt: -1 }); // Sort by creation date

        if (!posts || posts.length === 0) {
            return res.status(404).json({ status: false, message: "No posts found for this type." });
        }

        // Format the response
        const formattedPosts = posts.map(post => ({
            postId: post._id,
            userId: post.postedBy.id,
            userName: post.postedBy.name,
            location: post.location,
            description: post.description,
            type: post.type,
            URL: post.URL,
            likes: post.likes,
            comments: post.comments
        }));

        const response = {
            LoginUser: {
                id: loginId,
                Unique: loginuuid,
                Name: `${user.First_Name} ${user.Last_Name}`
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

export const postLike = async(req,res) => {
    const {id: postId} = req.params;
    const {uuid: UniqueUser} = req.user;
    try {
        const post = await PostImage.findById(postId);
        if (!post) {
            return res.status(200).json({ status: false, message: "Post not found" });
        }

        const likeIndex = post.likes.findIndex((like) => like.likedById === UniqueUser);

        if (likeIndex !== -1) {
           
            post.likes.splice(likeIndex, 1);
            await post.save();
            return res.status(200).json({ status: true, message: "UnLike the Post", Data: post });
        }

        post.likes.push({ likedById: UniqueUser }); 
        await post.save();

        console.log(`Login_Id ${UniqueUser} liked post id ${loginUser}`);
        res.status(201).json({ status: true, message: "Like the Post", Data: post });
    } catch (error) {
        console.log(error)
        res.status(200).json({status: false, message: "Like Post Route Causes Error"});
    }
 };

 export const createComment = async(req,res) => {
    const {id: postId} = req.params;
    const {uuid: loginuuid} = req.user;
    const {comment} = req.body;
    try {
        const post = await PostImage.findById(postId);
        if (!post) {
            return res.status(200).json({ status: false, message: "Post not found" });
        }
        
        post.comments.push({
            commentById: loginuuid, 
            comment: comment, 
        });
        
        await post.save();

        console.log(`Login_Id ${loginuuid} Comment post id ${postId}`);
        res.status(201).json({ status: true, message: "Added Comments", Data: post });
    } catch (error) {
        console.log(error.message)
        res.status(200).json({status: false, message: "Comment Post Route Causes Error"});
    }
 }


 export const deleteComment = async (req, res) => {
    const { id: postId } = req.params; // Post ID
    const { commentId } = req.body;   // Comment ID to delete

    try {
        const result = await PostImage.updateOne(
            { _id: postId }, // Match the post
            { $pull: { comments: { _id: commentId } } } // Remove the comment
        );
        return res.status(200).json({status: true,message:`Comment ${commentId} deleted from post ${postId}`});
    } catch (error) {
        console.error(error);
        return res.status(500).json({
            status: false,
            message: "Error while deleting the comment",
        });
    }
};















