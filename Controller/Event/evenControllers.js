import UserDetails from "../../Model/UserModelDetails.js" // UserDetails
import eventRequest from '../../Model/eventRequestModel.js' //eventList
import moment from "moment-timezone";

const getFormattedDateTime = () => moment().tz("Asia/Kolkata").format("YYYY-MM-DD hh:mm A");

export const searchTeam = async (req, res) => {
    const { uuid: userUuid } = req.user;
    let { search, type, useTeamID } = req.query;

    try {
        // Validate `type`
        if (!["team", "players", "myteam"].includes(type)) {
            return res.status(400).json({ status: false, message: "Invalid type provided." });
        }

        search = search?.toLowerCase();
        let query = {};
        let response = [];

        // Handle "team" or "myteam" search
        if (type === "myteam" || type === "team") {
            if (useTeamID) {
                // Query for the specific team by team ID and user UUID
                query = {
                    uuid: userUuid,
                    "MyTeamBuild._id": useTeamID,
                };

                const userWithTeam = await UserDetails.findOne(query).select("uuid userInfo MyTeamBuild");
                const team = userWithTeam?.MyTeamBuild.find((team) => String(team._id) === useTeamID);

                if (team) {
                    // Fetch player details for the specific team
                    const playerList = await Promise.all(
                        team.playersList?.map(async (player) => {
                            const playerDetails = await UserDetails.findOne({ uuid: player.Player_id });
                            return {
                                userId: playerDetails?._id,
                                userProfile: playerDetails?.userInfo?.Profile_ImgURL,
                                userName: playerDetails?.userInfo?.Nickname,
                                playerUuid: player.Player_id,
                                position: player.Position,
                                status: player.status,
                                role: userUuid === team.createdBy ? "captain" : "player",
                            };
                        }) || []
                    );

                    response = {
                        T_id: team._id,
                        T_Name: team.Team_Name,
                        S_Name: team.Sports_Name,
                        role: team.role,
                        T_P: team.TotalPlayers,
                        p_L: playerList,
                        isReady: team.isReady,
                    };
                }
            } else if (search) {
                // Query for teams matching the search term
                query = {
                    uuid: userUuid,
                    $or: [
                        { "MyTeamBuild.Team_Name": { $regex: search, $options: "i" } },
                        { "MyTeamBuild.Sports_Name": { $regex: search, $options: "i" } },
                    ],
                };

                const usersWithTeams = await UserDetails.find(query).select("uuid userInfo MyTeamBuild");

                response = await Promise.all(
                    usersWithTeams.flatMap((user) =>
                        user.MyTeamBuild.map(async (team) => {
                            const playerList = await Promise.all(
                                team.playersList?.map(async (player) => {
                                    const playerDetails = await UserDetails.findOne({ uuid: player.Player_id });
                                    return {
                                        userId: playerDetails?._id,
                                        userProfile: playerDetails?.userInfo?.Profile_ImgURL,
                                        userName: playerDetails?.userInfo?.Nickname,
                                        playerUuid: player.Player_id,
                                        position: player.Position,
                                        status: player.status,
                                        role: team.createdBy === userUuid ? "captain" : "player",
                                    };
                                }) || []
                            );

                            return {
                                T_id: team._id,
                                T_Name: team.Team_Name,
                                S_Name: team.Sports_Name,
                                role: team.role,
                                T_P: team.TotalPlayers,
                                p_L: playerList,
                                isReady: team.isReady,
                            };
                        })
                    )
                );
            }
        }

        // Handle "players" search
        if (type === "players") {
            query = search
                ? { "userInfo.Nickname": { $regex: search, $options: "i" } }
                : {};

            const players = await UserDetails.find(query).select("uuid userInfo");

            response = players.map((player) => ({
                userName: player.userInfo?.Nickname,
                userProfile: player.userInfo?.Profile_ImgURL,
                userId: player._id,
                userUuid: player.uuid,
            }));
        }

        // Generate appropriate message based on `type` and parameters
        let message = "";

        if (type === "players") {
            if (response.length) {
                message = search
                    ? `Players matching '${search}' found successfully.`
                    : "Players list fetched successfully.";
            } else {
                message = search
                    ? `No players matching '${search}' found.`
                    : "No players found.";
            }
        } else if (type === "myteam" || type === "team") {
            if (useTeamID) {
                message = response.length
                    ? `Team with ID '${useTeamID}' found successfully.`
                    : `No team found with ID '${useTeamID}'.`;
            } else if (search) {
                message = response.length
                    ? `Teams matching '${search}' found successfully.`
                    : `No teams matching '${search}' found.`;
            } else {
                message = response.length
                    ? "Teams list fetched successfully."
                    : "No teams found.";
            }
        }

        console.log("Search TeamList Pass");
        res.status(200).json({ status: true, message, response });
    } catch (error) {
        console.error("Search TeamList Route Error:", error.message);
        res.status(500).json({ status: false, message: "Search TeamList Route Error", error: error.message });
    }
};

