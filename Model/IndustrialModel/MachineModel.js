import mongoose from "mongoose";
import moment from 'moment-timezone';

const getISTDate = () => {
    return moment().tz("Asia/Kolkata").toDate(); // Returns the current time in IST
};


const RecordSchema = mongoose.Schema(
    {
        NoOf_Qlty: { type: String, default: "0"},
        Average_Wt: {type: String, default: "0"},
        UpDateTime: { type: String}
      },
      { _id: true } 
);

const EmergencySchema = mongoose.Schema(
    {
        Reason: { type: String },
        NumberOf_Prod: {type: String},
      },
      { _id: false } 
);

const MachineSchema = mongoose.Schema({
    Set_Machine: {type: String, required: true},
    Set_Mold: {type: String, required: true},
    Set_Date_Time: { type: String},
    Records: [RecordSchema],
    Emergency: EmergencySchema,
    Cur_StopTime: {type: String }
});

const machineModel = mongoose.model('Machine', MachineSchema );
export default machineModel