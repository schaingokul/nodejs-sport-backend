import mongoose from "mongoose";

const TeamRequestSchema = new mongoose.Schema({
  teamName: {type: String, require: true},
  teamId: { type: mongoose.Schema.Types.ObjectId, ref: 'UserDetails', required: true, },
  message: {type: String, default: null},
  status: { type: String, enum: ['false', 'true', 'N/A'], default: 'N/A' },
  requestedAt: { type: Date, default: Date.now },
},{ _id: false });

const eventRequestSchema = new mongoose.Schema(
    {
    eventBy: { id: { type: mongoose.Schema.Types.ObjectId, ref: 'UserDetails', required: true }, name: { type: String, required: true },},
    myTeamName:{type: String, require: true},
    myTeam: { type: mongoose.Schema.Types.ObjectId, ref: 'UserDetails', required: true }, 
    teamsRequested: [TeamRequestSchema],
    selectedTeamName:{type: String },
    selectedTeam: { type: mongoose.Schema.Types.ObjectId, ref: 'UserDetails', default: null,},
    status: { type: String, enum: [ "approved", "withdrawn", "request"], default: "request" },
    loc: {type: String, require: true},
    link: {type: String, require: true},
    eventTime: { type: String, require: true },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now },
    chat:[]
    },
    { _id: true }
  );
  
  const eventRequest = mongoose.model("eventRequest", eventRequestSchema);
  
  export default eventRequest;