import express from "express";
import cors from "cors";
import bodyParser from "body-parser";
import { connectDB } from "./Model/ConnectDB.js";
import authRouter from './View/authView.js';
import userRouter from './View/userView.js';
import postRouter from './View/PostView.js';
import path from "path";
import { fileURLToPath } from 'url';
import machineRoute from './Model/IndustrialModel/machineRoute.js'
import TeamRouter from './View/TeamView.js'
import { PORT, HOST } from "./env.js";
import { Server } from "socket.io";
import http from 'http';
import {getCoversation, sendMessage}  from "./Controller/Chat/userAppController.js";
import PostImage from './Model/ImageModel.js';
import Message from "./Model/ChatModel/MessageModel.js";
import Axios from 'axios';
import {addBGImgURLField} from "./Model/UserModelDetails.js";

// import MessageRoute from './View/ChatView/messageRoute.js'
import userAppRoute from './View/ChatView/userAppRoute.js';
import UserDetails from "./Model/UserModelDetails.js";
// import {app, server} from './socket/Socket.js'

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const server = http.createServer(app);

app.use(cors({ origin: '*' }));
app.use(express.json());
app.use(bodyParser.json());
app.use(express.static(__dirname));
app.use(express.urlencoded({ extended: true }));

// Serve static files (images, videos, etc.)
app.use('/', express.static(path.join(__dirname, 'Uploads')));

app.use('/api/auth', authRouter);
app.use('/api/user', userRouter);
app.use('/api/user', postRouter);
app.use('/api/team', TeamRouter);
app.use('/machine', machineRoute);
app.use('/chat', userAppRoute);

// const socketIP = "http://localhost:4500";
const socketIP = "https://sportspersonz.com";

const io = new Server(server, {
    cors: {
        origin: "https://sportspersonz.com", // "*", // Replace with your React Native app's URL
        methods: ["GET", "POST"],
        credentials: true
    },
});

try {
io.on("connection", (socket) => {
    console.log(`User connected: ${socket.id}`);

    socket.on("join_chat", async (data) => {
        const { type, participants, groupName, cid } = data;

        try {
            // Fetch the conversation
            const { conversation } = await getCoversation(type, participants, groupName, cid);

            if (conversation?._id) {
                // Fetch chat data
                const response = await Axios.get(`${socketIP}/chat/chat-data/${conversation._id.toString()}`);
                const chatData = response.data.viewMessages;

                // Emit the fetched chat data to the client
                socket.emit("chat_data", { conversation, chatData});

                // Join the socket room with the conversation ID
                socket.join(conversation._id.toString());
                console.log(`User joined room: ${conversation._id}`);
            } else {
                throw new Error("Conversation not found or invalid.");
            }
        } catch (error) {
            console.error("Error in join_chat:", error.message);
            socket.emit("error", { message: error.message || "Failed to join or create chat" });
        }
    });

    socket.on("send_message", async (data) => {
        const { cid, sender, message } = data;
        try {
            const newMessage = await sendMessage(cid, sender, message);

            io.to(cid).emit("receive_message", {
                message: {
                    _id: newMessage._id,
                    cid: newMessage.cid,
                    sender: newMessage.sender,
                    message: newMessage.message,
                    timestamp: newMessage.timestamp,
                },
            });
        } catch (error) {
            console.error("Error sending message:", error);
            socket.emit("error", { message: error.message || "Failed to send message" });
        }
    });

    socket.on("disconnect", () => {
        console.log(`User disconnected: ${socket.id}`);
    });
});
    
} catch (error) {
    console.log(error);
}

app.get("/", (req,res) => {
    try {
        console.log("Running URL:", req.url); // Logs the URL of the request
        console.log("Inside root handler"); // Logs when the handler is triggered
        return res.sendFile(path.join(__dirname, "index.html"));
    } catch (error) {
        console.log(error)
    }
});

/* ------------------------------------------ http://:localhost:4500 ------------------------------------------ */ 
// server.listen(PORT, async () => {
//     try {
//         await connectDB();
//         await addBGImgURLField();
//         console.log(`Server is running on ${PORT}`);
//     } catch (error) {
//         console.log(`Server failed to connect to database: ${error.message}`);
//     }
// });

/* --------------------------------------------- Hositing Server --------------------------------------------- */ 
server.listen(PORT, HOST.replace("http://", ""), async () => {
    try {
        await connectDB();
        console.log(`Server is running on ${PORT}`);
    } catch (error) {
        console.log(`Server failed to connect to database: ${error.message}`);
    }
});

/*app.use('/api/message', MessageRoute);
app.use('/api/user', userAppRoute);*/
