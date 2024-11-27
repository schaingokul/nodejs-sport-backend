import PostImage from '../Model/ImageModel.js';
import UserDetails from '../Model/UserModelDetails.js';

export const postAdd = async(req,res) => {
    const {uuid}= req.user;
    const {PostImage_URL, Location, description} = req.body;
    try {
        const user = await UserDetails.findOne({uuid}).select("uuid _id First_Name Last_Name")
        
        if (!user) {
            return res.status(200).json({ status: false, message: "User not found" });
        }

        const newPost = new PostImage({
            uuid: `${user.uuid}`,
            PostBy_Name: `${user.First_Name} ${user.Last_Name}`,
            PostImage_URL: PostImage_URL,
            Location: Location,
            description: description,
        })

        await newPost.save();

        res.status(201).json({status: true, message: "Posted"});
    } catch (error) {
        console.log(error)
        res.status(200).json({status: false, message: "Post Route Causes Error"});
    }
};

export const postView = async(req,res) => {
    const {uuid} = req.user;
    try {
        
        const user = await UserDetails.findOne({uuid}).select("uuid _id First_Name Last_Name");
        
        if (!user) {
            return res.status(200).json({ status: false, message: "User not found" });
        }

        const imageInfo = await PostImage.find();
        res.status(200).json({status: true, message: "Views", info: imageInfo});
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
        const post = await PostImage.findById(id);
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