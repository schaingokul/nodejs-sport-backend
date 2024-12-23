/*import multer from "multer";
import path from "path";
import { fileURLToPath } from 'url';
import fs from "fs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const uploadDir = path.join(__dirname, "../Uploads/");

// Create uploads directory if it doesn't exist
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
    console.log("Uploads folder created!");
}

// Create subfolders for images and videos if they don't exist
const imagesDir = path.join(uploadDir, 'images');
const videosDir = path.join(uploadDir, 'videos');

if (!fs.existsSync(imagesDir)) {
    fs.mkdirSync(imagesDir, { recursive: true });
    console.log("Images folder created!");
}

if (!fs.existsSync(videosDir)) {
    fs.mkdirSync(videosDir, { recursive: true });
    console.log("Videos folder created!");
}

const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        const allowedImageTypes = ['image/jpeg','image/jpg', 'image/png', 'image/gif'];
        const allowedVideoTypes = ['video/mp4', 'video/avi', 'video/mkv'];

        // Set destination based on file type
        if (allowedImageTypes.includes(file.mimetype)) {
            cb(null, imagesDir); // Image files will go to the 'images' folder
        } else if (allowedVideoTypes.includes(file.mimetype)) {
            cb(null, videosDir); // Video files will go to the 'videos' folder
        } else {
            cb(new Error('Invalid file type'), false); // Reject invalid file types
        }
    },
    filename: function (req, file, cb) {
        const extname = path.extname(file.originalname); // Get file extension
        const filename = Date.now() + '-' + file.fieldname + extname; // Generate unique filename
        cb(null, filename); // Save file with the generated filename
    }
});

const fileFilter = (req, file, cb) => {
    const allowedImageTypes = ['image/jpeg', 'image/jpg','image/png', 'image/gif'];
    const allowedVideoTypes = ['video/mp4', 'video/avi', 'video/mkv'];
    
    if (allowedImageTypes.includes(file.mimetype)) {
        cb(null, true);
    } else if (allowedVideoTypes.includes(file.mimetype)) {
        cb(null, true);
    } else {
        return cb(new Error('Invalid file type'), false);
    }
};

export const upload = multer({
    storage: storage,
    fileFilter: fileFilter
});
*/

import multer from "multer";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const upload = multer({
    storage: multer.diskStorage({
        destination: function (req, file, cb) {
            try {
                // Ensure ProtectRoute runs before this middleware
                if (!req.user || !req.user.uuid) {
                    return cb(new Error("User not authenticated"), false);
                }

                const { uuid: currentUserFolder } = req.user;
                const uploadDir = path.join(__dirname, `../Uploads/${currentUserFolder}`);

                // Create user-specific folder
                if (!fs.existsSync(uploadDir)) {
                    fs.mkdirSync(uploadDir, { recursive: true });
                    console.log(`User folder created: ${uploadDir}`);
                }

                // Create subfolders for images and videos
                const imagesDir = path.join(uploadDir, "images");
                const videosDir = path.join(uploadDir, "videos");

                if (!fs.existsSync(imagesDir)) fs.mkdirSync(imagesDir, { recursive: true });
                if (!fs.existsSync(videosDir)) fs.mkdirSync(videosDir, { recursive: true });

                // Determine the correct folder based on MIME type
                const allowedImageTypes = ["image/jpeg", "image/jpg", "image/png", "image/gif"];
                const allowedVideoTypes = ["video/mp4", "video/avi", "video/mkv"];

                if (allowedImageTypes.includes(file.mimetype)) {
                    cb(null, imagesDir);
                } else if (allowedVideoTypes.includes(file.mimetype)) {
                    cb(null, videosDir);
                } else {
                    cb(new Error("Invalid file type"), false);
                }
            } catch (error) {
                console.error("Error setting upload directory:", error.message);
                cb(error);
            }
        },
        filename: function (req, file, cb) {
            const extname = path.extname(file.originalname); // Get file extension
            const filename = `${Date.now()}-${file.originalname}`; // Generate unique filename
            cb(null, filename);
        },
    }),
    fileFilter: (req, file, cb) => {
        const allowedImageTypes = ["image/jpeg", "image/jpg", "image/png", "image/gif"];
        const allowedVideoTypes = ["video/mp4", "video/avi", "video/mkv"];

        if (allowedImageTypes.includes(file.mimetype) || allowedVideoTypes.includes(file.mimetype)) {
            cb(null, true);
        } else {
            cb(new Error("Invalid file type"), false);
        }
    },
});