export const searchPlayersTeam = async (req, res) => {
    const { uuid: userUuid } = req.user;
    let { search } = req.query;

    try {
        // Fetch the user details
        const user = await UserDetails.findOne({ uuid: userUuid }).select("uuid _id");
        if (!user) {
            return res.status(404).json({ status: false, message: "User is Not Found" });
        }

        // Convert search term to lowercase if it's provided
        search = search?.toLowerCase();

        // Build query based on search term
        const query = search ? { "userInfo.Nickname": { $regex: search, $options: "i" } } : {};

        // Fetch the players based on the query
        const players = await UserDetails.find(query).select("uuid userInfo");

        // Map players to the desired response format
        const response = players.map((player) => ({
            userName: player.userInfo?.Nickname,
            userProfile: player.userInfo?.Profile_ImgURL,
            userId: player._id,
            userUuid: player.uuid,
        }));

        // Generate the appropriate message based on search results
        let message = response.length
            ? search
                ? `Players matching '${search}' found successfully.`
                : "Players list fetched successfully."
            : search
                ? `No players matching '${search}' found.`
                : "No players found.";

        console.log("Search TeamList Pass");
        res.status(200).json({ status: true, message, response });
    } catch (error) {
        console.error("Search TeamList Route Error:", error.message);
        res.status(500).json({ status: false, message: "Search TeamList Route Error", error: error.message });
    }
};

export const dropdownTeam = async (req, res) => {
    const { uuid: userUuid } = req.user; // Current user's UUID
    let { search, type } = req.query;

    try {
        // Validate `type`
        if (type !== "myteam") {
            return res.status(400).json({ status: false, message: "Invalid type provided. Only 'myteam' is allowed." });
        }

        search = search?.toLowerCase(); // Normalize search input
        let query = { uuid: userUuid }; // Restrict to the current user's teams
        let response = [];

        // Add search conditions if `search` is provided
        if (search) {
            query.$or = [
                { "MyTeamBuild.Team_Name": { $regex: search, $options: "i" } },
                { "MyTeamBuild.Sports_Name": { $regex: search, $options: "i" } },
            ];
        }

        // Fetch user and their teams
        const userWithTeams = await UserDetails.findOne(query).select("MyTeamBuild");

        if (userWithTeams && userWithTeams.MyTeamBuild) {
            // Filter teams where the current user is the captain
            response = userWithTeams.MyTeamBuild.filter((team) => team.createdBy === userUuid).map((team) => ({
                T_id: team._id,
                T_Name: team.Team_Name,
            }));
        }

        const message = response.length
            ? "Dropdown list of My Teams fetched successfully."
            : "No teams found where the user is the captain.";

        console.log("Dropdown list of My Team Pass");
        res.status(200).json({ status: true, message, response });
    } catch (error) {
        console.error("Dropdown list of My Team Route Error:", error.message);
        res.status(500).json({ status: false, message: "Dropdown list of My Team Route Error", error: error.message });
    }
};

export const createEvent = async(req,res) => {
    const {id: userId, uuid: UserUuid} = req.user
    const {myTeamName, myTeam, loc, link, date, time} = req.body // 2024-12-30 10:00 AM/PM

    try {

        if ( !myTeam || !loc || !link || !date || !time) {
            return res.status(400).json({ status: false, message: "All fields are required." });
        }

        const user = await UserDetails.findById(userId);
        if (!user) {
            return res.status(200).json({ status: false, message: "User not found." });
        }
        if (user) {
            const team = user.MyTeamBuild.find((find) => find._id === myTeam && find.isReady === false);
            if (team) {
                return res.status(403).json({ status: false, message: "Team not ready: Check pending players and team status.",})}
        }

        const eventTime = moment(`${date} ${time}`, "YYYY-MM-DD hh:mm A").tz("Asia/Kolkata");
        if (!eventTime.isValid()) {
            return res.status(400).json({ status: false, message: "Invalid date or time format." });
        }

        const newEvent = new eventRequest({
            eventBy: { id: user._id , name: user?.userInfo?.Nickname},
            myTeamName: myTeamName,
            myTeam: myTeam,
            loc: loc,
            link: link,
            eventTime: eventTime.format("YYYY-MM-DD hh:mm A"),
        });

        newEvent.save();
        res.status(200).json({status: true, message: "createEvent Success ", newEvent})
        console.log("Create Event Pass")
    } catch (error) {
        console.log("Create Event Route")
        res.status(500).json({status: false, message: "Create Event Route", error: error.message})
    }
};

