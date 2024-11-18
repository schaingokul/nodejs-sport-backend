import mongoose from "mongoose";
const MONGO_URI = 'mongodb+srv://schaingokul:schaingokul@cluster0.yrr9x.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0'

const userSchema = new mongoose.Schema({
   firstName: {type: String, required: true},
   lastName: {type: String, required: true},
   emailaddress: {type: String, required: true, unique: true},
   phone: {type: Number, required: true},
   password: {type: String, required: true},
})

const UserModel = mongoose.model("sportUser", userSchema);

export default UserModel;


const connectDB =  async() => {
    try {
        const conn = await mongoose.connect(MONGO_URI)
        console.log(`DB succefully connected ${conn.connection.host}`);
    } catch (error) {
        console.log(`DB connection failed ${error}`)
    }
}

export{connectDB};