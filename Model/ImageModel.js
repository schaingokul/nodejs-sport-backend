import mongoose from "mongoose";

const CommentSchema = new mongoose.Schema(
  {
    commentById: { type: String },
    comment: { type: String },
    createdAt: { type: Date, default: Date.now }, 
  },
  { _id: true } 
);

const LikesSchema = new mongoose.Schema(
  {
    likedById: { type: String },
    createdAt: { type: Date, default: Date.now }, 
  },
  { _id: false } 
);

const ImageDetailsSchema = new mongoose.Schema({
    postedBy: { id: { type: mongoose.Schema.Types.ObjectId, ref: 'UserDetails', required: true }, name: { type: String, required: true },},
    URL: { type: [String] , default: []},
    location: { type: String, required: true },
    type: { type: String, required: true, enum:["image", "video", "reel","event"] },
    likes: [LikesSchema],
    comments: [CommentSchema],
    description: { type: String, required: true }
},
{ timestamps: true }      
);

const ImageModel = mongoose.model("postImage", ImageDetailsSchema);

export default ImageModel;