export const eventRequesting = async (req, res) => {
    const { id: userId, uuid: UserUuid } = req.user;
    const { status } = req.body;
    const { eventId, teamId, message } = req.query;

    try {
        // Validate required inputs
        if (!eventId || !teamId ) {
            return res.status(400).json({
                status: false,
                message: "Invalid input: eventId, teamId, and teamName are required",
            });
        }

        // Check if the team exists for the user
        const existingTeam = await UserDetails.findOne({
            _id: userId,
            MyTeamBuild: { $elemMatch: { _id: teamId} },
        }).select("userInfo MyTeamBuild");

        console.log(existingTeam)

        if (!existingTeam) {
            return res.status(404).json({
                status: false,
                message: "Login user's team not found. Please select your team.",
            });
        }

        // Find the event
        const event = await eventRequest.findById(eventId);
        if (!event) {
            return res.status(404).json({ status: false, message: "Event not found" });
        }

        // Check if the requesting team and the event owner team are the same
        if (event.myTeam.toString() === teamId) {
            return res.status(400).json({
                status: false,
                message: "Requesting team cannot be the same as the event owner team.",
            });
        }

        // Check if the team has already requested the event
        const existingRequestIndex = event.teamsRequested.findIndex(
            (req) => req.teamId.toString() === teamId
        );

        if (existingRequestIndex !== -1) {
            // Update the status if provided
            if (status) {
                event.teamsRequested[existingRequestIndex].status = status;
                await event.save();

                return res.status(200).json({
                    status: true,
                    message: "Team request status updated successfully.",
                    updatedRequest: event.teamsRequested[existingRequestIndex],
                });
            } else {
                return res.status(400).json({ status: false, message: "Team has already requested this event.", });
            }
        }

        // Add a new team request
        const newRequest = { teamName: existingTeam?.MyTeamBuild?.[0]?.T_Name, teamId, message };
        event.teamsRequested.push(newRequest);

        await event.save();

        console.log("Event request sent successfully.");
        res.status(200).json({ status: true, message: "Event request sent successfully.", newRequest, });
    } catch (error) {
        console.error("Error in eventRequesting:", error.message);
        res.status(500).json({ status: false, message: "An error occurred while processing the event request.", error: error.message, });
    }
};

export const viewEvent = async (req, res) => {
    const { id: userId, uuid: userUuid } = req.user;
    try {
        // Step 1: Fetch user details
        const user = await UserDetails.findById(userId).select("MyTeamBuild userInfo");
        if (!user) {
            return res.status(404).json({ status: false, message: "User Not Found" });
        }

        // Step 2: Fetch events for all teams in MyTeamBuild
        const events = await Promise.all(
            user.MyTeamBuild.map(async (team) => {
                const eventList = await eventRequest.find({
                    $or: [{ myTeam: team._id }, { selectedTeam: team._id }]
                }).sort({ createdAt: -1 });

                // Process each event
                return Promise.all(
                    eventList.map(async (event) => {
                        if(event.status === 'request'){

                        // Fetch myTeam details
                        const myTeam = await UserDetails.findOne(
                            { "MyTeamBuild._id": event.myTeam },
                            { "MyTeamBuild.$": 1 }
                        );

                        const myTeamDetails = myTeam?.MyTeamBuild[0];
                        const myTeamPlayers = await Promise.all(
                            myTeamDetails?.playersList.map(async (player) => {
                                const playerDetails = await UserDetails.findOne({ uuid: player.Player_id });
                                return {
                                    userId: playerDetails?._id,
                                    userProfile: playerDetails?.userInfo?.Profile_ImgURL,
                                    userName: playerDetails?.userInfo?.Nickname,
                                    playerUuid: player.Player_id,
                                    position: player.Position,
                                    status: player.status,
                                    role: player.Player_id === myTeamDetails?.createdBy ? "captain" : "player"
                                };
                            }) || []
                        );

                        // Determine currentPlayerRole for the logged-in user
                        const currentPlayerRole = myTeamDetails?.createdBy === userUuid
                            ? "captain"
                            : myTeamPlayers.some(player => player.playerUuid === userUuid)
                            ? "player"
                            : null;

                        // Construct event response
                        return {
                            eventId: event._id,
                            eventByID: event.eventBy.id,
                            eventByname: event.eventBy.name,
                            eventloc: event.loc,
                            eventlink:event.link,
                            status: event.status,
                            eventTime: event.eventTime,
                            currentPlayerRole
                        };
                        }
                    })
                );
            })
        );

        // Flatten the array of events
        const flatEvents = events.flat();

        console.log("View Event Pass");
        res.status(200).json({ status: true, message: "View Events", events: flatEvents });

    } catch (error) {
        console.error("View Event Route Error:", error.message);
        res.status(500).json({ status: false, message: "View Event Route", error: error.message });
    }
};

