import UserDetails from "../../Model/UserModelDetails.js" // UserDetails
import EventRequest from '../../Model/eventRequestModel.js' //eventList
import moment from "moment-timezone";

const getFormattedDateTime = () => moment().tz("Asia/Kolkata").format("YYYY-MM-DD hh:mm A");


export const searchTeam = async (req, res) => {
    const { uuid: userUuid } = req.user
    let { search, type } = req.query;
        
    try {
        // Validate and normalize `search` and `type`
        search = search?.toLowerCase();

        if (!["team", "players", "myteam"].includes(type)) {
            return res.status(400).json({ status: false, message: "Invalid type provided." });
        }

        let usersWithMatchingTeams = [];
        let response = [];

        // Handle "team" type
        if (type === "myteam") {
            if (search) {
                // Search with userUuid
                let query = { "MyTeamBuild.Team_Name": { $regex: search, $options: "i" } };
                query.uuid = userUuid;
                usersWithMatchingTeams = await UserDetails.find(query).select({ uuid : 1, userInfo: 1, MyTeamBuild: { $elemMatch: { role: "captain" } } });
            } else {
                // Fetch all users or specific user's teams
                const query = { uuid: userUuid }; 
                usersWithMatchingTeams = await UserDetails.find(query).select({ uuid : 1,  userInfo: 1, MyTeamBuild: { $elemMatch: { role: "captain" } } });
            }
    
            // Format response to include only admin teams
            response = usersWithMatchingTeams
                .map((user) =>
                    user.MyTeamBuild
                        .map((team) => ({
                            Name: user.userInfo.Nickname,
                            T_id: team._id,
                            T_Name: team.Team_Name,
                            Sp_Name: team.Sports_Name,
                        }))
                )
                .flat();  // Flatten the array of arrays
        }

        // Handle "team" type
        if (type === "team") {
            if (search) {
                const query = { "MyTeamBuild.Team_Name": { $regex: search, $options: "i" } };
                usersWithMatchingTeams = await UserDetails.find(query).select({ uuid : 1, userInfo: 1, MyTeamBuild: { $elemMatch: { role: "captain" } } });
            } else {
                usersWithMatchingTeams = await UserDetails.find({}).select({ uuid : 1,  userInfo: 1, MyTeamBuild: { $elemMatch: { role: "captain" } } });
            }
            // Format response to include only admin teams
            response = usersWithMatchingTeams
                .map((user) =>
                    user.MyTeamBuild
                        .map((team) => ({
                            Name: user.userInfo.Nickname,
                            T_id: team._id,
                            T_Name: team.Team_Name,
                            Sp_Name: team.Sports_Name,
                        }))
                )
                .flat();  // Flatten the array of arrays
        }

        // Handle "players" type
        if (type === "players") {
            const query = search
                ? { "userInfo.Nickname": { $regex: search, $options: "i" } }
                : {};

            usersWithMatchingTeams = await UserDetails.find(query).select("uuid userInfo");

            response = usersWithMatchingTeams.map((user) => ({
                Name: user.userInfo.Nickname,
                uniqueId: user.uuid,
                URL: user.userInfo.Profile_ImgURL,
            }));
        }

        const message = response.length > 0
        ? type === 'player'
            ? search
                ? "Player found successfully!"
                : "Player list fetched successfully!"
            : type === 'team'
                ? search
                    ? "Team found successfully!"
                    : "Team list fetched successfully!"
                : "Invalid type provided."
        : type === 'player'
            ? search
                ? "Player Name is not Found"
                : "Player List Not found"
            : type === 'team'
                ? search
                    ? "Team Name is not Found"
                    : "Team List Not found"
                : "Invalid type provided.";

        console.log("Search TeamList Pass");
        res.status(200).json({ status: true, message, response });
    } catch (error) {
        console.error("Search TeamList Route Error:", error.message);
        res.status(500).json({ status: false, message: "Search TeamList Route Error", error: error.message });
    }
};

