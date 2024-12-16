import express from 'express';
import {createPost, deletePost, getHomeFeed,
    viewCurrentPost, typeofViewPost, myViewPost, searchAlgorithm, } from '../Controller/PostController/PostController.js';
import{ likeUnLikePost, likeCount} from '../Controller/PostController/likeUnlike.js'
import ProtectRoute from '../middleware/ProtectRoute.js';
import {upload} from '../utilis/uploadFiles.js'
import {viewPostComments, createPostComment, deletePostComment}from '../Controller/PostController/Comment.js';

const router = express.Router();

router.post("/post", ProtectRoute, upload.fields([{ name: 'URL', maxCount: 5 }]), createPost);
router.delete("/delete/:id", ProtectRoute, deletePost);

//Home
router.get("/home", ProtectRoute, getHomeFeed);
router.get("/home/:id", ProtectRoute, viewCurrentPost);
router.post("/home/:type", ProtectRoute, typeofViewPost);

//Personal
router.get("/mypost", ProtectRoute, myViewPost);
router.get("/mypost/:id", ProtectRoute, viewCurrentPost);

// Create Like/UnLike
router.get('/like/id', ProtectRoute, likeCount);
router.post("/like/:id", ProtectRoute, likeUnLikePost);

// Create Comment & delete Comment
router.get("/comment/:id/view",ProtectRoute, viewPostComments);
router.post("/comment/:id",ProtectRoute, createPostComment);
router.delete("/comment/:id",ProtectRoute, deletePostComment);


router.post("/trail", ProtectRoute, searchAlgorithm);

export default router;