export const myteamEvent = async (req, res) => {
    const { id: userId, uuid: userUuid } = req.user;
    const { eventID } = req.query;

    try {
        // Fetch user details
        const user = await UserDetails.findById(userId).select("MyTeamBuild userInfo");
        if (!user) {
            return res.status(404).json({ status: false, message: "User not found." });
        }

        // Fetch the event by ID
        const event = await eventRequest.findById(eventID);
        if (!event) {
            return res.status(404).json({ status: false, message: "myteamEvent not found." });
        }

        // Check if the event status is 'request'
        if (event.status !== "request") {
            return res.status(400).json({ status: false, message: "myteamEvent is not in 'request' status." });
        }

        // Fetch the user's team details
        const myTeam = await UserDetails.findOne(
            { "MyTeamBuild._id": event.myTeam },
            { "MyTeamBuild.$": 1 }
        );

        if (!myTeam) {
            return res.status(404).json({ status: false, message: "Team not found." });
        }

        const myTeamDetails = myTeam.MyTeamBuild[0];

        // Fetch player details for the team
        const myTeamPlayers = await Promise.all(
            (myTeamDetails?.playersList || []).map(async (player) => {
                const playerDetails = await UserDetails.findOne({ uuid: player.Player_id });
                return {
                    userId: playerDetails?._id,
                    userProfile: playerDetails?.userInfo?.Profile_ImgURL,
                    userName: playerDetails?.userInfo?.Nickname,
                    playerUuid: player.Player_id,
                    position: player.Position,
                    status: player.status,
                    role: player.Player_id === myTeamDetails?.createdBy ? "captain" : "player",
                };
            })
        );

        // Determine the role of the logged-in user within the team
        const currentPlayerRole = myTeamDetails?.createdBy === userUuid
            ? "captain"
            : myTeamPlayers.some((player) => player.playerUuid === userUuid)
            ? "player"
            : null;

        // Construct response
        const response = {
            eventId: event._id,
            role: currentPlayerRole,
            myTeam: {
                teamId: myTeamDetails._id,
                createTeam: myTeamDetails.createdBy,
                teamName: myTeamDetails.Team_Name,
                sportsName: myTeamDetails.Sports_Name,
                totalPlayers: myTeamDetails.TotalPlayers,
                isReady: myTeamDetails.isReady,
                players: myTeamPlayers,
            },
            teamsRequested: event.teamsRequested
        };

        console.log("View myTeam Event Pass");
        return res.status(200).json({ status: true, message: "myTeam Event", event: response });
    } catch (error) {
        console.error("View myTeam Event Route Error:", error.message);
        return res.status(500).json({
            status: false,
            message: "View myTeam Event Route Error",
            error: error.message,
        });
    }
};

