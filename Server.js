import express from "express";
import cors from "cors";
import bodyParser from "body-parser";
import { connectDB } from "./Model/ConnectDB.js";
import authRouter from './View/authView.js';
import userRouter from './View/userView.js';
import postRouter from './View/PostView.js';
import path from "path";
import { fileURLToPath } from 'url';


const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = process.X_ZOHO_CATALYST_LISTEN_PORT || 4500 || "147.79.68.157:4500";

const app = express();

app.use(cors({ origin: '*' }));
app.use(express.json());
app.use(bodyParser.json());
app.use(express.static(__dirname));

app.use('/api/auth', authRouter);
app.use('/api/user', userRouter);
app.use('/api/user', postRouter);



app.listen(PORT, async() => {
    try {
        await connectDB();
        console.log(`Server is running on Port: ${PORT} `);
    } catch (error) {
        console.log(`Server is not connected to PORT: ${error.message}`);
    }
});


