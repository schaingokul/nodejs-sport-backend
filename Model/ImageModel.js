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

const ImageDetailsSchema = new mongoose.Schema({
    P_Id: { type: String, required: true, unique: true },
    PostBy_Name: { type: String },
    PostImage_URL: { type: [String] },
    PostVideo_URL: { type: [String] },
    Location: { type: String, required: true },
    Likes: [LikesSchema],
    Comments: [CommentSchema],
    description: { type: String, required: true }
},{ timestamps: true }      
);


const ImageModel = mongoose.model("postImage", ImageDetailsSchema);

export default ImageModel;
