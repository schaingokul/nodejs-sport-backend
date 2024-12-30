import mongoose from "mongoose";

// User Information Subdocument Schema
export const userInfoSchema = new mongoose.Schema(
  {
    Profile_ImgURL: { type: String },// Profile Image URL
    Nickname: { type: String },// Nickname
    Phone_Number: { type: String, sparse: true, default: "N/A"},// Contact Number
    Date_of_Birth: { type: Date},// Date of Birth
    Gender: {type: String, enum: ["Male", "Female", "Transgender", ""] , default: ""},// Gender
    Education: { school: [{ type: String }], college: [{ type: String }]},// Education
    Work: { type: String },// Work
    Club: { type: String },// Club
  },
  { _id: false } // _id: false so it doesn't create a separate _id for this subdocument
);

// certificate Information Subdocument Schema
export const certificateInfoSchema = new mongoose.Schema(
  {
    Occasion: { type: String },
    Month_Year: { type: String, required: true }, 
    Upload_certificate: [{ type: String }], 
    Upload_Photos:[{type: String}]
  },
  { _id: true } // Create an internal `_id` for this subdocument
);

// Sports Information Subdocument Schema
export const sportInfoSchema = new mongoose.Schema(
  {
    sp: { type: String },
    sURL: { type: [String] }, // Sports Image URL
    sName: { type: String, required: true, set: (value) => value.toLowerCase() }, // Game's Sports Name
    year: { type: String, required: true, min: 0  }, // Years of Experience
    best: { type: String, required: true }, // Best Position
    matches: { type: String, required: true , min: 0 }, // Matches Played
    sVURL: { type: [String] }, // Video URL
    isActive: { type: Boolean, default: false },
    Certificate: certificateInfoSchema // Active State
  },
  { _id: true } // Create an internal `_id` for this subdocument
);

// following Information Subdocument Schema
const followingSchema = new mongoose.Schema(
  {
    followingBy_id: { type: String },//username,profilepic
    createdAt: { type: Date, default: Date.now }, 
  },
  { _id: false } 
);

// follower Information Subdocument Schema
const followerSchema = new mongoose.Schema(
  {
    follwersBy_id: { type: String },
    createdAt: { type: Date, default: Date.now }, 
  },
  { _id: false } 
);


//Players List
const playersListSchema = mongoose.Schema({
  Player_id:{type : String, required :true},
  Position: {type : String, required :true},
  status: {type : String, enum: ["Accepted" ,"NotWilling", "N/A"], default: "N/A"},
  },
  { _id: false }
);

//Created for Owner
const TeamBuildSchema = mongoose.Schema({
  createdBy: {type : String, required: true},
  role: {type: String, enum: ["admin", "player"], require: true},
  Team_Name: {type : String, required :true},
  Sports_Name:{type : String, required :true},
  TotalPlayers:{type : String, required :true, default: "0"},
  playersList:[playersListSchema],
  isReady:{type : Boolean, required :true, default: false},
},
{ _id: true });

// Middleware to convert Team_Name and Sports_Name to lowercase before saving
TeamBuildSchema.pre('save', function (next) {
  if (this.Team_Name) {
    this.Team_Name = this.Team_Name.toLowerCase();
  }
  if (this.Sports_Name) {
    this.Sports_Name = this.Sports_Name.toLowerCase();
  }
  next();
});

const chatSchema = new mongoose.Schema(
  {
    cid: { type: String },
  },
  { timestamps: true }
);

const matchHistorySchema = new mongoose.Schema(
  {
    matchId: { type: String, required: true },
    opponentTeam: { type: String, required: true }, // Opponent Team Name
    result: { type: String, enum: ["win", "loss", "draw", "pending"], default: "pending" },
    date: { type: Date, required: true }
  },
  { _id: true }
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
    athletic: {type: String},
    sportsInfo: [sportInfoSchema],
    following: [followingSchema],
    followers: [followerSchema],
    myPostKeys: [{ type: String, default: [] }],     
    MyTeamBuild: [TeamBuildSchema],
    chatList: [chatSchema],
    teamMatchHistory: [matchHistorySchema],
    eventKeys: [{ type: String, default: [] }],
    isVerified: { type: Boolean, default: false },
    verificationCode: { type: String, default: "N/A" },
    IsDeactivated: { type: Boolean, default: false }
  },
  { timestamps: true }
);

const UserDetailsModel = mongoose.model("userDetails", userDetailsSchema);

export default UserDetailsModel;
