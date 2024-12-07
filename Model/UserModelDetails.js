import mongoose from "mongoose";

// User Information Subdocument Schema
export const userInfoSchema = new mongoose.Schema(
  {
    Profile_ImgURL: { type: String },// Profile Image URL
    Nickname: { type: String },// Nickname
    Phone_Number: { type: String, sparse: true, default: "N/A"},// Contact Number
    Date_of_Birth: { type: Date},// Date of Birth
    Gender: {type: String, enum: ["Male", "Female", "Transgender"]},// Gender
    Education: { school: [{ type: String }], college: [{ type: String }]},// Education
    Work: { type: String },// Work
    Club: { type: String },// Club
  },
  { _id: false } // _id: false so it doesn't create a separate _id for this subdocument
);


// certificate Information Subdocument Schema
/*export const certificateInfoSchema = new mongoose.Schema(
  {
    Occasion: { type: String },
    Month_Year: { type: String, required: true }, 
    Upload_certificate: { type: String }, 
    Upload_Photos:{type: String}
  },
  { _id: true } // Create an internal `_id` for this subdocument
);
*/


// Sports Information Subdocument Schema
export const sportInfoSchema = new mongoose.Schema(
  {
    Sports_ImgURL: { type: String }, // Sports Image URL
    Sports_Name: { type: String, required: true }, // Game's Sports Name
    Year_Playing: { type: String, required: true, min: 0  }, // Years of Experience
    BestAt: { type: String, required: true }, // Best Position
    Matches: { type: String, required: true , min: 0 }, // Matches Played
    Video_ImgURL: { type: String }, // Video URL
    isActive: { type: Boolean, default: false }, // Active State
    
  },
  { _id: true } // Create an internal `_id` for this subdocument
);


const followingSchema = new mongoose.Schema(
  {
    followingBy_id: { type: String },//username,profilepic
    createdAt: { type: Date, default: Date.now }, 
  },
  { _id: false } 
);


const followerSchema = new mongoose.Schema(
  {
    follwersBy_id: { type: String },
    createdAt: { type: Date, default: Date.now }, 
  },
  { _id: false } 
);


// Main User Schema
const userDetailsSchema = new mongoose.Schema(
  {
    uuid: { type: String, required: true, unique: true },
    First_Name: { type: String, required: true },
    Last_Name: { type: String, required: true },
    Email_ID: { type: String, required: true },
    Password: { type: String, required: true },
    userInfo: userInfoSchema,
    sportsInfo: [sportInfoSchema],
    following: [followingSchema],
    followers: [followerSchema],
    isVerified: { type: Boolean, default: false },
    verificationCode: { type: String, default: "N/A" },
  },
  { timestamps: true }
);

const UserDetailsModel = mongoose.model("userDetails", userDetailsSchema);

export default UserDetailsModel;