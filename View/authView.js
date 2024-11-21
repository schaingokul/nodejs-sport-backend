import express from 'express';
import {signUp, login, forgetPassword, resetPassword } from '../Controller/authController.js';
import {userProfile, sportsProfile, ViewSports, updateSports} from '../Controller/personalController.js';

const router = express.Router();

router.post("/signup", signUp);
router.post("/login", login);
router.post("/forget_password", forgetPassword);
router.post("/reset_password", resetPassword);

/*Personal Details*/
router.post("/:uuid/userprofile", userProfile);
router.post("/:uuid/sportprofile", sportsProfile);
router.get("/:uuid/view", ViewSports);
router.post("/:uuid/view/:sportid", updateSports);

export default router;