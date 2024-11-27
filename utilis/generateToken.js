import jwt from "jsonwebtoken";
const KEY = process.env.JWT_SECRET || "SPORTS"
const TOKEN_EXPIRATION = process.env.TOKEN_EXPIRATION || "1d"

export const generateToken = ({id, uuid, Email_ID}, res) => {
    try {
        const token = jwt.sign({id, uuid, Email_ID}, KEY, {expiresIn: TOKEN_EXPIRATION });
        
        res.cookie("SPORTS", token, {
            httpOnly: true, 
            secure: process.env.NODE_ENV === "production", 
            sameSite: "strict",
            maxAge: parseInt(TOKEN_EXPIRATION) * 1000, 
        });
        
        return token;
    } catch (error) {
        console.error("Error generating token:", error.message);
        throw new Error("Token Causes error");
    }
};

