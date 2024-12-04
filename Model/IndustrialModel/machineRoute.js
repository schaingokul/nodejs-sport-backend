import express from 'express';
import machineModel from './MachineModel.js';
import moment from 'moment-timezone';


const router = express.Router();


router.get('/', async(req, res) => {
    try {
        const view = await machineModel.find();
        res.status(200).json({status: true, message: `Machine Running Status`, Running: view});

    } catch (error) {
        res.status(200).json({status: false, message: `Start Route Causes Error message: ${error.message}`})
    }
});


router.post('/start', async(req, res) => {
    const {Set_Machine, Set_Mold} = req.body
    try {
        const currTime = moment().tz("Asia/Kolkata").toDate();
        const newMac = new machineModel({
            Set_Machine: Set_Machine,
            Set_Mold: Set_Mold,
            Set_Date_Time: currTime
        });
        await newMac.save();
        res.status(200).json({status: true, message: `Machine Start Running`});

    } catch (error) {
        res.status(200).json({status: false, message: `Start Route Causes Error message: ${error.message}`})
    }
});

router.post('/record/:id', async(req, res) => {
    const {NoOf_Qlty, Average_Wt} = req.body;
    const {id} = req.params;
    try {
        
        const currTime = moment().tz("Asia/Kolkata").toDate();
        const machine = await machineModel.findById(id)
        
        if (machine.Cur_StopTime || machine.Cur_StopTime === "") {
            return res.status(200).json({ status: false, message: `Machine has already stopped` });
        }

        const newRecord = {
            NoOf_Qlty: NoOf_Qlty,
            Average_Wt: Average_Wt,
            UpDateTime: currTime
        }

       await machine.Records.push(newRecord);
       await machine.save();
        res.status(200).json({status: true, message: `Machine Stop`,RecordDetails : newRecord });

    } catch (error) {
        res.status(200).json({status: false, message: `Stop Route Causes Error message: ${error.message}`})
    }
});


router.post('/emg/:id', async(req, res) => {
    const {Reason, NumberOf_Prod} = req.body;
    const {id} = req.params;
    try {
        
        const currTime = moment().tz("Asia/Kolkata").toDate();
        const machine = await machineModel.findById(id)
        
        if (machine.Cur_StopTime || machine.Cur_StopTime === "") {
            return res.status(200).json({ status: false, message: `Machine has already stopped` });
        }

        const stopEmergency = {
            Reason: Reason,
            NumberOf_Prod: NumberOf_Prod,
            UpDateTime: currTime
        }

       machine.Emergency = stopEmergency
       machine.Cur_StopTime = currTime
       await machine.save();
        res.status(200).json({status: true, message: `Machine Emergency Stop`,Reason : stopEmergency });

    } catch (error) {
        res.status(200).json({status: false, message: `Emergency Stop Route Causes Error message: ${error.message}`})
    }
});

router.post('/stop/:id', async(req, res) => {
    const {id} = req.params;
    try {
        const currTime = moment().tz("Asia/Kolkata").toDate();
        const machine = await machineModel.findById(id)

        if(!machine.Cur_StopTime || machine.Cur_StopTime === ""){
            machine.Cur_StopTime = currTime
            await machine.save();
        }else{
            res.status(200).json({status: false, message: `Machine have Already Stopped`});
        }
    
        res.status(200).json({status: true, message: `Machine Stopped`});

    } catch (error) {
        res.status(200).json({status: false, message: `Stop Route Causes Error message: ${error.message}`})
    }
});

export default router;