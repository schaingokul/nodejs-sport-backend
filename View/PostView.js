import express from 'express';
import {createPost, deletePost, viewAllPost, likeUnLikePost, createComment, deleteComment, viewCurrentPost, typeofViewPost} from '../Controller/PostController.js';
import ProtectRoute from '../middleware/ProtectRoute.js';
import {upload} from '../utilis/uploadFiles.js'


const router = express.Router();

router.post("/post", ProtectRoute, upload.fields([{ name: 'URL', maxCount: 5 }]), createPost);
router.get("/view", ProtectRoute, viewAllPost);
router.get("/view/:id", ProtectRoute, viewCurrentPost);
router.post("/view/:type", ProtectRoute, typeofViewPost);
router.post("/like/:id", ProtectRoute, likeUnLikePost);

// post Delete
router.delete("/delete/:id", ProtectRoute, deletePost);
// Create Comment & delete Comment
router.post("/comment/:id",ProtectRoute, createComment);
router.delete("/comment/:id",ProtectRoute, deleteComment);

export default router;