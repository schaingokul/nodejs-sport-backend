import express from 'express';
import {signUp, login, hello} from '../Controller/UserController.js';

const router = express.Router();

router.post("/signup", signUp);
router.post("/login", login);
router.get("/home", hello);

export default router;