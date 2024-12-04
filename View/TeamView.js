import express from 'express';
import protectRoute from '../middleware/ProtectRoute.js';
import { buildTeam, DeleteTeam, UpdateTeam} from '../Controller/TeamController.js';
import UserDetails from '../Model/UserModelDetails.js'

const router = express.Router();

router.post("/createteam", protectRoute, buildTeam);
router.delete("/deleteteam/:teamid", protectRoute, DeleteTeam);
router.put("/updateteam/:teamIdToFind", protectRoute, UpdateTeam);

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
        res.status(400).json({ status: false, message: `Error deleting team: ${error.message}` });
    }
});

export default router