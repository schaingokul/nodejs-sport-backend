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
import {PostImage} from './Model/ImageModel.js';

// import MessageRoute from './View/ChatView/messageRoute.js'
// import userAppRoute from './View/ChatView/userAppRoute.js';
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


const io = new Server(server, {
    cors : {
        origin:"http://localhost:3000",
        methods:["GET", "POST"],
    },
});


io.on("connection", (socket) => {
    console.log(`User connected: ${socket.id}`);

    socket.on("join_chat", async (data) => {
        const { type, participants, groupName, cid } = data;

        try {
            const { conversation, messages } = await getCoversation(type, participants, groupName, cid);

            socket.emit("chat_data", { conversation, messages });

            if (conversation?._id) {
                socket.join(conversation._id.toString());
                console.log(`User joined room: ${conversation._id}`);
            }
        } catch (error) {
            console.error("Error in join_chat:", error);
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

app.get("/", (req,res) => {
    res.sendFile(path.join(__dirname, "index.html"));
});

app.get("/image", async(req,res) => {
    try {
        // Find all posts that have URLs starting with 'http://localhost:4500/Uploads/images/'
        const posts = await PostImage.find({
            "URL": { $elemMatch: { $regex: "^http://localhost:4500/Uploads/" } }
        });

        if (!posts.length) {
            return res.status(404).json({ message: 'No posts found with the old URL format.' });
        }

        // Loop through each post and update the URLs in the array
        for (const post of posts) {
            // Map through the URL array and replace the old base URL with the new one
            const updatedUrls = post.URL.map(url => {
                if (url.startsWith('http://localhost:4500/Uploads/')) {
                    // Replace the old URL base with the new one
                    return url.replace('http://localhost:4500/Uploads/', 'https://sportspersonz.com/Uploads/');
                }
                return url; // Return URL as is if it doesn't match the old base URL
            });

            // Update the post document with the new URL array
            post.URL = updatedUrls;
            await post.save(); // Save the updated post document
        }

        console.log('Image URLs updated successfully.');
        return res.status(200).json({ message: 'Image URLs updated successfully.' });

    } catch (error) {
        console.error('Error updating image URLs in posts:', error);
        return res.status(500).json({ message: 'Error updating image URLs', error: error.message });
    }
});


/* ------------------------------------------ http://:localhost:4500 ------------------------------------------ */ 
server.listen(PORT, async () => {
    try {
        await connectDB();
        console.log(`Server is running on ${PORT}`);
    } catch (error) {
        console.log(`Server failed to connect to database: ${error.message}`);
    }
});

/* --------------------------------------------- Hositing Server --------------------------------------------- */ 
// app.listen(PORT, HOST.replace("http://", ""), async () => {
//     try {
//         await connectDB();
//         console.log(`Server is running on ${PORT}`);
//     } catch (error) {
//         console.log(`Server failed to connect to database: ${error.message}`);
//     }
// });

/*app.use('/api/message', MessageRoute);
app.use('/api/user', userAppRoute);*/
