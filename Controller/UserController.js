import Model from '../Model/Model.js';
import bcrypt from 'bcryptjs';

export const signUp = async (req,res) => {
    const {firstName, lastName, email, phone, password} = req.body;
    try {
        const isEmailValid = await Model.findOne({email});
            if(isEmailValid){
                return res.status(400).json({status: false, message: "Email already exists"})
            }

        const encryptPassword = await bcrypt.hash(password, 10);

        const newUser = new Model({
            firstName,
            lastName,
            emailaddress: email,
            phone,
            password: encryptPassword,
        })

    await newUser.save();
    res.status(201).json({status: true, message: "Successfully Created User"});
    
    } catch (error) {
        res.status(500).json({status: false, message: "User creation failed", error: error.message})
    }
};

export const login = async (req,res) => {
    const {email, password} = req.body;
    try {
        
        const user = await Model.findOne({emailaddress: email});
        if(!user){
            return res.status(400).json({status: false, message: "Email not found, Create new"})
        }
        const encryptPassword = await bcrypt.compare(password, user.password);
        if(!encryptPassword){
            return  res.status(400).json({status: false, message: "Invalid Password"});
        }

    res.status(201).json({status: true, message: "login Successfully", user});
    
    } catch (error) {
        res.status(500).json({status: false, message: "login failed", error: error.message})
    }
};