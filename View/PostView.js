import express from 'express';
import {postAdd, postView, postLike, postComment, postCurrentView, typeView} from '../Controller/PostController.js';
import ProtectRoute from '../middleware/ProtectRoute.js';
import {upload} from '../utilis/uploadFiles.js'


const router = express.Router();

router.post("/post", ProtectRoute, upload.fields([{ name: 'imageURL', maxCount: 5 }, { name: 'videoURL', maxCount: 2 }]), postAdd);
router.get("/view", ProtectRoute, postView);
router.get("/view/:id", ProtectRoute, postCurrentView);
router.post("/view/:type", ProtectRoute, typeView);
router.post("/like/:id", ProtectRoute, postLike);
router.post("/comment/:id",ProtectRoute, postComment);

export default router;