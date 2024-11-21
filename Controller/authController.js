import UserDetails from '../Model/UserModelDetails.js';
import bcrypt from 'bcryptjs';
import emailConfig from '../utilis/EmailConfig.js';
import { nanoid } from 'nanoid';


export const signUp = async (req,res) => {

    const {firstName, lastName, Email, Password } = req.body;
    try {

        const isValidEmail = await UserDetails.findOne({Email_ID: Email});
        if(isValidEmail){
            return res.status(400).json({status: false, message: "Email already in use"})
        }
        console.log(`${isValidEmail} Step 1 Completed: Email validation passed`);

        const encryptedPassword = await bcrypt.hash(Password, 10);
        console.log(`Step 2 Completed: Password encrypted`);
        const verficationCode = Math.floor(100000+ Math.random()*900000).toString();

        const uniqueId = nanoid();
        const isUniq = await UserDetails.findOne({ uuid: uniqueId });
        console.log("status", isUniq ? "true" : "false");
        console.log("status", isUniq ? true : false);
        console.log(uniqueId)

        const newUser = new UserDetails(
            {
            uuid: uniqueId,
            First_Name: firstName,
            Last_Name: lastName,
            Email_ID: Email,
            Password: encryptedPassword,
            verficationCode,
        });

        await newUser.save();
        console.log(newUser)
        if(newUser.uuid === null){
            console.log("Null is Error")
        }
        console.log(`Step 3 Completed: User saved to database ${newUser.uuid}`);

    const isVerified = await emailConfig({verficationCode, Email});
    if (!isVerified) {
        return res.status(500).json({ status: false, message: "User created but email sending failed" });
      }

    console.log(`Step 4 Completed: Verification email sent`);
    const sendInfo = await UserDetails.findOne({ uuid: uniqueId }).select("uuid");
      console.log(sendInfo)
    res.status(201).json({status: true, message: "Successfull", sendInfo});
    
    } catch (error) {
        console.log(error)
        res.status(500).json({status: false, message: "User creation failed", error: error.message});
    }
};


export const login = async (req,res) => {
    const {Email, Password} = req.body;
    try {

        const user = await UserDetails.findOne({ E_ID: Email});
       
        if(!user){
            return res.status(400).json({status: false, message: "Email not found, Create new"})
        }

        const encryptPassword = await bcrypt.compare(Password, user.PW);
        
        if(!encryptPassword){
            return  res.status(400).json({status: false, message: "Invalid Password"});
        }

        const sendInfo = await UserDetails.findOne({ uuid: user.uuid }).select("uuid _id");
        
        res.status(201).json({status: true, message: "login Successfully",sendInfo });
    
    } catch (error) {
        
        res.status(500).json({status: false, message: "login failed", error: error.message})
    }
};

export const forgetPassword = async (req, res) => {
    const {Email} = req.body;
    try {

        const isValidEmail = await UserDetails.findOne({E_ID: Email});

        if(!isValidEmail){
            return res.status(400).json({status: true, message: "InValidemail"});
        }

        const verficationCode = Math.floor(100000+ Math.random()*900000).toString();

        await UserDetails.findOneAndUpdate({E_ID: Email }, { verficationCode });

        await emailConfig(verficationCode)

    } catch (error) {
        res.status(500).json({status: false, message: "Reset-Password Causes Error", error: error.message})
    }
};

export const resetPassword = async (req, res) => {
    const {verificationCode, password} = req.body;
    try {
        const user = await UserDetails.findOne({verificationCode});
        
        const encryptPassword = await bcrypt.hash(password, 10);
        await Model.findByIdAndUpdate(user._id, { PW: encryptPassword, verificationCode: '' });
        res.status(200).json({status: true, message: "Verification Succeffully"});
    } catch (error) {
        res.status(500).json({status: false, message: "Reset-Password Causes Error", error: error.message})
    }
};
