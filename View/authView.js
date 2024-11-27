import express from 'express';
import {signUp, login, forgetPassword, resetPassword, follower, following} from '../Controller/authController.js';
import ProtectRoute from '../middleware/ProtectRoute.js';
import { ErrorHandler } from '../utilis/ErrorHandlingMiddleware.js';

const router = express.Router();


router.post("/signup", signUp);
router.post("/login", login);
router.post("/forget_password",forgetPassword);
router.post("/reset_password", ProtectRoute, resetPassword);
router.post("/follower/:id", ProtectRoute, follower);
router.post("/following/:id", ProtectRoute, following);

router.use(ErrorHandler);

export default router;