import mongoose from "mongoose";

const postSchema = new mongoose.Schema({
    userid: {type: String, required: true},
   textContent: {type: String, required: true},
   category: {type: String,required: true},
   isMultiple: {type: Boolean},
    image: [{
        data: Buffer,
        contentType: String
    }],
   videos: [String],
})

const PostModel = mongoose.model("post", postSchema);

export default PostModel;