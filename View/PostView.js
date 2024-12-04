import express from 'express';
import {postAdd, postView, postLike, postComment, postCurrentView} from '../Controller/PostController.js';
import ProtectRoute from '../middleware/ProtectRoute.js';
import {upload} from '../utilis/uploadFiles.js'


const router = express.Router();

router.post("/post", ProtectRoute, upload.fields([{ name: 'PostImage_URL', maxCount: 10 }, { name: 'videoImageURL', maxCount: 5 }]), postAdd);
router.get("/view", ProtectRoute,  postView);
router.get("/view/:id", ProtectRoute,  postCurrentView);
router.post("/like/:id", ProtectRoute, postLike);
router.post("/comment/:id",ProtectRoute, postComment);

export default router;