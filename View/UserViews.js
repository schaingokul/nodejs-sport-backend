import express from 'express';
import {signUp, login, forgetPassword, resetPassword} from '../Controller/authController.js';

const router = express.Router();

router.post("/signup", signUp);
router.post("/login", login);
router.post("/forgetpassword", forgetPassword);
router.post("/resetpassword", resetPassword);

export default router;