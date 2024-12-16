import mongoose from "mongoose";

const CommentSchema = new mongoose.Schema(
  {
    commentBy: { type: String },
    comment: { type: String },
    createdAt: { type: Date, default: Date.now }, 
  },
  { _id: true } 
);

const LikesSchema = new mongoose.Schema(
  {
    likedByUuid: { type: String }, 
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

// Create an index on 'postedBy.id' for faster lookups
ImageDetailsSchema.index({ "postedBy.id": 1 });
ImageDetailsSchema.index({ location: 1 });
ImageDetailsSchema.index({ type: 1 });
ImageDetailsSchema.index({ description: "text" });

const ImageModel = mongoose.model("postImage", ImageDetailsSchema);

export default ImageModel;