export const myteamReqEvent = async (req, res) => {
    const { id: userId, uuid: userUuid } = req.user;
    const { eventID } = req.query;
    try {
        // Fetch user details
        const user = await UserDetails.findById(userId).select("MyTeamBuild userInfo");
        if (!user) {
            return res.status(404).json({ status: false, message: "User not found." });
        }

        // Fetch the event by ID
        const event = await eventRequest.findById(eventID);
        if (!event) {
            return res.status(404).json({ status: false, message: "myTeamReq Event not found." });
        }

        // Check if the event status is 'request'
        if (event.status !== "request") {
            return res.status(400).json({ status: false, message: "myTeamReq Event is not in 'request' status." });
        }

        // Fetch the user's team details
        const myTeam = await UserDetails.findOne(
            { "MyTeamBuild._id": event.myTeam },
            { "MyTeamBuild.$": 1 }
        );

        if (!myTeam) {
            return res.status(404).json({ status: false, message: "Team not found." });
        }

        const myTeamDetails = myTeam.MyTeamBuild[0];

        // Fetch player details for the team
        const myTeamPlayers = await Promise.all(
            (myTeamDetails?.playersList || []).map(async (player) => {
                const playerDetails = await UserDetails.findOne({ uuid: player.Player_id });
                return {
                    userId: playerDetails?._id,
                    userProfile: playerDetails?.userInfo?.Profile_ImgURL,
                    userName: playerDetails?.userInfo?.Nickname,
                    playerUuid: player.Player_id,
                    position: player.Position,
                    status: player.status,
                    role: player.Player_id === myTeamDetails?.createdBy ? "captain" : "player",
                };
            })
        );

        // Determine the role of the logged-in user within the team
        const currentPlayerRole = myTeamDetails?.createdBy === userUuid
            ? "captain"
            : myTeamPlayers.some((player) => player.playerUuid === userUuid)
            ? "player"
            : null;

        // Construct response
        const response = {
            eventId: event._id,
            role: currentPlayerRole,
            teamsRequested: event.teamsRequested
        };

        console.log("View myTeamReq Event Pass");
        return res.status(200).json({ status: true, message: "View myTeamReq Event", event: response });
    } catch (error) {
        console.error("View myTeamReq Event Route Error:", error.message);
        return res.status(500).json({
            status: false,
            message: "View myTeamReq Event Route Error",
            error: error.message,
        });
    }
};


export const eventApproved = async (req, res) => {
    const { id: userId, uuid: UserUuid } = req.user;
    let { eventId, teamName, teamId, status } = req.query;

    try {
        // Find the user
        const user = await UserDetails.findById(userId).select("MyTeamBuild");
        if (!user) {
            return res.status(404).json({ status: false, message: "No user found with the provided credentials." });
        }

        if (user) {
            user.MyTeamBuild.forEach((team) => {
                if (team && team._id.toString() === teamId) {
                    return res.status(403).json({
                        status: false,
                        message: "The selected team ID matches one of your own teams. Please choose a different team for the request.",
                    });
                }
            });
        }

        // Find the event by ID
        const event = await eventRequest.findById(eventId);
        if (!event) {
            return res.status(404).json({ status: false, message: "The specified event could not be located. Please check the event ID and try again." });
        }

        if (event.status === 'request') {
            // Get the current date and event date
            const current = moment().tz("Asia/Kolkata");
            const eventDate = moment(event.eventTime, "YYYY-MM-DD hh:mm A").tz("Asia/Kolkata");

            // Check if the event has expired
            if (eventDate.isBefore(current)) {
                return res.status(200).json({
                    status: false,
                    message: "This event has already expired and is no longer valid for requests.",
                    event,
                });
            }

            // Handle "withdrawn" or "waiting" status
            if (status === "withdrawn") {
                event.status = status;
                return res.status(200).json({
                    status: true,
                    message: "The event has been successfully withdrawn.",
                });
            }

            // Handle "approved" status
            if (status === "approved") {
                // Set the selected team
                event.selectedTeam = teamId;
                event.selectedTeamName = teamName;
                event.status = status;

                // Set all teams' status to rejected except the accepted one
                event.teamsRequested = event.teamsRequested.map((teamRequest) => {
                    teamRequest.status = teamRequest.teamId.toString() === teamId ? "true" : "false";
                    return teamRequest;
                });

                // Save the event
                await event.save();

                return res.status(200).json({
                    status: true,
                    message: "The event was successfully updated, and the team has been selected.",
                    event,
                });
            }
        }

        if (event.status === 'approved') {
            return res.status(403).json({
                status: true,
                message: "This event has already found its opponent, and both teams are ready to proceed with the match.",
            });
        }

        if (event.status === 'withdrawn') {
            return res.status(403).json({
                status: true,
                message: "The event has been successfully withdrawn.",
            });
        }

        return res.status(400).json({
            status: false,
            message: "The provided status is invalid. Please use an accepted status value and try again.",
        });

    } catch (error) {
        console.error("Event Status Route Error:", error.message);
        res.status(500).json({
            status: false,
            message: "An error occurred while processing the event status update.",
            error: error.message,
        });
    }
};


