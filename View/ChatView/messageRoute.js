import express from 'express';
import { sendMessage, getMessage } from '../../Controller/Chat/messageController.js';
import protectRoute from '../../middleware/ProtectRoute.js';

const router = express.Router();

router.get("/recive/:id", protectRoute, getMessage);
router.post("/send/:id", protectRoute, sendMessage);

export default router

//schaingokul3@gmail.com
//6750486a2d9eb36119e03d95
//Token eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjY3NTA0ODZhMmQ5ZWIzNjExOWUwM2Q5NSIsInV1aWQiOiJ0ODBQSlU1ZlVDLWN2VW5tN28zM2YiLCJFbWFpbF9JRCI6InNjaGFpbmdva3VsM0BnbWFpbC5jb20iLCJpYXQiOjE3MzM0ODEyMzYsImV4cCI6MTczMzU2NzYzNn0.nURMNAy9M4ncGRh8sGB50dffPnjnmIFkxARjvQKd_Fk


//schaingokul4@gmail.com
//675048732d9eb36119e03d98
//Token eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjY3NTA0ODczMmQ5ZWIzNjExOWUwM2Q5OCIsInV1aWQiOiJIVkNhc2V6cnBWN3B0VHYxVkl4TUsiLCJFbWFpbF9JRCI6InNjaGFpbmdva3VsNEBnbWFpbC5jb20iLCJpYXQiOjE3MzM0ODExODMsImV4cCI6MTczMzU2NzU4M30.2iqGhDvTIYk9XxTqmWkTVvw8CXulTbHM0ARwkKncHyE
