import express from "express";
import cors from "cors";
import bodyParser from "body-parser";
import { connectDB } from "./Model/Model.js";
import router from './View/UserViews.js';


const PORT = process.X_ZOHO_CATALYST_LISTEN_PORT || 4500;

const app = express();

app.use(cors({ origin: '*' }));
app.use(express.json());
app.use(bodyParser.json());


app.use('/api', router);

app.listen(PORT, async() => {
    try {
        await connectDB();
        console.log(`Server is running on Port: ${PORT} `);
    } catch (error) {
        console.log(`Server is not connected to PORT: ${error.message}`);
    }
});