export const allEvents = async (req, res) => {
    const { id: userId, uuid: userUuid } = req.user;

    try {
        // Step 1: Fetch user details
        const user = await UserDetails.findById(userId).select("MyTeamBuild userInfo");
        if (!user) {
            return res.status(404).json({ status: false, message: "User Not Found" });
        }

        // Step 2: Fetch events for all teams in MyTeamBuild
        const events = await Promise.all(
            user.MyTeamBuild.map(async (team) => {
                const eventList = await eventRequest.find({
                    $nor: [{ myTeam: team._id }, { selectedTeam: team._id }]
                }).sort({ createdAt: -1 });

                // Process each event
                return Promise.all(
                    eventList.map(async (event) => {
                        if(event.status === 'request'){

                        // Fetch myTeam details
                        const myTeam = await UserDetails.findOne(
                            { "MyTeamBuild._id": event.myTeam },
                            { "MyTeamBuild.$": 1 }
                        );

                        const myTeamDetails = myTeam?.MyTeamBuild[0];
                        const myTeamPlayers = await Promise.all(
                            myTeamDetails?.playersList.map(async (player) => {
                                const playerDetails = await UserDetails.findOne({ uuid: player.Player_id });
                                return {
                                    userId: playerDetails?._id,
                                    userProfile: playerDetails?.userInfo?.Profile_ImgURL,
                                    userName: playerDetails?.userInfo?.Nickname,
                                    playerUuid: player.Player_id,
                                    position: player.Position,
                                    status: player.status,
                                    role: player.Player_id === myTeamDetails?.createdBy ? "captain" : "player"
                                };
                            }) || []
                        );

                        // Determine currentPlayerRole for the logged-in user
                        const currentPlayerRole = myTeamDetails?.createdBy === userUuid
                            ? "captain"
                            : myTeamPlayers.some(player => player.playerUuid === userUuid)
                            ? "player"
                            : null;

                        // Fetch opponent team details if teamsRequested are the same
                        let opponentTeamDetails = null;
                        if (event.myTeam.toString() !== event.selectedTeam) {
                            const opponentTeam = await UserDetails.findOne(
                                { "MyTeamBuild._id": event.selectedTeam },
                                { "MyTeamBuild.$": 1 }
                            );
                            const opponentTeamPlayers = await Promise.all(
                                opponentTeam?.MyTeamBuild[0]?.playersList.map(async (player) => {
                                    const playerDetails = await UserDetails.findOne({ uuid: player.Player_id });
                                    return {
                                        userId: playerDetails?._id,
                                        userProfile: playerDetails?.userInfo?.Profile_ImgURL,
                                        userName: playerDetails?.userInfo?.Nickname,
                                        playerUuid: player.Player_id,
                                        position: player.Position,
                                        status: player.status
                                    };
                                }) || []
                            );
                            opponentTeamDetails = {
                                teamId: opponentTeam?._id,
                                createTeam: opponentTeam?.createdBy,
                                teamName: opponentTeam?.MyTeamBuild[0]?.Team_Name,
                                sportsName: opponentTeam?.Sports_Name,
                                totalPlayers: opponentTeam?.TotalPlayers,
                                isReady: opponentTeam?.isReady,
                                players: opponentTeamPlayers
                            };
                        }

                        // Construct event response
                        return {
                            eventId: event._id,
                            eventByID: event.eventBy.id,
                            eventByname: event.eventBy.name,
                            eventTeam: myTeamDetails?.TotalPlayers,
                            teamsRequested:event.teamsRequested,
                            opponentTeam: opponentTeamDetails.totalPlayers,
                            status: event.status,
                            eventTime: event.eventTime,
                            currentPlayerRole
                        };
                        }
                    })
                );
            })
        );

        // Flatten the array of events
        const flatEvents = events.flat();

        console.log("View Event Pass");
        res.status(200).json({ status: true, message: "List of Others Events", events: flatEvents });

    } catch (error) {
        console.error("View Event Route Error:", error.message);
        res.status(500).json({ status: false, message: "View Event Route", error: error.message });
    }
};

