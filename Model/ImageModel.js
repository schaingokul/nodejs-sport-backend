import mongoose from "mongoose";

const CommentSchema = new mongoose.Schema(
  {
    commentBy_id: { type: String },
    comment: { type: String },
    createdAt: { type: Date, default: Date.now }, 
  },
  { _id: false } 
);

const LikesSchema = new mongoose.Schema(
  {
    LikedBy_id: { type: String },
    createdAt: { type: Date, default: Date.now }, 
  },
  { _id: false } 
);

const ImageSchema = new mongoose.Schema(
  {
    uuid: { type: String },
    PostBy_Name: { type: String },
    PostImage_URL: {type: String, required: true},
    Location: { type: String, required: true },
    Likes: [LikesSchema],
    Comments: [CommentSchema],
    description: { type: String, required: true },
  },
  { timestamps: true } 
);

const ImageModel = mongoose.model("postImage", ImageSchema);

export default ImageModel;

/*
const postSchema = new mongoose.Schema({
    userid: { type: String, required: true },
    textContent: { type: String, required: true },
    category: { type: String, required: true },
    isMultiple: { type: Boolean },
    image: [{
        data: Buffer,
        contentType: String
    }],
    videos: [String],
})

PostModel = mongoose.model("post", postSchema);
*/
