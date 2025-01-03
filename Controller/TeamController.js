import UserDetails from "../Model/UserModelDetails.js";
import { mergeSort } from "../utilis/TeamAlgorithm.js";

export const MyTeams = async (req, res) => {
    const {id: userLogin, uuid: userUuid} = req.user;
    let {type} = req.query;

    try {
        let usersWithMatchingTeams;
        let query = { uuid: userUuid };

        if (type === "player") {
            usersWithMatchingTeams = await UserDetails.aggregate([
                { $match: query }, 
                { $project: { uuid: 1, MyTeamBuild: { $filter: { input: "$MyTeamBuild", as: "team", cond: { $eq: ["$$team.role", "player"] } } }}}, { $sort: { updatedAt: -1 } } ]);

        } else if (type === "captain") {
            usersWithMatchingTeams = await UserDetails.aggregate([
                { $match: query },
                { $project: { uuid: 1,  MyTeamBuild: { $filter: { input: "$MyTeamBuild", as: "team", cond: { $eq: ["$$team.role", "captain"] }} } }},{ $sort: { updatedAt: -1 } } ]);
            
        } else {
            return res.status(400).json({ status: false, message: "Invalid type parameter. Use 'player' or 'captain'."});
        }

        return res.status(200).json({ status: true, message: `Team Details is Viewed Sucess`, usersWithMatchingTeams  });
    } catch (error) {
        console.log(error.message)
        return res.status(200).json({ status: false, message: `MyTeams Causes Route Error: ${error.message}` }); 
    }
};

export const buildTeam = async(req,res) => {
    const {id: userId, uuid: userUuid} = req.user;
    const {Team_Name, Sports_Name, TotalPlayers, playersList} = req.body;

    try {

        // Fetch current user by ID
        const currentUser = await UserDetails.findById(userId)
        if (!currentUser) {
            return res.status(200).json({ status: false, message: "User not found." });
        }

        // Check if all positions are unique
        const positions = playersList.map(player => player.Position);
        if (new Set(positions).size !== positions.length) {
        return res.status(200).json({ status: false, message: "Player positions must be unique." });
        }

        // Check if all positions are within the range (e.g., 1 to TotalPlayers)
        const totalPlayersNumber = parseInt(TotalPlayers);
        const positionOutOfRange = positions.find(position => position < 1 || position > totalPlayersNumber);

        if (positionOutOfRange) {
        return res.status(200).json({status: false, message: `Player positions must be between 1 and ${totalPlayersNumber}.`});
        }

        // Check if required fields are provided
         if (!Team_Name || !Sports_Name || !TotalPlayers || !playersList || !Array.isArray(playersList)) {
            return res.status(200).json({ status: false, message: "Invalid input. All fields are required." });
        }

        // Extract player IDs from playerList
        const userIDs = playersList.map(player => player.Player_id); 
        console.log("playerList_userIDs", userIDs)

        // Query the database to find all users whose uuid is in the list of player IDs
        const users = await UserDetails.find({ uuid: { $in: userIDs } });
        console.log("FinduserIDs", users)

        // Check if all player IDs are found
        if (users.length !== playersList.length) {
            // Find missing player IDs
            const missingPlayers = userIDs.filter(id => !users.find(user => user.uuid === id));

            return res.status(200).json({ status: false, message: `The following player IDs are missing: ${missingPlayers.join(", ")}`});
        }

        const sortedPlayersList  = mergeSort(playersList);

        // Prepare a list of players to add to the team
        const local = sortedPlayersList.map(player => {
            return {
                Player_id: player.Player_id,
                Position: player.Position,
                status: "N/A"
            };
        });

        // Check if the number of players matches TotalPlayers
        if (local.length.toString() !== TotalPlayers.toString()) {
            return res.status(200).json({ status: false, message: `The total number of players (${local.length}) does not match the expected TotalPlayers (${TotalPlayers}).`});
        }

        // Create a new team and save it to the database
        const createTeam = ({
            createdBy: userUuid,
            Team_Name: Team_Name,
            Sports_Name: Sports_Name,
            role:"captain",
            TotalPlayers: TotalPlayers,
            playersList: local
        });

        currentUser.MyTeamBuild.push(createTeam);
        const updatedUser = await currentUser.save();

        
        // Now the team has an _id
        const teamId = updatedUser.MyTeamBuild[updatedUser.MyTeamBuild.length - 1]._id;

        // Add the team to the other players
        await Promise.all(users.map(async (list) => {
            let localStore = await UserDetails.findOne({ uuid: list.uuid });
            if (localStore && list.uuid !== userUuid) {
                const setObj = {
                    _id: teamId, // Now the _id is available
                    createdBy: userUuid,
                    Team_Name: Team_Name,
                    Sports_Name: Sports_Name,
                    role: "player", // Other players are assigned the "player" role
                    TotalPlayers: TotalPlayers,
                    playersList: local // Keep the same list of players for other users
                };
                localStore.MyTeamBuild.push(setObj);
                await localStore.save();
            }
        }));

        res.status(200).json({status: true, message: `Create Team Sucessfully by ${currentUser.First_Name}`, TeamMembers: createTeam });
    } catch (error) {
        res.status(200).json({status: false, message: `Create Team Causes Route Error: ${error.message}`});
    }
};

