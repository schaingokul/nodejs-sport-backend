import express from 'express';
import {createPost, deletePost, getHomeFeed, likeUnLikePost, createComment, deleteComment, viewCurrentPost, typeofViewPost,myViewPost, searchAlgorithm} from '../Controller/PostController.js';
import ProtectRoute from '../middleware/ProtectRoute.js';
import {upload} from '../utilis/uploadFiles.js'


const router = express.Router();

router.post("/post", ProtectRoute, upload.fields([{ name: 'URL', maxCount: 5 }]), createPost);
router.get("/view", ProtectRoute, getHomeFeed);
router.get("/view/:id", ProtectRoute, viewCurrentPost);
router.get("/mypost", ProtectRoute, myViewPost);
router.post("/view/:type", ProtectRoute, typeofViewPost);
router.post("/like/:id", ProtectRoute, likeUnLikePost);

// post Delete
router.delete("/delete/:id", ProtectRoute, deletePost);
// Create Comment & delete Comment
router.post("/comment/:id",ProtectRoute, createComment);
router.delete("/comment/:id",ProtectRoute, deleteComment);


router.post("/trail", ProtectRoute, searchAlgorithm);

export default router;