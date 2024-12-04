import PostImage from '../Model/ImageModel.js';
import UserDetails from '../Model/UserModelDetails.js';

export const postAdd = async (req, res) => {
    const { uuid } = req.user;
    const { Location, description } = req.body;

    try {
        const user = await UserDetails.findOne({ uuid }).select("uuid _id First_Name Last_Name myPostKeys");
        if (!user) {
            return res.status(200).json({ status: false, message: "User not found" });
        }

         let PostImage_URL = [];
         let videoImageURL = [];

         if (req?.files?.PostImage_URL && req.files.PostImage_URL.length > 0) {
            PostImage_URL = req.files.PostImage_URL.map(file => `http://localhost:4500/uploads/images/${file.filename}`);
         }

         if (req?.files?.videoImageURL && req.files.videoImageURL.length > 0) {
            videoImageURL = req.files.videoImageURL.map(file => `http://localhost:4500/uploads/videos/${file.filename}`);
         }

         const postCount = await PostImage.countDocuments(); 
         let postKey = postCount + 1;
 
         const addPost = {
             P_Id: `post_${postKey}`,
             PostBy_Name: `${user.First_Name} ${user.Last_Name}`,
             Location: Location,
             description: description,
         };

         if (PostImage_URL.length > 0) {
            addPost.PostImage_URL = PostImage_URL;
        } else if (videoImageURL.length > 0) {
            addPost.Video_ImgURLs = videoImageURL;
        }

         const newPost = new PostImage(addPost);
         await newPost.save(); 

         if (Array.isArray(user.myPostKeys)) {
            user.myPostKeys.push(newPost.P_Id);
            await user.save();
        }

        res.status(201).json({ status: true, message: "Posts added successfully!", info: addPost});

    } catch (error) {
        console.log(error);
        res.status(500).json({ status: false, message: "An error occurred while posting" });
    }
};


export const postView = async(req,res) => {
    const {uuid} = req.user;
    try {
        const user = await UserDetails.findOne({uuid}).select("uuid _id First_Name Last_Name myPostKeys");
        
        if (!user) {
            return res.status(200).json({ status: false, message: "User not found" });
        }
        console.log("PostImages", user.myPostKeys)
        const get= user.myPostKeys;
        const imageInfo = await PostImage.find()
        const filteredPosts = imageInfo.filter(post => get.includes(post.P_Id));
        console.log(filteredPosts)
        res.status(200).json({status: true, message: "Views", info: filteredPosts});
    } catch (error) {
        console.log(error.message)
        res.status(200).json({status: false, message: "View Post Route Causes Error"});
    }
};


export const postCurrentView = async(req,res) => {
    const {uuid} = req.user;
    const {id} = req.params;
    try {
        const user = await UserDetails.findOne({uuid}).select("uuid _id First_Name Last_Name myPostKeys");
        
        if (!user) {
            return res.status(200).json({ status: false, message: "User not found" });
        }
        console.log("PostImages", user.myPostKeys)
        
        const filteredPosts = await PostImage.find({P_Id: id})
        console.log(filteredPosts)
        res.status(200).json({status: true, message: "Views", info: filteredPosts});
    } catch (error) {
        console.log(error.message)
        res.status(200).json({status: false, message: "View Post Route Causes Error"});
    }
};


export const postLike = async(req,res) => {
    const {id} = req.params;
    const {uuid} = req.user;
    try {
        const post = await PostImage.findById(id);
        if (!post) {
            return res.status(200).json({ status: false, message: "Post not found" });
        }

        const likeIndex = post.Likes.findIndex((like) => like.LikedBy_id === uuid);

        if (likeIndex !== -1) {
           
            post.Likes.splice(likeIndex, 1);
            await post.save();
            return res.status(200).json({ status: true, message: "Like removed", Data: post });
        }

        post.Likes.push({ LikedBy_id: uuid }); 
        await post.save();

        console.log(`Login_Id ${uuid} liked post id ${id}`);
        res.status(201).json({ status: true, message: "Liked", Data: post });
    } catch (error) {
        console.log(error)
        res.status(200).json({status: false, message: "Like Post Route Causes Error"});
    }
 };

 export const postComment = async(req,res) => {
    const {id} = req.params;
    const {uuid} = req.user;
    const {comment} = req.body;
    try {
        const post = await PostImage.findOne({id});
        if (!post) {
            return res.status(200).json({ status: false, message: "Post not found" });
        }
        
        post.Comments.push({
            commentBy_id: uuid, 
            comment: comment, 
        });
        
        await post.save();

        console.log(`Login_Id ${uuid} Comment post id ${id}`);
        res.status(201).json({ status: true, message: "Added Comments", Data: post });
    } catch (error) {
        console.log(error)
        res.status(200).json({status: false, message: "Like Post Route Causes Error"});
    }
 }

















/*
export const createPost = async(req,res) => {
    const {id, category, textContent, isMultiple} = req.body;
    try {
        console.log("step1")
        const user = await UserModel.findById({_id: id});
        console.log(`${user} step2`)
        
        
        if(user.id != id){
            return res.status(400).json({status: false, message: "Kindly please Login / signup"})
        }
        console.log(`${user.id} step3`)

        const images = await req.files.image
            ? req.files.image.map(file => ({
                data: file.filename,
                contentType: file.mimetype,
            }))
            : [];
        console.log(`${images} step4`);

        const videoFiles = req.files.videos
            ? req.files.videos.map(file => file.filename)
            : [];
        console.log(`${videoFiles} step5`)

        const newPost = new PostModel({
            userid: id,
            textContent,
            category,
            isMultiple,
            image: images,
            videos: videoFiles
        });
        console.log(`${newPost} step6`)
        
        await newPost.save(); 
        res.status(201).json({status: true, message: "Sucessfully Uploaded", newPost})
    } catch (error) {
        res.status(500).json({status: false, message: "Upload Failed"})
    }
};

export const ViewPost = async(req,res) => {
    const {imageId} = req.body;
    try {
        const postDetails = await PostModel.findById({_id: imageId});

        if (!postDetails || !postDetails.image || !postDetails.image[0]) {
            return res.status(404).json({ status: false, message: "Post not found" });
        }
        
        const base64Image = postDetails.image[0].data.toString('base64');
        res.status(200).json({
            status: true,
            message: "View Post",
            contentType: postDetails.image[0].contentType,
            image: `data:${postDetails.image[0].contentType};base64,${base64Image}`
        });

    } catch (error) {
        res.status(500).json({ status: false, message: `View Post Router Error: ${error.message}`})
    }
}*/