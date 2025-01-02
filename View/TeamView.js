import express from 'express';
import protectRoute from '../middleware/ProtectRoute.js';
import { buildTeam, DeleteTeam, UpdateTeam, MyTeams ,updatePlayerStatus } from '../Controller/TeamController.js';
import {searchTeam, createEvent, viewTeamDetails, viewEvent } from '../Controller/Event/evenControllers.js';
import UserDetails from '../Model/UserModelDetails.js'

const router = express.Router();

router.get("/", protectRoute, MyTeams); // View Team as player or captain
router.post("/", protectRoute, buildTeam); // Create Team
router.delete("/:teamId", protectRoute, DeleteTeam); // Delete Team
router.put("/:teamIdToFind", protectRoute, UpdateTeam); // Update Team
router.put("/status/:teamIdToFind", protectRoute, updatePlayerStatus); // Player Status


router.get("/teams" ,protectRoute, searchTeam);
router.post("/event",protectRoute, createEvent);
router.get("/event", protectRoute ,viewTeamDetails);
router.get("/view" , protectRoute , viewEvent);

router.delete("/delete/:userid/:id", async (req, res) => {
    const { id, userid } = req.params;

    try {
        // Fetch the user from the database with the "PlayFor" field
        const user = await UserDetails.findById(userid).select("PlayFor");
        console.log("Before", user);

        // Ensure PlayFor is an array, then filter out the team by Team_Id
        user.PlayFor = user.PlayFor.filter(team => team.Team_Id.toString() !== id.toString());

        console.log("After", user);

        // Save the user document after modification
        await user.save();

        // Send a success response
        res.status(200).json({ status: true, message: "Team deleted successfully." });
    } catch (error) {
        // Send an error response if something goes wrong
        res.status(500).json({ status: false, message: `Error deleting team: ${error.message}` });
    }
});

export default router