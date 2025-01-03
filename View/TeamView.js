import express from 'express';
import protectRoute from '../middleware/ProtectRoute.js';
import { buildTeam, DeleteTeam, UpdateTeam, MyTeams ,updatePlayerStatus } from '../Controller/TeamController.js';
import {searchTeam, createEvent, viewEvent , eventApproved , eventRequesting} from '../Controller/Event/evenControllers.js';


const router = express.Router();

router.get("/", protectRoute, MyTeams); // View Team as player or captain
router.post("/", protectRoute, buildTeam); // Create Team
router.delete("/:teamId", protectRoute, DeleteTeam); // Delete Team
router.put("/:teamIdToFind", protectRoute, UpdateTeam); // Update Team
router.put("/status/:teamIdToFind", protectRoute, updatePlayerStatus); // Player Status


router.get("/teams" , protectRoute, searchTeam);
router.post("/event", protectRoute, createEvent);
router.get("/event" , protectRoute , viewEvent);
router.post("/req" , protectRoute , eventRequesting);
router.post("/status" , protectRoute , eventApproved);


export default router