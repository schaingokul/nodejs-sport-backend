import UserDetails from '../Model/UserModelDetails.js';
import bcrypt from 'bcryptjs';
import emailConfig from '../utilis/EmailConfig.js';
import { nanoid } from 'nanoid';
import { generateToken } from '../utilis/generateToken.js';



export const googlesignUp = async (req,res, next) => {

    const {firstName, lastName, Email } = req.body;
    try {
        // Check for the fixed token in the headers
        const dummyToken = req.headers['x-google-auth-token'];

        // Validate the token
        if (dummyToken !== 'google-access') {
            return res.status(401).json({ status: false, message: 'Invalid or missing token please send information through Application Token' });
        }

        const isValidEmail = await UserDetails.findOne({Email_ID: Email});
        if(!isValidEmail){
            const Password = nanoid();
            const encryptedPassword = await bcrypt.hash(Password, 10);

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
                return res.status(200).json({status: false, message: "User created but email sending failed."})
            }
            
            await newUser.save();
            await UserDetails.findByIdAndUpdate(newUser._id, { isVerified: true });
            const token =  generateToken({ id: newUser._id, uuid: newUser.uuid, Email_ID: newUser.Email_ID }, res);
         return res.status(201).json({ status: true, message: "User registered successfully", data: token, password : Password });
        }

        if(isValidEmail){

            const token =  generateToken({ id: isValidEmail._id, uuid: isValidEmail.uuid, Email_ID: isValidEmail.Email_ID }, res);
            const sendInfo = await UserDetails.findById(isValidEmail._id).select("uuid _id FirstName LastName");
            return res.status(200).json({status: true, message: "login Successfully", data: token, UserInfo: sendInfo });
        }

    } catch (error) {
        console.error("Sign-up error:", error.message);
        next(error.message);
        // res.status(200).json({status: false, message: "Sign-up Route error"})
    }
};

export const signUp = async (req,res, next) => {

    const {firstName, lastName, Email, Password, Phone_Number } = req.body;
    try {

        const isValidEmail = await UserDetails.findOne({Email_ID: Email});
        if(isValidEmail){
            //return next( new ErrorHandler(400, "Email already in use"))
            return res.status(200).json({status: false, message: "Email already in use."})
        }
        
        const encryptedPassword = await bcrypt.hash(Password, 10);

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
            "userInfo.Phone_Number": Phone_Number,
        });

        const isEmailSent  = await emailConfig({code, Email});
        if (!isEmailSent ) {
            return next(new ErrorHandler(400, "User created but email sending failed"));
            //return res.status(200).json({status: false, message: "User created but email sending failed."})
        }
    
        await newUser.save();
        console.log(`Step 6 Completed: User saved to database ${newUser.id}`);
        const token =  generateToken({ id: newUser._id, uuid: newUser.uuid, Email_ID: newUser.Email_ID },res);

        res.status(201).json({ status: true, message: "User registered successfully", data: token, Verification: code});
    
    } catch (error) {
        console.error("Sign-up error:", error.message);
        // next(error.message);
        res.status(200).json({status: false, message: "Sign-up Route error"})
    }
};

export const login = async (req,res, next) => {
    const {Email, Password } = req.body;
    try {

        const user = await UserDetails.findOne({Email_ID: Email});
        
        if(!user){
            return res.status(200).json({status: false, message: "Email not found, Please sign up."})
            // return next(new ErrorHandler(200, "Email not found, Please sign up."));
        }

        const isPasswordValid  = await bcrypt.compare(Password, user.Password);
        console.log(" Pass: ", isPasswordValid);
        
        if(!isPasswordValid ){
            return res.status(200).json({status: false, message: "Invalid Password"});
            // return next(new ErrorHandler(200, "Invalid Password"));
        }

        if(user.isVerified === false){
            res.status(200).json({status: false, message: "LogIncorrect Verfication Codein Route"})
        }

        const token =  generateToken({ id: user._id, uuid: user.uuid, Email_ID: user.Email_ID }, res);
        const sendInfo = await UserDetails.findOne({ uuid: user.uuid }).select("uuid _id");
        res.status(200).json({status: true, message: "login Successfully", Token: token, UserInfo: sendInfo , user: user});
    
    } catch (error) {
        console.error("Login error:", error.message);
        // next(error.message)
        res.status(200).json({status: false, message: "Login Route"})
    }
};

