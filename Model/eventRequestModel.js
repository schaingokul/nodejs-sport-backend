import mongoose from "mongoose";


const eventRequestSchema = new mongoose.Schema(
    {
    eventBy: { id: { type: mongoose.Schema.Types.ObjectId, ref: 'UserDetails', required: true }, name: { type: String, required: true },},
    acptTeam: { type: mongoose.Schema.Types.ObjectId, ref: 'UserDetails'}, // Opponent Team ID
    reqTeam: { type: mongoose.Schema.Types.ObjectId, ref: 'UserDetails', required: true }, // Requesting Team ID
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