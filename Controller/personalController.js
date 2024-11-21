import UserDetails from '../Model/UserModelDetails.js';

export const userProfile = async(req,res) => {
    const {uuid} = req.params;
    const {N_C, PH ,DOB, GD, ED, WK, CB} = req.body;
    try {
        const updatedUser = await UserDetails.findOneAndUpdate(
            { uuid }, // Find user by UUID
            { 
                $set: { 
                    'userInfo.N_C': N_C, 
                    'userInfo.PH': PH, 
                    'userInfo.DOB': DOB, 
                    'userInfo.GD': GD, 
                    'userInfo.ED': ED, 
                    'userInfo.WK': WK, 
                    'userInfo.CB': CB 
                }
            },
            { new: true }
        ).select("userInfo");
        
        res.status(200).json({status: true, message: "PersonalDetails Created", updatedUser});
        
    } catch (error) {
        res.status(500).json({status: false, message: "PersonalDetails Causes Route Error"});
    }
};


export const sportsProfile = async(req,res) => {
    const {uuid} = req.params;
    const {sportImageString, sportName, Year, BestAt, Matches, SportsVideoString} = req.body;
    try {
    
        const user = await UserDetails.findOne({ uuid });
       console.log(user)
        if (!user) {
            return res.status(404).json({ status: false, message: "User not found" });
        }

        const newSportsDetails = {
            'Sports_ImgURL': sportImageString, 
            'Sports_Name' : sportName,
            'Year_Playing': Year,
            'BestAt': BestAt,
            'Matches': Matches,
            'Video_ImgURL': SportsVideoString 
        }
        
        const updatedUser = await UserDetails.findOneAndUpdate(
            { uuid , "sportsInfo.Sports_Name" :{ $ne: sportName } },
            { $push: {sportsInfo: newSportsDetails} },
            { new:true }
            ).select("sportsInfo")

        console.log("Step 4: User Document ->" ,updatedUser);

        if (!updatedUser) {
            return res.status(400).json({ status: false, message: "Sport with this name already exists for the user."})
        }

        res.status(200).json({status: true, message: "SportsDetails Created", updatedUser});
        
    } catch (error) {
        res.status(500).json({status: false, message: "SportsDetails Causes Route Error"});
    }
};

export const ViewSports = async(req,res) => {
    const {uuid} = req.params;
    try {
        const user = await UserDetails.findOne({uuid})
        const sendInfo = user.sportsInfo.map((item) => ({
            id: item.id,
            Sports_Name: item.Sports_Name,
            Matches: item.Matches,
            BestAt: item.BestAt,
            isActive: item.isActive
        }));
        console.log(sendInfo)
        res.status(200).json({status: true, message: "ViewSports Success", sendInfo});
    } catch (error) {
        res.status(500).json({status: false, message: "ViewSports Causes Route Error"});
    }
};

export const updateSports = async(req,res) => {
    const {uuid, sportid} = req.params;
    console.log(uuid, sportid)
    try {
        const user = await UserDetails.findOne({uuid})
       
        const sport = user.sportsInfo[0].id;
        console.log(sport)
        
        res.status(200).json({status: true, message: "UpdateSports Success"});
    } catch (error) {
        res.status(500).json({status: false, message: "UpdateSports Causes Route Error"});
    }
};
