


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
}