export const forgetPassword = async (req, res) => {
    const {Email} = req.body;
    try {
        const user = await UserDetails.findOne({Email_ID: Email});

        if(!user){
            //return next( new ErrorHandler(400, "InValidemail"));
            res.status(200).json({status: false, message: "InValidemail"})
        }

        const code = Math.floor(100000+ Math.random()*900000).toString();

        await UserDetails.findOneAndUpdate({Email_ID: Email }, { verificationCode: code });

        const isEmailSent = await emailConfig({ code, Email });
        const token =  generateToken({ id: user._id, uuid: user.uuid, Email_ID: user.Email_ID }, res);
        if (!isEmailSent) {
            // return next(new ErrorHandler(400, "Failed to send email"));
            res.status(200).json({status: false, message: "Failed to send email"})
        }

        res.status(200).json({status: true, message: "VerificationCode is sended to mail", Token: token, Verification: code  });

    } catch (error) {
        console.error("Forget password error:", error.message);
        // next(error.message);
        res.status(200).json({status: false, message: "Forget password Route error"})
    }
};

export const verifycationCode = async (req, res) => {
    const {code} = req.body;
    const {uuid} = req.user;
    try {
        const user = await UserDetails.findOne({uuid});

        if(!user){
            // return next( new ErrorHandler(400,"User not found"));
            res.status(200).json({status: false, message: "User not found"})
        }

        if(user.verificationCode != code){
            // return next( new ErrorHandler(400,"Incorrect Verfication Code"));
            res.status(200).json({status: false, message: "Incorrect Verfication Code"})
        }
        await UserDetails.findByIdAndUpdate(user._id, { isVerified: true });
       
        res.status(200).json({status: true, message: "Verification successfully ", user: { uuid: user.uuid, Email_ID: user.Email_ID }});
    } catch (error) {
        console.error("Reset password error:", error.message);
        // next(error.message);
        res.status(200).json({status: false, message: "Reset password Route error"})
    }
};


export const resetPassword = async (req, res) => {
    const {Password} = req.body;
    const {uuid} = req.user;
    try {
        const user = await UserDetails.findOne({uuid});

        if(!user){
            // return next( new ErrorHandler(400,"User not found"));
            res.status(200).json({status: false, message: "User not found"})
        }

        const encryptPassword = await bcrypt.hash(Password, 10);
        await UserDetails.findByIdAndUpdate(user._id, { Password: encryptPassword});
       
        res.status(200).json({status: true, message: "Password reset successfully",user: { uuid: user.uuid, Email_ID: user.Email_ID }});
    } catch (error) {
        console.error("Reset password error:", error.message);
        // next(error.message);
        res.status(200).json({status: false, message: "Reset password Route error"})
    }
};

export const follower = async (req, res, next) => {
    const { id } = req.params; // follower uuid
    const { uuid } = req.user; // logged-in user uuid
    try {
        // Fixing the query by passing an object with the uuid field
        const user = await UserDetails.findOne({ uuid });

        if (uuid === id) {
            // return next(new ErrorHandler(400,"Cannot follow/unfollow yourself"));
            res.status(200).json({status: false, message: "Cannot follow/unfollow yourself"})
        }

        if (!user) {
            // return next(new ErrorHandler(404 ,"User not found"));
            res.status(200).json({status: false, message: "User not found"})
        }

        const followerIndex = user.followers.findIndex((follow) => follow.follwersBy_id === id);

        if (followerIndex !== -1) {
            user.followers.splice(followerIndex, 1);
            await user.save();
            return res.status(200).json({ status: true, message: "Unfollow removed", data: user });
        }

        user.followers.push({ follwersBy_id: id });
        await user.save();

        res.status(201).json({ status: true, message: "Follower added", data: user });
    } catch (error) {
        console.log(error);
        //next(error.message);
        res.status(200).json({status: false, message: "follower Route error"})
    }
};

export const following = async (req, res) => {
    const { id } = req.params; // following uuid
    const { uuid } = req.user; // logged-in user uuid
    try {
        // Fixing the query by passing an object with the uuid field
        const user = await UserDetails.findOne({ uuid });

        if (!user) {
            // return next(new ErrorHandler(404, "User not found"));
            res.status(200).json({status: false, message: "User not found"})
        }

        const followingIndex = user.following.findIndex((follow) => follow.followingBy_id === id);

        if (followingIndex !== -1) {
            user.following.splice(followingIndex, 1);
            await user.save();
            return res.status(200).json({ status: true, message: "Unfollowed", data: user });
        }

        user.following.push({ followingBy_id: id });
        await user.save();

        res.status(201).json({ status: true, message: "Following added", data: user.following });
    } catch (error) {
        console.log(error);
        // next(error.message);
        res.status(200).json({status: false, message: "Following Route error"})
    }
};