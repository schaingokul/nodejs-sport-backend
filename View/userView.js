import express from 'express';
import { viewUserProfile, SaveUserProfile, sportsView, sportsAdd, sportsEdit, sportsClear } from '../Controller/personalController.js';
import ProtectRoute from '../middleware/ProtectRoute.js'

const router = express.Router();

/*Personal Details*/
router.get("/profile",ProtectRoute, viewUserProfile);
router.post("/profile_save", ProtectRoute, SaveUserProfile);

/*SportsInfo*/
router.get("/sports_view",ProtectRoute,  sportsView);
router.post("/sports_add", ProtectRoute, sportsAdd);
router.patch("/sports_edit/:sportid",ProtectRoute, sportsEdit);
router.delete("/sports_clear/:sportid", ProtectRoute, sportsClear);


export default router;