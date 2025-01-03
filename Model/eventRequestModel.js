import mongoose from "mongoose";

const TeamRequestSchema = new mongoose.Schema({
  teamId: { type: mongoose.Schema.Types.ObjectId, ref: 'UserDetails', required: true, },
  status: { type: String, enum: ['waiting', 'accepted', 'rejected'], default: 'waiting' },
  requestedAt: { type: Date, default: Date.now },
},{ _id: false });

const eventRequestSchema = new mongoose.Schema(
    {
    eventName: {type: String, require: true},
    eventBy: { id: { type: mongoose.Schema.Types.ObjectId, ref: 'UserDetails', required: true }, name: { type: String, required: true },},
    reqTeam: { type: mongoose.Schema.Types.ObjectId, ref: 'UserDetails', required: true }, 
    teamsRequested: [TeamRequestSchema],
    selectedTeam: { type: mongoose.Schema.Types.ObjectId, ref: 'UserDetails', default: null,},
    acptTeam: { type: mongoose.Schema.Types.ObjectId, ref: 'UserDetails'},
    status: { type: String, enum: [ "accepted", "cancel", "request"], default: "request" },
    loc: {type: String, require: true},
    link: {type: String, require: true},
    eventTime: { type: String, require: true },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now }
    },
    { _id: true }
  );
  
  const eventRequest = mongoose.model("eventRequest", eventRequestSchema);
  
  export default eventRequest;