export const currentEvent = async (req, res) => {
    const { id: userId, uuid: userUuid } = req.user;

    try {
        // Step 1: Fetch user details
        const user = await UserDetails.findById(userId).select("MyTeamBuild userInfo");
        if (!user) {
            return res.status(404).json({ status: false, message: "User Not Found" });
        }

        // Step 2: Store events for all teams
        let store = [];
        await Promise.all(
            user.MyTeamBuild.map(async (team) => {
                const eventList = await eventRequest.find({
                    $or: [{ myTeam: team._id }, { selectedTeam: team._id }]
                }).sort({ createdAt: -1 });

                // Filter only approved events
                const approvedEvents = eventList.filter(event => event.status === "approved");
                if (approvedEvents.length > 0) {
                    store.push(...approvedEvents);
                }
            })
        );

        // Step 3: Process each event
        const result = [];
        await Promise.all(store.map(async (event) => {
            const teamA = await UserDetails.findOne({ "MyTeamBuild._id": event.myTeam }, { "MyTeamBuild.$": 1 });
            const teamB = await UserDetails.findOne({ "MyTeamBuild._id": event.selectedTeam }, { "MyTeamBuild.$": 1 });

            // Fetch details of `teamA` (myTeam)
            const myTeamDetails = teamA?.MyTeamBuild[0];
            const myTeamPlayers = await Promise.all(
                (myTeamDetails?.playersList || []).map(async (player) => {
                    const playerDetails = await UserDetails.findOne({ uuid: player.Player_id });
                    return {
                        userId: playerDetails?._id,
                        userProfile: playerDetails?.userInfo?.Profile_ImgURL,
                        userName: playerDetails?.userInfo?.Nickname,
                        playerUuid: player.Player_id,
                        position: player.Position,
                        status: player.status,
                        role: player.Player_id === myTeamDetails?.createdBy ? "captain" : "player"
                    };
                })
            );

            // Fetch details of `teamB` (opponentTeam)
            const opponentTeamDetails = teamB?.MyTeamBuild[0];
            const opponentTeamPlayers = await Promise.all(
                (opponentTeamDetails?.playersList || []).map(async (player) => {
                    const playerDetails = await UserDetails.findOne({ uuid: player.Player_id });
                    return {
                        userId: playerDetails?._id,
                        userProfile: playerDetails?.userInfo?.Profile_ImgURL,
                        userName: playerDetails?.userInfo?.Nickname,
                        playerUuid: player.Player_id,
                        position: player.Position,
                        status: player.status
                    };
                })
            );

            // Determine currentPlayerRole
            const currentPlayerRole =
                myTeamDetails?.createdBy === userUuid || opponentTeamDetails?.createdBy === userUuid
                    ? "captain"
                    : myTeamPlayers.some(player => player.playerUuid === userUuid) ||
                      opponentTeamPlayers.some(player => player.playerUuid === userUuid)
                    ? "player"
                    : null;

            // Construct event response
            result.push({
                eventId: event._id,
                eventByID: event.eventBy.id,
                eventByName: event.eventBy.name,
                eventTeam: myTeamDetails?.TotalPlayers,
                teamsRequested: event.teamsRequested,
                opponentTeam: opponentTeamDetails ? opponentTeamDetails?.TotalPlayers : null,
                status: event.status,
                eventTime: event.eventTime,
                currentPlayerRole
            });
        }));

        console.log("Current Event Pass");
        res.status(200).json({ status: true, message: "Current Events", events: result });

    } catch (error) {
        console.error("Current Event Route Error:", error.message);
        res.status(500).json({ status: false, message: "Current Event Route", error: error.message });
    }
};


