import PostImage from '../Model/ImageModel.js';
import UserDetails from '../Model/UserModelDetails.js';


export const getUserInfoByUniqueId = async({uuid}) => {
    try {
        const userInfo = await UserDetails.findOne({uuid});

        if (!userInfo) {
            throw new Error("User not found");
        }
        return userInfo;
    } catch (error) {
        console.error("Error fetching user:", error.message);
        throw error;
    }
};


{/*
export const userPersonal = UserDetails.find({uuid}).select("userInfo");
export const userSports = UserDetails.find({uuid}).select("sportsInfo");
export const postInfo = postImage.find({uuid})
*/

}