export const DeleteTeam = async (req, res) => {
    const { id: userId, uuid: userUuid } = req.user;
    const { teamId } = req.params;

    try {
        // Validate teamid
        if (!teamId) {
            return res.status(400).json({ status: false, message: "Team ID is required." });
        }
        // Fetch the user's teams
        const user = await UserDetails.findById(userId).select("uuid MyTeamBuild");
        if (!user) {
            return res.status(404).json({ status: false, message: "User not found." });
        }

        // Find the team
        const currentTeam = user.MyTeamBuild.find((team) => team?._id?.toString() === teamId);
        if (!currentTeam) {
            return res.status(404).json({ status: false, message: "Team not found." });
        }

        // Validate admin or creator rights
        if (currentTeam.role !== "captain" && currentTeam.createdBy !== userUuid) {
            return res.status(403).json({ status: false, message: "Only admins or team creators can delete this team." });
        }

        // Remove the team from user's MyTeamBuild
        await UserDetails.updateOne({ _id: userId },
            { $pull: { MyTeamBuild: { _id: teamId } } }
        );

        // Remove the team from each player's PlayFor array
        const playerIDs = currentTeam.playersList?.map((player) => player.Player_id) || [];
        await Promise.all(
            playerIDs.map(async (playerID) => {
                await UserDetails.updateOne({ uuid: playerID }, { $pull: { MyTeamBuild: { _id: teamId } } } );
            })
        );
        
        res.status(200).json({ status: true, message: `Team "${currentTeam.Team_Name}" deleted successfully.`, });
    } catch (error) {
        res.status(500).json({ status: false, message: "Delete Team Causes Route Error", error: error.message, });
    }
};
export const UpdateTeam = async (req, res) => {
    const { id: userId, uuid: userUuid } = req.user; // Extract user ID and UUID
    const { teamIdToFind } = req.params; // Extract team ID from params
    const updateField = req.body; // Extract team update fields

    try {
        if (!updateField) {
            return res.status(400).json({ status: false, message: "No update fields provided." });
        }

        // Step 1: Fetch the user's data
        const user = await UserDetails.findById(userId).select("uuid MyTeamBuild");
        if (!user) {
            return res.status(404).json({ status: false, message: "User not found." });
        }

        const teamMap = new Map(user.MyTeamBuild.map(team => [team._id.toString(), team]));
        const currentTeam = teamMap.get(teamIdToFind);

        if (!currentTeam) {
            return res.status(404).json({ status: false, message: "Team not found." });
        }

        if (currentTeam.createdBy !== userUuid && currentTeam.role !== "captain") {
            return res.status(403).json({ status: false, message: "Only Captain or Creator can modify this team." });
        }

        // Step 2: Build the update object for MyTeamBuild
        const updateFields = {};
        if (updateField.Team_Name) updateFields["MyTeamBuild.$.Team_Name"] = updateField.Team_Name;
        if (updateField.Sports_Name) updateFields["MyTeamBuild.$.Sports_Name"] = updateField.Sports_Name;
        if (updateField.TotalPlayers) updateFields["MyTeamBuild.$.TotalPlayers"] = updateField.TotalPlayers;

        if (updateField.playersList) {
            // Ensure unique positions and validate player positions
            const positionsSet = new Set();
            const totalPlayers = parseInt(updateField.TotalPlayers || currentTeam.TotalPlayers);

            for (const player of updateField.playersList) {
                if (positionsSet.has(player.Position)) {
                    return res.status(400).json({ status: false, message: "Player positions must be unique." });
                }
                if (player.Position < 1 || player.Position > totalPlayers) {
                    return res.status(400).json({
                        status: false,
                        message: `Player positions must be between 1 and ${totalPlayers}.`,
                    });
                }
                positionsSet.add(player.Position);
            }
            updateField.playersList = mergeSort(updateField.playersList);

            updateFields["MyTeamBuild.$.playersList"] = updateField.playersList.map(player => ({
                Player_id: player.Player_id,
                Position: player.Position,
                Status: player.Status || "N/A",
            }));
        }

        const updatedUser = await UserDetails.findOneAndUpdate(
            { uuid: userUuid, "MyTeamBuild._id": teamIdToFind },
            { $set: updateFields },
            { new: true } // Step 3: Update the team in MyTeamBuild
        ).select("uuid MyTeamBuild");
 
        // Store only Player_id in arrays for oldPlayers and newPlayerIds
        const oldPlayers = currentTeam.playersList
            .filter(player => player.Player_id.toString() !== userUuid) // Exclude the current user
            .map(player => player.Player_id.toString()); // Store only Player_id

        const newPlayerIds = updateField.playersList
            ?.filter(player => player.Player_id.toString() !== userUuid) // Exclude the current user
            .map(player => player.Player_id.toString());

        const updatedTeam = updatedUser.MyTeamBuild.find(team => team._id.toString() === teamIdToFind);
        if (!updatedTeam) {
            console.error("Updated team not found in user's MyTeamBuild.");
            return res.status(500).json({ status: false, message: "Error fetching updated team details." });
        }

        if (oldPlayers.length > 0) {
            await Promise.all(
                oldPlayers.map(async playerID => {
                    await UserDetails.updateOne(
                        { uuid: playerID },
                        { $pull: { MyTeamBuild: { _id: teamIdToFind } } }
                    );
                })
            );
        }

        const setObj = {
            _id: updatedTeam._id,
            createdBy: updatedTeam.createdBy,
            Team_Name: updatedTeam.Team_Name,
            Sports_Name: updatedTeam.Sports_Name,
            role: "player", // Other players are assigned the "player" role
            TotalPlayers: updatedTeam.TotalPlayers,
            playersList: updatedTeam.playersList,
        };
       
        if (newPlayerIds.length > 0) {
            await Promise.all(
                newPlayerIds.map(async playerId => {
                    // Check if the team exists in the player's MyTeamBuild array
                    const player = await UserDetails.findOne({
                        uuid: playerId,
                        "MyTeamBuild._id": teamIdToFind,
                    });
        
                    if (player) {
                        // If team exists, update the specific team in the array
                        return await UserDetails.updateOne(
                            { uuid: playerId, "MyTeamBuild._id": teamIdToFind },
                            { $set: { "MyTeamBuild.$": setObj } }
                        );
                    } else {
                        // If team does not exist, push a new entry to the array
                        return await UserDetails.updateOne(
                            { uuid: playerId },
                            { $push: { MyTeamBuild: setObj } }
                        );
                    }
                })
            );
        }

        if (!updatedUser) {
            return res.status(500).json({ status: false, message: "Team update failed." });
        }
        console.log("Team updated Pass");

        return res.status(200).json({ status: true, message: "Team updated successfully.", team: updatedTeam });
    } catch (error) {
        console.error(error.message);
        return res.status(500).json({ status: false, message: `Error updating team: ${error.message}` });
    }
};

