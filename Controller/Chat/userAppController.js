import UserDetails from "../../Model/UserModelDetails.js"

export const getUsersForSidebar = async(req,res) => {
    const {id: loggedInUserId} = req.user
    try {
        const filteredUser = await UserDetails.find({_id: {$ne: loggedInUserId}}).select("id uuid First_Name Last_Name")
        console.log(filteredUser);
        res.status(200).json({status: true, message: `All User`, UsersList: filteredUser})
    } catch (error) {
        console.log(error.message)
        res.status(200).json({status: false })
    }
}