import express from "express";
import multer from "multer";
import { uploadLimiter, deleteLimiter } from "../utils/rateLimiters.js";
import { compressController, downloadController, deleteController } from "../controllers/imagesControllers.js";

const router = express.Router();

const upload = multer({
    dest: "uploads/",
    limits: { fileSize: 5 * 1024 * 1024 },
    fileFilter: (req, file, cb) => {
        const allowedMimeTypes = [
            "image/jpeg",
            "image/png",
            "image/webp",
            "image/avif"
        ];

        if (!allowedMimeTypes.includes(file.mimetype)) {
            return cb(new Error("Only JPG, PNG, WEBP, and AVIF files are allowed"));
        }

        cb(null, true);
    }
});

router.post("/upload", uploadLimiter, upload.array("image"), compressController);
router.get("/download", downloadController);
router.delete("/deleteAllJunk", deleteLimiter, deleteController);

export default router;