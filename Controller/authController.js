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

        const code = Math.floor(100000+ Math.random()*900000).toString();
        const uniqueId = nanoid();
    
        const newUser = new UserDetails(
            {
            uuid: uniqueId,
            First_Name: firstName,
            Last_Name: lastName,
            Email_ID: Email,
            Password: encryptedPassword,
            verificationCode: code,
        });

    const isEmailSent  = await emailConfig({code, Email});
    if (!isEmailSent ) {
        return res.status(500).json({ status: false, message: "User created but email sending failed" });
      }

    await newUser.save();

    const sendInfo = await UserDetails.findOne({ uuid: uniqueId }).select("uuid verificationCode");
     
    res.status(201).json({status: true, message: "Successfull", sendInfo});
    
    } catch (error) {
        console.error("Sign-up error:", error);
        res.status(500).json({status: false, message: "User creation failed", error: error.message});
    }
};

export const login = async (req,res) => {
    const {Email, Password, code } = req.body;
    try {

        const user = await UserDetails.findOne({Email_ID: Email});
       
        if(!user){
            return res.status(400).json({status: false, message: "Email not found, Please sign up."})
        }

        const isPasswordValid  = await bcrypt.compare(Password, user.Password);
        
        if(!isPasswordValid ){
            return  res.status(400).json({status: false, message: "Invalid Password"});
        }

        if(user.verificationCode != code){
            return res.status(400).json({status: false, message: "Incorrect Verfication Code"})
        }

        await UserDetails.findByIdAndUpdate(user._id, { isVerified: true });

        const sendInfo = await UserDetails.findOne({ uuid: user.uuid }).select("uuid _id");
        
        res.status(200).json({status: true, message: "login Successfully", sendInfo });
    
    } catch (error) {
        console.error("Login error:", error);
        res.status(500).json({status: false, message: "login failed", error: error.message})
    }
};

export const forgetPassword = async (req, res) => {
    const {Email} = req.body;
    try {
        const isValidEmail = await UserDetails.findOne({Email_ID: Email});

        if(!isValidEmail){
            return res.status(400).json({status: true, message: "InValidemail"});
        }

        const code = Math.floor(100000+ Math.random()*900000).toString();

        await UserDetails.findOneAndUpdate({Email_ID: Email }, { verificationCode: code });

        const isEmailSent = await emailConfig({ code, Email });
        if (!isEmailSent) {
        return res.status(500).json({ status: false, message: "Failed to send email" });
        }

        const sendInfo = await UserDetails.findOne({ uuid: isValidEmail.uuid }).select("uuid");
        res.status(200).json({status: true, message: "mailSended", sendInfo });

    } catch (error) {
        console.error("Forget password error:", error);
        res.status(500).json({status: false, message: "Forget password failed", error: error.message})
    }
};

export const resetPassword = async (req, res) => {
    const {uuid, code, Password} = req.body;
    try {
        const user = await UserDetails.findOne({uuid});
        if(!user){
            return res.status(400).json({status: false, message: "User not found" })
        }

        if(user.verificationCode != code){
            return res.status(400).json({status: false, message: "Incorrect Verfication Code"})
        }

        const encryptPassword = await bcrypt.hash(Password, 10);
        await UserDetails.findByIdAndUpdate(user._id, { Password: encryptPassword});

        res.status(200).json({status: true, message: "Password reset successfully"});
    } catch (error) {
        console.error("Reset password error:", error);
        res.status(500).json({status: false, message: "Reset-Password Causes Error", error: error.message})
    }
};