export const updatePlayerStatus = async(req, res) => {
        const { id: userId, uuid: userUuid } = req.user; // Extract user ID and UUID
        const { teamIdToFind } = req.params; // Extract team ID from params
        const {playerId, status} = req.body; // Extract team update fields
    try {
        if (!playerId || !status) {
            return res.status(400).json({ status: false, message: "Please provide PlayerId and Status." });
        }

        // Step 1: Fetch the user's data
        const player = await UserDetails.findOne({ uuid: userUuid, "MyTeamBuild._id": teamIdToFind }).select("uuid MyTeamBuild");
        if (!player) {
            return res.status(404).json({ status: false, message: "Player not found." });
        }

        // Step 2: Find the specific team
        const team = player.MyTeamBuild?.find(t => t._id.toString() === teamIdToFind);
        if (!team) {
            return res.status(404).json({ status: false, message: "Team not found." });
        }

        const playerToUpdate = team.playersList?.find(p => p.Player_id.toString() === playerId);
        if (!playerToUpdate) {
            return res.status(404).json({ status: false, message: "Player not found in the team." });
        }

        playerToUpdate.status = status;

        let teamPlayers = team.playersList.map(p => p.Player_id);
        // players status is updated to all the players are inside current team
        await UserDetails.updateMany(
            { uuid: { $in: teamPlayers }, "MyTeamBuild._id": teamIdToFind }, // Filter by team players and team ID
            { $set: { "MyTeamBuild.$.playersList": team.playersList } } // Update playersList for matching team
        );

        console.log("updatePlayerStatus Pass");
        return res.status(200).json({ status: true, message: `Player ${status} successfully.`,playerToUpdate });

    } catch (error) {
        console.error(error.message);
        return res.status(500).json({ status: false, message: `Error updatePlayerStatus : ${error.message}` });
    }
}
