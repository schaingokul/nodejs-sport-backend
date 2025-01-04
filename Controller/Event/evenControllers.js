import UserDetails from "../../Model/UserModelDetails.js" // UserDetails
import eventRequest from '../../Model/eventRequestModel.js' //eventList
import moment from "moment-timezone";

const getFormattedDateTime = () => moment().tz("Asia/Kolkata").format("YYYY-MM-DD hh:mm A");

export const searchTeam = async (req, res) => {
    const { uuid: userUuid } = req.user;
    let { search, type, reqTeam } = req.query;

    try {
        // Validate `type`
        if (!["team", "players", "myteam"].includes(type)) {
            return res.status(400).json({ status: false, message: "Invalid type provided." });
        }

        search = search?.toLowerCase(); // Normalize search input
        let query = {};
        let usersWithMatchingTeams = [];
        let response = [];

        if (type === "myteam" || type === "team") {
            if (search) {
                query = { "MyTeamBuild.Team_Name": { $regex: search, $options: "i" } };
            }

            if (type === "myteam") {
                query.uuid = userUuid; // Restrict query to current user for "myteam"
            }

            // If `reqTeam` is provided, search by team ID
            if (reqTeam) {
                query = { "MyTeamBuild._id": reqTeam };
            }

            usersWithMatchingTeams = await UserDetails.find(query).select({
                uuid: 1,
                userInfo: 1,
                MyTeamBuild: { $elemMatch: { role: "captain" } },
            });

            response = usersWithMatchingTeams
                .map((user) =>
                    user.MyTeamBuild?.map((team) => ({
                        Name: user.userInfo?.Nickname,
                        T_id: team._id,
                        T_Name: team.Team_Name,
                        S_Name: team.Sports_Name,
                        T_P: team.TotalPlayers,
                        p_L: team.playersList,
                        isReady: team.isReady,
                    }))
                )
                .flat();
        }

        if (type === "players") {
            query = search
                ? { "userInfo.Nickname": { $regex: search, $options: "i" } }
                : {};

            usersWithMatchingTeams = await UserDetails.find(query).select("uuid userInfo");

            response = usersWithMatchingTeams.map((user) => ({
                Name: user.userInfo?.Nickname,
                uniqueId: user.uuid,
                URL: user.userInfo?.Profile_ImgURL,
            }));
        }

        // Generate response message
        const message = response.length
            ? `Successfully fetched ${type === "players" ? "players" : "teams"}${
                  search ? " matching your search" : ""
              }!`
            : `No ${type === "players" ? "players" : "teams"} found${search ? " matching your search" : ""}.`;

        console.log("Search TeamList Pass");
        res.status(200).json({ status: true, message, response });
    } catch (error) {
        console.error("Search TeamList Route Error:", error.message);
        res.status(500).json({ status: false, message: "Search TeamList Route Error", error: error.message });
    }
};

