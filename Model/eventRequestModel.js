import mongoose from "mongoose";


const eventRequestSchema = new mongoose.Schema(
    {
    eventBy: { id: { type: mongoose.Schema.Types.ObjectId, ref: 'UserDetails', required: true }, name: { type: String, required: true },},
    reqOpp: { type: String }, // Opponent Team ID
    reqTeam: {type: String, required: true }, // Requesting Team ID
    status: { type: String, enum: [ "accepted", "declined", "request"], default: "request" },
    loc: {type: String, require: true},
    link: {type: String, require: true},
    d_t: { type: String, require: true },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now }
    },
    { _id: true }
  );
  
  const eventRequest = mongoose.model("eventRequest", eventRequestSchema);
  
  export default eventRequest;