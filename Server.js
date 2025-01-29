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
import { sendMessage, reciveMessage}  from "./Controller/Chat/userAppController.js";
import PostImage from './Model/ImageModel.js';
import Message from "./Model/ChatModel/MessageModel.js";
import Axios from 'axios';

// import MessageRoute from './View/ChatView/messageRoute.js'
import userAppRoute from './View/ChatView/userAppRoute.js';
import UserDetails from "./Model/UserModelDetails.js";
import Conversation from "./Model/ChatModel/Conversation.Model.js";
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
        origin: socketIP, // "*", // Replace with your React Native app's URL
        methods: ["GET", "POST", "PUT"],
        credentials: true
    },
});

try {
io.on("connection", (socket) => {
    console.log(`User connected: ${socket.id}`);
    //working Correct
    socket.on("my-chat", async (data) => {
        const {loginid, page, limit} = data;
        try {
          const response = await Axios.get(`${socketIP}/chat/my-chat`, { params :{ loginid, page, limit }});
          const list = response.data.data;

          // Emit the fetched chat data to the client
          socket.emit("mychat_data", list);
          
        } catch (error) {
            console.error("Error in my-chat:", error.message);
            socket.emit("error", { message: error.message || "Failed to my-chat" });
        }
    });

    //onWork
    socket.on("join_chat", async (data) => {
        const { type, createdBy, participants, groupName, cid, loginid } = data;
      
        try {
          // Fetch or create the conversation
          const conversations = await Axios.post(`${socketIP}/chat`, {
            type,
            createdBy,
            participants,
            groupName,
            cid
          });
          
          const conversation = conversations.data.conversation;
      
          if (conversation?._id) {
            // Fetch existing chat data
            const response = await Axios.get(`${socketIP}/chat/chat-data/${conversation._id.toString()}`, {
              params: { loginid },
            });

            if (!response || !response.data || !response.data.chat_data) {
                throw new Error("Invalid response from /chat/chat-data");
              }

            const chatData = response.data.chat_data.formattedChatData.length > 0
              ? response.data.chat_data.formattedChatData
              : "Start New Conversation";
      
            // Emit the existing chat data to the client
            socket.emit("chat_data", { conversation, chatData });

            // Join the socket room using the conversation ID
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
        try {
          const { cid, loginid, message } = data;
          const newMessage = await sendMessage({ cid, sender: loginid, message, loginid });
          
          const recive = await reciveMessage(newMessage._id, loginid);

          // Emit the message to the sender as "me"
          socket.emit("receive_message", { recive: {
            id: recive.id,
            message: recive.message,
            is: "me",
            sender: recive.sender,
            name: recive.name,
            url: recive.url,
            timestamp: recive.timestamp,
          } });

          // Emit the message to others in the room as "other"
          socket.to(cid).emit("receive_message", { recive: {
            id: recive.id,
            message: recive.message,
            is: "other",
            sender: recive.sender,
            name: recive.name,
            url: recive.url,
            timestamp: recive.timestamp,
          } });

          // Fetch participants from the conversation
            const conversation = await Conversation.findById(cid).select("participants");

            if (conversation && conversation.participants) {
              // Fetch and emit `mychat_data` for all participants in the conversation
              await Promise.all(
                conversation.participants.map(async (participant) => {
                  let page = 1;
                  let limit = 20;

                  // Fetch chat data for the participant
                  const response = await Axios.get(`${socketIP}/chat/my-chat`, {
                    params: { loginid: participant.userId, page, limit },
                  });

                  if (response?.data?.data) {
                    const list = response.data.data;

                    // Emit the updated chat list to the sender (activeLogin)
                    if (loginid === participant.userId) {
                      socket.emit("mychat_data", list);  // Emit to the sender
                      console.log("Sent to sender", list);
                    }

                    // Emit `mychat_data` directly to the participant even if they are not in the room
                    io.to(cid).emit("mychat_data", list);  // Emit directly to the participant
                    console.log("Sent directly to participant", list);
                  }
                })
              );
            }
          // Get all users in the room
          const room = io.sockets.adapter.rooms.get(cid);
          console.log("room", room)
          if (room) {
            
            // Update the message as read for all participants except the sender
            if (room.size > 1) {
              await Message.updateOne(
                { _id: newMessage._id },
                {
                  $addToSet: {
                    readBy: {
                      userId: loginid,
                      readAt: new Date(),
                    },
                  },
                }
              );
            }
          }
          
        } catch (error) {
          console.error("Error in send_message:", error);
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

app.get("/api", (req,res) => {
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