export const createEvent = async(req,res) => {
    const {id: userId, uuid: UserUuid} = req.user
    const {eventName, reqTeam, loc, link, date, time} = req.body // 2024-12-30 10:00 AM/PM

    try {

        if (!eventName || !reqTeam || !loc || !link || !date || !time) {
            return res.status(400).json({ status: false, message: "All fields are required." });
        }

        const user = await UserDetails.findById(userId);
        if (!user) {
            return res.status(200).json({ status: false, message: "User not found." });
        }
        if (user) {
            const team = user.MyTeamBuild.find((find) => find._id === reqTeam && find.isReady === false);
            if (team) {
                return res.status(403).json({ status: false, message: "Team not ready: Check pending players and team status.",})}
        }

        const eventTime = moment(`${date} ${time}`, "YYYY-MM-DD hh:mm A").tz("Asia/Kolkata");
        if (!eventTime.isValid()) {
            return res.status(400).json({ status: false, message: "Invalid date or time format." });
        }

        const newEvent = new eventRequest({
            eventName: eventName,
            eventBy: { id: user._id , name: user?.userInfo?.Nickname},
            reqTeam: reqTeam,
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
    const { eventId, teamId } = req.query;

    try {
        // Check if the team exists for the user
        const existingTeam = await UserDetails.findOne({
            _id: userId,
            MyTeamBuild: { $elemMatch: { _id: teamId } },
        });

        if (!existingTeam) {
            return res.status(404).json({ status: false, message: "Team is not found" });
        }

        // Find the event
        const event = await eventRequest.findById(eventId);
        if (!event) {
            return res.status(404).json({ status: false, message: "Event not found" });
        }

        // Check if the requesting team and the event owner team are the same
        if (event.reqTeam.toString() === teamId) {
            return res.status(400).json({ status: false, message: "Requesting team cannot be the same as the event owner team", });
        }

        // Check if the team has already requested
        const existingRequest = event.teamsRequested.find(
            (req) => req.teamId.toString() === teamId
        );

        if (existingRequest) {
            // Update the status if provided
            if (status) {
                existingRequest.status = status;
                await event.save();
                return res.status(200).json({ status: true, message: "Team request status updated successfully", });
            } else {
                return res.status(400).json({ status: false, message: "Team has already requested this event", });
            }
        }

        // Add a new team request
        event.teamsRequested.push({ teamId, status: status || "waiting" });
        await event.save();

        console.log("Event request sent successfully");
        res.status(200).json({ status: true,message: "Event request sent successfully", });
    } catch (error) {
        console.error("Error in eventRequesting:", error.message);
        res.status(500).json({status: false, message: "An error occurred while processing the event request",error: error.message, });
    }
};


export const viewEvent = async (req, res) => {
    const { id: userId, uuid: UserUuid } = req.user;
    let { eventID } = req.query;

    try {
        // Step 1: Fetch user details
        const user = await UserDetails.findById(userId);
        if (!user) {
            return res.status(404).json({ status: false, message: "User Not Found" });
        }

        // Step 2: Handle event request based on eventID query parameter
        if (eventID) {
            const event = await eventRequest.findById(eventID.toString());

            if (!event) {
                return res.status(404).json({ status: false, message: "Event is Not Found" });
            }

            return res.status(200).json({ status: true, message: "Event Found", event });
        }

        // Step 3: If no eventID is provided, return all events
        const events = await eventRequest.find({}).sort({ createdAt: -1 });

        console.log("View Event Pass");
        res.status(200).json({ status: true, message: "View Events", events });

    } catch (error) {
        console.error("View Event Route Error:", error.message);
        res.status(500).json({ status: false, message: "View Event Route", error: error.message });
    }
};


export const eventApproved = async(req, res) => {
    const { id: userId, uuid: UserUuid } = req.user;
    const { teamId, status } = req.body;
    let { eventID } = req.query;

    try {
        // Find the user
        const user = await UserDetails.findById(userId);
        if (!user) {
            return res.status(404).json({ status: false, message: "User Not Found" });
        }

        // Find the event by ID
        const event = await eventRequest.findById(eventID);
        if (!event) {
            return res.status(404).json({ status: false, message: "Event Not Found" });
        }

        // Get the current date and event date
        const current = moment().tz("Asia/Kolkata");
        const eventDate = moment(event.eventTime, "YYYY-MM-DD hh:mm A").tz("Asia/Kolkata");

        // Check if the event has expired
        if (eventDate.isBefore(current)) {
            return res.status(200).json({ status: false, message: "Event has expired", event });
        }

        // Handle "rejected" or "waiting" status
        if (status !== "approved") {
            // Remove the selected team
            event.selectedTeam = null;

            // Set all teams' status in `teamsRequested` to "rejected" except the selected one
            event.teamsRequested = event.teamsRequested.map((teamRequest) => {
                if (teamRequest.teamId.toString() === teamId) {
                    teamRequest.status = status; // Set the specific team as rejected
                }
                return teamRequest;
            });

            // Save the event
            await event.save();

            return res.status(200).json({
                status: true,
                message: "Event status updated and teams rejected.",
                event,
            });
        }

        // Handle other statuses (accepted)
        if (status === "approved") {
            // Set the selected team
            event.selectedTeam = teamId;
            event.status = status;

            // Set all teams' status to rejected except the accepted one
            event.teamsRequested = event.teamsRequested.map((teamRequest) => {
                if (teamRequest.teamId.toString() === teamId) {
                    teamRequest.status = "selected";
                } else {
                    teamRequest.status = "declined";
                }
                return teamRequest;
            });

            // Save the event
            await event.save();

            return res.status(200).json({
                status: true,
                message: "Event updated successfully. Team selected.",
                event,
            });
        }

        return res.status(400).json({ status: false, message: "Invalid status." });
        
    } catch (error) {
        console.error("Event Status Route Error:", error.message);
        res.status(500).json({ status: false, message: "Event Status Route Error", error: error.message, });
    }
};


export const specificEvent = async (req, res) => {
    const { id: userId, uuid: UserUuid } = req.user;
    let { eventID } = req.query;

    try {
        // Step 1: Fetch user details
        const user = await UserDetails.findById(userId);
        if (!user) {
            return res.status(404).json({ status: false, message: "User Not Found" });
        }

        // Step 2: Handle event request based on eventID query parameter
        if (eventID) {
            const event = await eventRequest.findById(eventID.toString());

            if (!event) {
                return res.status(404).json({ status: false, message: "Event is Not Found" });
            }
            const response = {
                EventBy:{
                    id:event.eventBy.id,
                    userName:event.eventBy.name,
                },
                EID: event._id,
                EName: event.eventName,
                ETime:event.eventTime,
                TReq: (event.teamsRequested.length > 0) ? event.teamsRequested.length : "0",
                TeamA: event.reqTeam,
                TeamB: event.selectedTeam,
                status:event.status
            }
            return res.status(200).json({ status: true, message: "Specific Event Found", response });
        }

        // Step 3: If no eventID is provided, return all events
        const events = await eventRequest.find({}).sort({ createdAt: -1 });
        const eventDetails = events.map((event) => {
            return {
                EventBy: {
                    id: event.eventBy.id,
                    userName: event.eventBy.name,
                },
                EID: event._id,
                EName: event.eventName,
                ETime: event.eventTime,
                TReq: (event.teamsRequested.length > 0) ? event.teamsRequested.length : "0",
                TeamA: event.reqTeam,
                TeamB: event.selectedTeam,
                status: event.status,
            };
        });
         
        console.log("specific Events Pass");
        res.status(200).json({ status: true, message: "All Events fetched", eventDetails });

    } catch (error) {
        console.error("specific Event Route Error:", error.message);
        res.status(500).json({ status: false, message: "specific Event Route", error: error.message });
    }
};

