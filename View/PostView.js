import express from 'express';
import {postAdd, postView, postLike, postComment} from '../Controller/PostController.js';
import protectRoute from '../middleware/ProtectRoute.js';

const router = express.Router();

router.post("/post/:uuid", postAdd);
router.get("/view",protectRoute,  postView);
router.post("/like/:uuid/:id", postLike);
router.post("/comment/:uuid/:id", postComment);


/*

import { createPost, ViewPost } from '../Controller/PostController.js';
import multer from "multer";
import path from "path";
import { fileURLToPath } from 'url';
import fs from "fs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const image = path.join(__dirname, "../images");

if (!fs.existsSync(image)) {
    fs.mkdirSync(image, { recursive: true });
    console.log("Pass1");
}

const router = express.Router();

const storage = multer.diskStorage({
    destination:(req, file, cb)=>{
        cb(null, path.join(__dirname,"../images"))
        console.log("Pass3");
    },
    filename:(req, file, cb)=> {
        cb(null, `${file.fieldname}-${Date.now()}-${file.originalname}`)
        console.log("Pass4");
    }   
})

const upload = multer({storage: storage});

router.post("/createpost", upload.fields([{ name: 'image', maxCount: 10 },{ name: 'videos', maxCount: 5 }]), createPost);
router.get("/viewpost", ViewPost);*/

export default router;