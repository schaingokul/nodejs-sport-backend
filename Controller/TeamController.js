import UserDetails from "../Model/UserModelDetails.js";

export const buildTeam = async(req,res) => {
    const {id, uuid} = req.user;
    const {Team_Name, Sports_Name, TotalPlayers, playersList} = req.body;

    try {   
        // Fetch current user by ID
        const currentUser = await UserDetails.findById(id)
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

        // Prepare a list of players to add to the team
        const local = playersList.map(player => {
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
            createdBy: uuid,
            Team_Name: Team_Name,
            Sports_Name: Sports_Name,
            TotalPlayers: TotalPlayers,
            playersList: local
        });

        currentUser.MyTeamBuild.push(createTeam);
        const updatedUser = await currentUser.save();

        const newTeamid = updatedUser.MyTeamBuild[updatedUser.MyTeamBuild.length - 1]._id;

        const sendplayerDetails = {
            createdBy: uuid,
            Team_Id: newTeamid,
            Team_Name: Team_Name,
            Sports_Name: Sports_Name,
            TotalPlayers: TotalPlayers,
            playersList: local
        }
        users.forEach(async(list) => { 
            let localStore = await UserDetails.findOne({uuid: list.uuid});
            if (localStore) {
                localStore.PlayFor.push(sendplayerDetails);
                await localStore.save();
              }
        })
        
        res.status(200).json({status: true, message: `Create Team Sucessfully by ${currentUser.First_Name}`, TeamMembers: createTeam });
    } catch (error) {
        res.status(200).json({status: false, message: `Create Team Causes Route Error: ${error.message}`});
    }
};
/*

Create TeamBuild 
createdBy CurrentUser
TeamName and sportName unique //completed
player are available in userDetails omit the person which is not found //completed
no.of players and available players should be same count //completed
data inserted to myTeamBuild // completed
send individual playerlist to that paritucular user to store data 

*/

export const DeleteTeam = async(req,res) => {
    const {id} = req.user;
    const {teamid} = req.params
    try {
        // Fetch the user and the team
        const user = await UserDetails.findById(id).select("uuid MyTeamBuild");

        if (!user) {
            return res.status(404).json({ status: false, message: "User not found." });
        }

        // Find the team to delete
        const currentTeam = user.MyTeamBuild.find((team) => team._id.toString() === teamid);

        if (!currentTeam) {
            return res.status(404).json({ status: false, message: "Team not found." });
        }

        // Get the list of player IDs in the team
        const playerIDs = currentTeam.playersList.map(player => player.Player_id);

        // Remove the team from the user's MyTeamBuild array
        user.MyTeamBuild = user.MyTeamBuild.filter(team => team._id.toString() !== teamid);
        await user.save();  // Save updated user document

        // Remove the team from each player's PlayFor array
        for (const playerID of playerIDs) {
            const currentPlayerUser = await UserDetails.findOne({ uuid: playerID }).select("PlayFor");

            if (currentPlayerUser) {
                currentPlayerUser.PlayFor = currentPlayerUser.PlayFor.filter(team => team.Team_Id.toString() !== teamid);
                await currentPlayerUser.save();  // Save updated player document
            }
        }
        res.status(200).json({status: true, message: `Team ${currentTeam.Team_Name} deleted successfully.`, team: currentTeam});
    } catch (error) {
        res.status(200).json({status: false, message: `Delete Team Causes Route Error: ${error.message}`});
    }
};

