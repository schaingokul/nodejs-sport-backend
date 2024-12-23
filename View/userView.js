import express from 'express';
import { viewUserProfile, SaveUserProfile, sportsView, sportsAdd, sportsEdit, sportsClear , sportsCertificateAdd} from '../Controller/personalController.js';
import ProtectRoute from '../middleware/ProtectRoute.js'
import {upload} from '../utilis/uploadFiles.js'

const router = express.Router();

/*Personal Details*/
router.get("/profile",ProtectRoute, viewUserProfile);
router.post("/profile_save", ProtectRoute, upload.fields([{ name: 'Profile_ImgURL', maxCount: 1 }]), SaveUserProfile);

/*SportsInfo*/
router.get("/sports_view",ProtectRoute,  sportsView);
router.post("/sports_add", ProtectRoute, upload.fields([{ name: 'sp', maxCount: 1 },{ name: 'sURL', maxCount: 2 },{ name: 'sVURL', maxCount: 1 }]), sportsAdd);
router.patch("/sports_edit/:sportid", ProtectRoute, upload.fields([{ name: 'sp', maxCount: 1 },{ name: 'sURL', maxCount: 2 },{ name: 'sVURL', maxCount: 1 }]), sportsEdit);

router.post("/sports_edit/:sportid/doc", ProtectRoute,upload.fields([{ name: 'Sports_Certificate_PostImage_URL', maxCount: 1 },{ name: 'Sports_Certificate_videoImageURL', maxCount: 1 }]),sportsCertificateAdd);
//router.patch("/sports_edit/:sportid/doc/:docid", ProtectRoute, upload.fields([{ name: 'Sports_Certificate_PostImage_URL', maxCount: 1 },{ name: 'Sports_Certificate_videoImageURL', maxCount: 1 }]), sportsCertificateEdit);

/* SportsInfo Delete Including Files Also*/
router.delete("/sports_clear/:sportid", ProtectRoute, sportsClear);

export default router;
