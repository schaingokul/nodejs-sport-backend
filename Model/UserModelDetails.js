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

// Sports Information Subdocument Schema
export const sportInfoSchema = new mongoose.Schema(
  {
    Sports_ImgURL: { type: String }, // Sports Image URL
    Sports_Name: { type: String, required: true }, // Game's Sports Name
    Year_Playing: { type: String, required: true }, // Years of Experience
    BestAt: { type: String, required: true }, // Best Position
    Matches: { type: String, required: true }, // Matches Played
    Video_ImgURL: { type: String }, // Video URL
    isActive: { type: Boolean, default: false }, // Active State
  },
  { _id: true } // Create an internal `_id` for this subdocument
);


// Main User Schema
const userDetailsSchema = new mongoose.Schema(
  {
    uuid: { type: String, required: true, unique: true }, // Unique ID
    First_Name: { type: String, required: true }, // First Name
    Last_Name: { type: String }, // Last Name
    Email_ID: { type: String, required: true, unique: true,
      validate: {
        validator: function (v) {
          return /^[\w-.]+@([\w-]+\.)+[\w-]{2,4}$/.test(v); // Email regex validation
        },
        message: "Invalid email format. Must include '@' and '.'",
      },
    },
    Password: { type: String, required: true }, // Password
    userInfo: userInfoSchema, // user information subdocument
    sportsInfo: sportInfoSchema, // Array of sports subdocuments
    isVerified: { type: Boolean, default: false }, // Verification status
    verificationCode: { type: String }, // Verification Code
  },
  { timestamps: true } // Automatically add createdAt and updatedAt timestamps
);

const UserDetailsModel = mongoose.model("userDetails", userDetailsSchema);

export default UserDetailsModel;