export const UpdateTeam = async (req, res) => {
    const { id, uuid } = req.user; // Extract user ID from request
    const { teamIdToFind } = req.params; // Extract team ID from the request params
    const { Team_Name, Sports_Name, TotalPlayers, playersList } = req.body; // Extract team details and players from the request body

    try {
        // Step 1: Fetch the user's data from the database using their ID
        const user = await UserDetails.findById(id).select("First_Name Last_Name MyTeamBuild PlayFor");
        if (!user) {
            return res.status(200).json({ status: false, message: "User not found." });
        }

        // Step 2: Create hash maps to quickly find teams and players by their IDs
        const MyTeamBuildHashMap = createHashMap(user.MyTeamBuild, "_id"); // HashMap for teams in "MyTeamBuild"
        const PlayForHashMap = createHashMap(user.PlayFor, "Team_Id"); // HashMap for players in "PlayFor"
        
        // Step 3: Find the current team and players based on the teamIdToFind
        const currentTeam = findInHashMap(MyTeamBuildHashMap, teamIdToFind);
        // const currentPlayers = findInHashMap(PlayForHashMap, teamIdToFind);
        const oldTeam = user.MyTeamBuild.find(team => team._id.toString() === teamIdToFind); // Single team match
        const oldUserId = oldTeam ? oldTeam.playersList.map(player => player.Player_id) : []; // Old player IDs

        // If no team is found
        if (!currentTeam) {
            return res.status(200).json({ status: false, message: "Team not found." });
        }

        // Step 4: Validate player positions
        const positions = playersList.map(player => player.Position);
        if (new Set(positions).size !== positions.length) {
            return res.status(200).json({ status: false, message: "Player positions must be unique." });
        }

        const totalPlayersNumber = parseInt(TotalPlayers);
        const positionOutOfRange = positions.find(position => position < 1 || position > totalPlayersNumber);
        if (positionOutOfRange) {
            return res.status(200).json({ status: false, message: `Player positions must be between 1 and ${totalPlayersNumber}.` });
        }

        // Step 5: Prepare a list of user IDs to validate their existence
        const updateUserId = playersList.map(player => player.Player_id);
        const foundUser = await UserDetails.find({ uuid: { $in: updateUserId } });

        // If not all users are found, return missing player IDs
        if (foundUser.length !== playersList.length) {
            const missingPlayers = updateUserId.filter(id => !foundUser.find(user => user.uuid === id));
            return res.status(200).json({ status: false, message: `The following player IDs are missing: ${missingPlayers.join(", ")}` });
        }

        // Step 6: Create local player objects with positions and initial status
        const local = playersList.map(player => ({
            Player_id: player.Player_id,
            Position: player.Position,
            Status: "N/A" // Default status for new players
        }));

        // Step 7: Validate if the number of players matches TotalPlayers
        if (local.length !== totalPlayersNumber) {
            return res.status(200).json({ status: false, message: `The total number of players (${local.length}) does not match the expected TotalPlayers (${TotalPlayers}).` });
        }

        const updatedUser = await UserDetails.findOneAndUpdate(
            { _id: id, "MyTeamBuild._id": teamIdToFind },
            { 
                $set: { 
                    "MyTeamBuild.$.Team_Name": Team_Name,
                    "MyTeamBuild.$.Sports_Name": Sports_Name,
                    "MyTeamBuild.$.TotalPlayers": TotalPlayers,
                    "MyTeamBuild.$.playersList": local
                }
            },
            { new: true }
        );

        if (!updatedUser) {
            return res.status(200).json({ status: false, message: "Team update failed." });
        };

        const sendplayerDetails = {
            createdBy: uuid,
            Team_Id: teamIdToFind,
            Team_Name: Team_Name,
            Sports_Name: Sports_Name,
            TotalPlayers: TotalPlayers,
            playersList: local
        }
        
        const long = oldUserId.length >= foundUser.length ? oldUserId : foundUser;

        for (const playerId of long) {
            // Step 4: Check if the player is in the shorter list (new or old)
            const playerInNewTeam = updateUserId.includes(playerId);
            
            // If the player is in the new team, remove their old team info and update PlayFor
            if (playerInNewTeam) {
                const playerUser = await UserDetails.findOne({ uuid: playerId }).select("PlayFor");

                if (playerUser) {
                    // Remove the old team details from PlayFor
                    playerUser.PlayFor = playerUser.PlayFor.filter(team => team.Team_Id.toString() !== teamIdToFind);
                    // Add the new team details to PlayFor
                    playerUser.PlayFor.push(sendplayerDetails);
                    await playerUser.save();
                }
            } else {
                // If the player is not in the new team, remove them from PlayFor
                const playerUser = await UserDetails.findOne({ uuid: playerId }).select("PlayFor");

                if (playerUser) {
                    // Remove the team from PlayFor array
                    playerUser.PlayFor = playerUser.PlayFor.filter(team => team.Team_Id.toString() !== teamIdToFind);
                    await playerUser.save();
                }
            }
        }

        // Step 11: Send a successful response with the updated team and players
        return res.status(200).json({ status: true, message: `Team updated successfully.`, team: updatedUser});

    } catch (error) {
        console.log(error.message)
        return res.status(200).json({ status: false, message: `Update Team Causes Route Error: ${error.message}` });
    }
};

