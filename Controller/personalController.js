import UserDetails from '../Model/UserModelDetails.js';


export const viewUserProfile = async(req,res) => {
    const {uuid} = req.params;
    try {
        const user = await UserDetails.findOne({ uuid });
        console.log(`Step 1: User found: ${user}`);

        if (!user) {
            return res.status(404).json({ status: false, message: "User not found" });
        }

        const userInfo = user.userInfo;
        console.log(`Step 2: User Info: ${userInfo}`);
        
        const UI = userInfo
            ? {
                Email_ID: user.Email_ID,
                First_Name: user.First_Name,
                Last_Name: user.Last_Name,
                userInfo,
            }
            : {
                Email_ID: user.Email_ID,
                First_Name: user.First_Name,
                Last_Name: user.Last_Name,
            };

        console.log(`Step 3: Constructed UI: ${JSON.stringify(UI)}`);

        res.status(200).json({status: true, message: "UserInfo Success", UI})
    } catch (error) {
        res.status(500).json({status: false, message: "UserInfo, Causes Route Error"});
    }
};

export const SaveUserProfile = async(req,res) => {
    const {uuid} = req.params;
    const {Profile_ImgURL, Nickname,Phone_Number, Date_of_Birth, Gender, Education, Work, Club} = req.body;
    try {
        
        const updatedUser = await UserDetails.findOneAndUpdate(
            { uuid }, 
            { 
                $set: { 
                    'userInfo.Profile_ImgURL':Profile_ImgURL,
                    'userInfo.Nickname': Nickname, 
                    'userInfo.Phone_Number': Phone_Number, 
                    'userInfo.Date_of_Birth': Date_of_Birth, 
                    'userInfo.Gender': Gender, 
                    'userInfo.Education': Education, 
                    'userInfo.Work': Work, 
                    'userInfo.Club': Club 
                }
            },
            { new: true }
        ).select('userInfo');
        console.log(`Step 1: User found: ${updatedUser}`);

        res.status(200).json({status: true, message: "UserInfo Updateded", updatedUser});
        
    } catch (error) {
        res.status(500).json({status: false, message: "PersonalDetails Causes Route Error"});
    }
};


export const sportsView = async(req,res) => {
    const {uuid} = req.params;
    try {
        const sportsInfo = await UserDetails.findOne({uuid}).select("sportsInfo")
        console.log(sportsInfo.sportsInfo[0]);
        const message = sportsInfo.sportsInfo.length > 0 ? "ViewSports Success" : "No sports found.";

        res.status(200).json({status: true, message, UserInfo: sportsInfo});
    } catch (error) {
        res.status(500).json({status: false, message: "ViewSports Causes Route Error"});
    }
};


export const sportsAdd = async(req,res) => {
    const {uuid} = req.params;
    const {Sports_ImgURL, Sports_Name, Year_Playing, BestAt, Matches, Video_ImgURL} = req.body;
    try {

        const user = await UserDetails.findOne({ uuid });
        
        if (!user) {
            return res.status(404).json({ status: false, message: "User not found" });
        }

        const existingSport = user.sportsInfo.find(sport => sport.Sports_Name.toLowerCase() === Sports_Name.toLowerCase());
          if (existingSport) {
            return res.status(400).json({ status: false, message: "Sport with this name already exists." });
          }

        const newSports = {
            Sports_ImgURL, 
            Sports_Name : Sports_Name.toLowerCase(),
            Year_Playing,
            BestAt,
            Matches,
            Video_ImgURL,
            isActive: false
        }
        user.sportsInfo.push(newSports);
        await user.save();
  
        res.status(200).json({status: true,  message: "Sports details added successfully.", sport:  newSports });
        
    } catch (error) {
        res.status(500).json({status: false, message: "SportsDetails Causes Route Error"});
    }
};

export const sportsEdit = async(req, res) => {
    const {uuid, sportid} = req.params;
    const updateFields = req.body; 
    try {
        console.log(`${uuid} ${sportid} ${updateFields} `)

        const updateObj = {};
        for (const field in updateFields) {
            if (updateFields.hasOwnProperty(field)) {
                updateObj[`sportsInfo.$.${field}`] = updateFields[field];
            }
        }
        //$set is update
        const user = await UserDetails.findOneAndUpdate(
            { uuid, "sportsInfo._id": sportid },  
            { $set: updateObj },  
            { new: true } 
        ).select("sportsInfo");

        if (!user) {
            return res.status(404).json({ status: false, message: "User or sport not found." });
        }

        console.log("Updated SportInfo:", user.sportsInfo);
        
        res.status(200).json({status: true,  message: "Updated successfully.", sportsInformation: user.sportsInfo.id(sportid)});
    } catch (error) {
        res.status(500).json({status: false, message: "Updates Causes Route Error"});
    }
};

export const sportsClear = async(req, res) => {
    const {uuid, sportid} = req.params;
    try {
        // $pull is removed
        const user = await UserDetails.findOneAndUpdate(
            { uuid },
            { $pull: { sportsInfo: { _id: sportid } } }, 
            { new: true }  
        ).select("sportsInfo");

        if (!user) {
            return res.status(404).json({ status: false, message: "User or sport not found." });
        }
        console.log("Updated Sports Info:", user.sportsInfo);

        res.status(200).json({status: true,  message: "Sport removed successfully"});
    } catch (error) {
        res.status(500).json({status: false, message: "Updates Causes Route Error"});
    }
}