export const currentEventDetails = async (req, res) => {
    const { id: userId, uuid: userUuid } = req.user;

    try {
        // Step 1: Fetch user details
        const user = await UserDetails.findById(userId).select("MyTeamBuild userInfo");
        if (!user) {
            return res.status(404).json({ status: false, message: "User Not Found" });
        }

        // Step 2: Store events for all teams
        let store = [];
        await Promise.all(
            user.MyTeamBuild.map(async (team) => {
                const eventList = await eventRequest.find({
                    $or: [{ myTeam: team._id }, { selectedTeam: team._id }]
                }).sort({ createdAt: -1 });

                // Filter only approved events
                const approvedEvents = eventList.filter(event => event.status === "approved");
                if (approvedEvents.length > 0) {
                    store.push(...approvedEvents);
                }
            })
        );

        // Step 3: Process each event
        const result = [];
        await Promise.all(store.map(async (event) => {
            const teamA = await UserDetails.findOne({ "MyTeamBuild._id": event.myTeam }, { "MyTeamBuild.$": 1 });
            const teamB = await UserDetails.findOne({ "MyTeamBuild._id": event.selectedTeam }, { "MyTeamBuild.$": 1 });

            // Fetch details of `teamA` (myTeam)
            const myTeamDetails = teamA?.MyTeamBuild[0];
            const myTeamPlayers = await Promise.all(
                (myTeamDetails?.playersList || []).map(async (player) => {
                    const playerDetails = await UserDetails.findOne({ uuid: player.Player_id });
                    return {
                        userId: playerDetails?._id,
                        userProfile: playerDetails?.userInfo?.Profile_ImgURL,
                        userName: playerDetails?.userInfo?.Nickname,
                        playerUuid: player.Player_id,
                        position: player.Position,
                        status: player.status,
                        role: player.Player_id === myTeamDetails?.createdBy ? "captain" : "player"
                    };
                })
            );

            // Fetch details of `teamB` (opponentTeam)
            const opponentTeamDetails = teamB?.MyTeamBuild[0];
            const opponentTeamPlayers = await Promise.all(
                (opponentTeamDetails?.playersList || []).map(async (player) => {
                    const playerDetails = await UserDetails.findOne({ uuid: player.Player_id });
                    return {
                        userId: playerDetails?._id,
                        userProfile: playerDetails?.userInfo?.Profile_ImgURL,
                        userName: playerDetails?.userInfo?.Nickname,
                        playerUuid: player.Player_id,
                        position: player.Position,
                        status: player.status
                    };
                })
            );

            // Determine currentPlayerRole
            const currentPlayerRole =
                myTeamDetails?.createdBy === userUuid || opponentTeamDetails?.createdBy === userUuid
                    ? "captain"
                    : myTeamPlayers.some(player => player.playerUuid === userUuid) ||
                      opponentTeamPlayers.some(player => player.playerUuid === userUuid)
                    ? "player"
                    : null;

            // Construct event response
            result.push({
                eventId: event._id,
                eventByID: event.eventBy.id,
                eventByName: event.eventBy.name,
                eventTeam: {
                    teamId: myTeamDetails?._id,
                    createTeam: myTeamDetails?.createdBy,
                    teamName: myTeamDetails?.Team_Name,
                    sportsName: myTeamDetails?.Sports_Name,
                    totalPlayers: myTeamDetails?.TotalPlayers,
                    isReady: myTeamDetails?.isReady,
                    players: myTeamPlayers
                },
                teamsRequested: event.teamsRequested,
                opponentTeam: opponentTeamDetails
                    ? {
                          teamId: opponentTeamDetails?._id,
                          createTeam: opponentTeamDetails?.createdBy,
                          teamName: opponentTeamDetails?.Team_Name,
                          sportsName: opponentTeamDetails?.Sports_Name,
                          totalPlayers: opponentTeamDetails?.TotalPlayers,
                          isReady: opponentTeamDetails?.isReady,
                          players: opponentTeamPlayers
                      }
                    : null,
                status: event.status,
                eventTime: event.eventTime,
                currentPlayerRole
            });
        }));

        console.log("Current Event Pass");
        res.status(200).json({ status: true, message: "Current Events", events: result });

    } catch (error) {
        console.error("Current Event Route Error:", error.message);
        res.status(500).json({ status: false, message: "Current Event Route", error: error.message });
    }
};


export const cancelEvent = async (req, res) => {
    const { id: userId, uuid: userUuid } = req.user;
    const { eventId, status } = req.query;

    try {
        // Step 1: Fetch user details
        const user = await UserDetails.findById(userId).select("MyTeamBuild userInfo");
        if (!user) {
            return res.status(404).json({ status: false, message: "User Not Found" });
        }

        // Step 2: Fetch the event to be canceled
        const event = await eventRequest.findById(eventId);
        if (!event) {
            return res.status(404).json({ status: false, message: "Event Not Found" });
        }

        // Step 3: Check if the user is authorized to withdraw the event
        const myTeam = await UserDetails.findOne({ "MyTeamBuild._id": event.myTeam }, { "MyTeamBuild.$": 1 });
        const opponentTeam = await UserDetails.findOne({ "MyTeamBuild._id": event.selectedTeam }, { "MyTeamBuild.$": 1 });

        const myTeamDetails = myTeam?.MyTeamBuild[0];
        const opponentTeamDetails = opponentTeam?.MyTeamBuild[0];

        // Determine the user's role
        const currentPlayerRole =
            myTeamDetails?.createdBy === userUuid || opponentTeamDetails?.createdBy === userUuid
                ? "captain"
                : null;

        if (status === "withdrawn" && currentPlayerRole === "captain") {
            // Update event status to "withdrawn"
            event.status = "withdrawn";
            await event.save();

            return res.status(200).json({ status: true, message: "Event has been successfully withdrawn" });
        }

        res.status(403).json({
            status: false,
            message: "Unauthorized to withdraw the event or invalid status provided"
        });

    } catch (error) {
        console.error("Cancel Event Route Error:", error.message);
        res.status(500).json({ status: false, message: "Cancel Event Route Error", error: error.message });
    }
};

