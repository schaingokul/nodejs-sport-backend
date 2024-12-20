import express from 'express';
import protectRoute from '../../middleware/ProtectRoute.js';
import { getUsersForSidebar, chatSearch } from '../../Controller/Chat/userAppController.js';

const router = express.Router();

router.get("/", protectRoute, getUsersForSidebar);
router.get("/search", protectRoute, chatSearch);

export default router;