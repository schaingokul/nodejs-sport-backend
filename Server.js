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

// import MessageRoute from './View/ChatView/messageRoute.js'
// import userAppRoute from './View/ChatView/userAppRoute.js';
// import {app, server} from './socket/Socket.js'

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

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

app.get("/", (req,res) => {
    res.sendFile(path.join(__dirname, "index.html"));
});

/* ------------------------------------------ http://:localhost:4500 ------------------------------------------ */ 
// app.listen(PORT,async () => {
//     try {
//         await connectDB();
//         console.log(`Server is running on ${HOST}:${PORT}`);
//     } catch (error) {
//         console.log(`Server failed to connect to database: ${error.message}`);
//     }
// });

/* --------------------------------------------- Hositing Server --------------------------------------------- */ 
app.listen(PORT, HOST.replace("https://", ""), async () => {
    try {
        await connectDB();
        console.log(`Server is running on ${HOST}:${PORT}`);
    } catch (error) {
        console.log(`Server failed to connect to database: ${error.message}`);
    }
});

/*app.use('/api/message', MessageRoute);
app.use('/api/user', userAppRoute);*/
