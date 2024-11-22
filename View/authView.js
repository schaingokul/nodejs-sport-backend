import express from 'express';
import {signUp, login, forgetPassword, resetPassword } from '../Controller/authController.js';

const router = express.Router();

router.post("/signup", signUp);
router.post("/login", login);
router.post("/forget_password", forgetPassword);
router.post("/reset_password", resetPassword);

export default router;