// Helper Functions

// createHashMap function creates a hashmap from an array based on a keyField.
function createHashMap(array, keyField) {
    return array.reduce((map, item) => {
        if (item && item[keyField]) {
            map[item[keyField].toString()] = item; // Use keyField as the key in the map
        }
        return map;
    }, {});
}

// findInHashMap function looks up an ID in a hashmap and returns the corresponding item.
function findInHashMap(hashMap, id) {
    return hashMap[id] || null;
}

/*
Apis Ready to Check 
Team Creation: Building a Team and Assigning Players
Team Deletion: Removing a Team and Associated Player Data
Team Update: Modifying Team Information and Player Assignments

Pending Task
Player Status: Accept or Decline Team Participation
*/

export const MyTeams = async (req, res) => {
    const {id} = req.user
    try {
        const userDetails = await UserDetails.findById(id).lean().select("MyTeamBuild");
        return res.status(200).json({ status: true, message: `MyTeams`, myTeams:userDetails  });
    } catch (error) {
        console.log(error.message)
        return res.status(200).json({ status: false, message: `MyTeams Causes Route Error: ${error.message}` }); 
    }
};

export const MyCurrentTeams = async (req, res) => {
    const {id} = req.user
    const {teamid} = req.params
    try {
        const userDetails = await UserDetails.findOne({_id: id, 'MyTeamBuild._id': teamid }).lean().select("MyTeamBuild");
        return res.status(200).json({ status: true, message: `MyTeams ${userDetails.MyTeamBuild.Team_Name}`, TeamInfo: userDetails});
    } catch (error) {
        console.log(error.message)
        return res.status(200).json({ status: false, message: `Team PalyerStatus Causes Route Error: ${error.message}` }); 
    }
};

export const PlayForStatus = async (req, res) => {
    const {id} = req.user
    try {
        const userDetails = await UserDetails.findById(id).lean().select("PlayFor");
        return res.status(200).json({ status: true, message: `MyTeams`, TeamsPlayFor: userDetails  });
    } catch (error) {
        console.log(error.message)
        return res.status(200).json({ status: false, message: `Team PalyerStatus Causes Route Error: ${error.message}` }); 
    }
}

export const CurrentPlayerStatus = async (req, res) => {
    const {id} = req.user
    const {teamid} = req.params
    try {
        const userDetails = await UserDetails.findOne({_id: id, 'PlayFor.Team_Id': teamid }).lean().select("PlayFor");
        const teamDetails = userDetails.PlayFor.find((team) => team.Team_Id.toString() === teamid);
        return res.status(200).json({ status: true, message: `MyTeams `, TeamInfo: teamDetails});
    } catch (error) {
        console.log(error.message)
        return res.status(200).json({ status: false, message: `Team PalyerStatus Causes Route Error: ${error.message}` }); 
    }
};

export const PlayerStatus = async (req, res) => {
    const { id, uuid } = req.user; // Current user ID and UUID
    const { teamid } = req.params; // Team ID from request parameters

    try {
        const Info = await UserDetails.find({ $or: [{ 'MyTeamBuild._id': teamid },{ 'PlayFor.Team_Id': teamid }]}).select("uuid MyTeamBuild PlayFor");
        console.log(Info)
        
        return res.status(200).json({ status: true, message: "Status Updated" ,Info });
    } catch (error) {
        console.error(error.message);
        return res.status(500).json({ status: false, message: `Team Player Status Causes Route Error: ${error.message}` });
    }
};