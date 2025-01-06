import express from 'express';
import protectRoute from '../middleware/ProtectRoute.js';
import { buildTeam, DeleteTeam, UpdateTeam, MyTeams ,updatePlayerStatus } from '../Controller/TeamController.js';
import {searchTeam, createEvent, viewEvent , eventApproved , eventRequesting , allEvents , currentEvent, cancelEvent, dropdownTeam , myteamEvent ,myteamReqEvent ,searchPlayersTeam} from '../Controller/Event/evenControllers.js';


const router = express.Router();

router.get("/", protectRoute, MyTeams); // View Team as player or captain
router.post("/", protectRoute, buildTeam); // Create Team
router.delete("/:teamId", protectRoute, DeleteTeam); // Delete Team
router.put("/:teamIdToFind", protectRoute, UpdateTeam); // Update Team
router.put("/status/:teamIdToFind", protectRoute, updatePlayerStatus); // Player Status


router.get("/teams" , protectRoute, searchTeam);
router.get("/players" , protectRoute, searchPlayersTeam);
router.get("/drop" , protectRoute, dropdownTeam);
router.post("/event", protectRoute, createEvent);
router.get("/event" , protectRoute , viewEvent);
router.get("/event/myteam" , protectRoute , myteamEvent);
router.get("/event/myteam/req" , protectRoute , myteamReqEvent);
router.post("/req" , protectRoute , eventRequesting);
router.post("/status" , protectRoute , eventApproved);
router.get("/allevents" , protectRoute , allEvents);


router.get("/currentevent" , protectRoute , currentEvent);
router.post("/cancelevent" , protectRoute , cancelEvent);


export default router

/*

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
                            myTeam: {
                                teamId: myTeamDetails?._id,
                                createTeam: myTeamDetails?.createdBy,
                                teamName: myTeamDetails?.Team_Name,
                                sportsName: myTeamDetails?.Sports_Name,
                                totalPlayers: myTeamDetails?.TotalPlayers,
                                isReady: myTeamDetails?.isReady,
                                players: myTeamPlayers
                            },
                            teamsRequested: event.teamsRequested,
                            opponentTeam: opponentTeamDetails,
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



*/