import mongoose from "mongoose";
const MONGO_URI = 'mongodb+srv://schaingokul:schaingokul@cluster0.yrr9x.mongodb.net/sportsApp?retryWrites=true&w=majority&appName=Cluster0'


const connectDB =  async() => {
    try {
        const conn = await mongoose.connect(MONGO_URI)
        console.log(`DB succefully connected ${conn.connection.host}`);
    } catch (error) {
        console.error(`DB connection error: ${error.message}`);
        process.exit(1)
    }
}

export{connectDB};