export const viewTeamDetails = async( req,res) => {
    const {uuid: userUuid} = req.user
    let {t_id, op_id} = req.query
    try {
        let teamView;
            op_id = op_id.toString()
        if(op_id){
            teamView = await UserDetails.findOne({"MyTeamBuild._id": op_id }).select("MyTeamBuild");
            
        }else {
            teamView = await UserDetails.findOne({ uuid: userUuid, "MyTeamBuild._id": t_id }).select("MyTeamBuild");
        }
        teamView = await UserDetails.find({}).select("userInfo MyTeamBuild");
        
        // Format response to include only admin teams
        const response = teamView.map((user) =>user.MyTeamBuild
        .filter((team) => team.role === "captain")
                    .map((team) => ({
                        T_id: team._id,
                        T_Name:team.Team_Name,
                        S_Name:team.Sports_Name,
                        T_P:team.TotalPlayers,
                        p_L:team.playersList,
                        isReady:team.isReady
                    }))
            )
            .flat(); // Flatten the array of arrays
        let message = teamView.length > 0? "View Team Details" : "No Team Details";

        console.log("viewTeam Details Pass")
        res.status(200).json({status: true, message,  response})
        
    } catch (error) {
        console.log("viewTeam Details Route")
        res.status(500).json({status: false, message: "viewTeam Details Route Error", error: error.message})
    }
}

export const createEvent = async(req,res) => {
    const {id: userId, uuid: UserUuid} = req.user
    const {teamId, loc, link, date, time} = req.body // 2024-12-30 10:00 AM/PM

    try {
        const user = await UserDetails.findById(userId);
        if (!user) {
            return res.status(200).json({ status: false, message: "User not found." });
        }

        const newEvent = new EventRequest({
            eventBy: { id: user._id , name: user?.userInfo?.Nickname},
            reqTeam: teamId,
            loc: loc,
            link: link,
            d_t: `${date} ${time}`
        });

        newEvent.save();
        res.status(200).json({status: true, message: "createEvent Success ", newEvent})
        console.log("Create Event Pass")
    } catch (error) {
        console.log("Create Event Route")
        res.status(500).json({status: false, message: "Create Event Route", error: error.message})
    }
};


export const viewEvent = async (req, res) => {
    const { id: userId, uuid: UserUuid } = req.user; // Destructure userId and uuid
    let {eventID}  = req.query
    try {
        const user = await UserDetails.findById(userId);
        if (!user) {
            return res.status(404).json({ status: false, message: "User Not Found" });
        }
        if(eventID){
            const events = await EventRequest.findByID(eventID).sort({ createdAt: -1 });
            if(!events){
                return res.status(404).json({ status: false, message: "Given EventID is Not Found" });
            }
           
        }
        const events = await EventRequest.find({}).sort({ createdAt: -1 });
        console.log("View Event Pass");
        res.status(200).json({ status: true, message: "View Event", events });
    } catch (error) {
        console.error("View Event Route Error:", error.message);
        res.status(500).json({ status: false, message: "View Event Route", error: error.message });
    }
};

export const eventStatus = async(req,res) => {
    const { id: userId, uuid: UserUuid } = req.user;
    const {status , teamOp} = req.body;
    let {eventID} = req.query
    try {
        const user = await UserDetails.findById(userId);
        if (!user) {
            return res.status(404).json({ status: false, message: "User Not Found" });
        }
        const event = await EventRequest.findById(eventID);

        let current = getFormattedDateTime();
        let eventDate = moment(event.d_t, "YYYY-MM-DD hh:mm A").tz("Asia/Kolkata");

         if(event){
            if (eventDate.isBefore(current)) {
                return res.status(200).json({ status: true, message: "Event has expired", event: event, });
            } else {
                const eventUpdate = await EventRequest.findByIdAndUpdate(eventID, 
                    { status: status, reqOpp: teamOp },
                    { new: true });

                return res.status(200).json({ status: true, 
                    message: "Event status updated successfully & Reeady to Play", eventUpdate, });
            }
         }else{
            return res.status(404).json({status: false, message: "Event Not Found"});
         }
        
    } catch (error) {
        console.error("Event Status Route Error:", error.message);
        res.status(500).json({ status: false, message: "Event Status Route", error: error.message });
    }
};