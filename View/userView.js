import express from 'express';
import { viewUserProfile, SaveUserProfile, sportsView, sportsAdd, sportsEdit, sportsClear } from '../Controller/personalController.js';

const router = express.Router();


/*Personal Details*/
router.get("/profile/:uuid", viewUserProfile);
router.post("/profile_save/:uuid", SaveUserProfile);

/*SportsInfo*/
router.get("/sports_view/:uuid", sportsView);
router.post("/sports_add/:uuid", sportsAdd);
router.patch("/sports_edit/:uuid/:sportid", sportsEdit);
router.delete("/sports_clear/:uuid/:sportid", sportsClear);



export default router;