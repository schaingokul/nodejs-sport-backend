import UserDetails from '../Model/UserModelDetails.js';
import jwt from "jsonwebtoken";
import { ErrorHandler } from '../utilis/ErrorHandlingMiddleware.js';

const JWT_SECRET = "SPORTS" || process.env.JWT_SECRET;

const protectRoute = async (req, res, next) => {
	try {
		const token = req.headers.authorization?.startsWith("Bearer") ? req.headers.authorization.split(" ")[1] : null;
        console.log("Generate_Token: ", token);

		if (!token) {
			return res.status(200).json({status: false, message: "Unauthorized: No token provided"})
			// throw new ErrorHandler(401, "Unauthorized: No token provided");
		}

		const decoded = jwt.verify(token, JWT_SECRET);

		const user = await UserDetails.findById(decoded.id).select("-password");

		req.user = {
			id: decoded.id,
			uuid: decoded.uuid,
			Email_Id: decoded.Email_ID
		};

		next();
	} catch (err) {
		console.log("protectRoute: ",err.message);
		return res.status(200).json({status: false, message: "protectRoute"})
		//throw new ErrorHandler(400, "Unauthorized: Invalid token");
	}
};

export default protectRoute;