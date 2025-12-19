import dotenv from "dotenv";
dotenv.config(); // Load environment variables from .env

import express from "express";
import cors from "cors";
import multer from "multer";
import path from "path";
import { Worker } from "worker_threads";
import { fileURLToPath } from "url";
import fs from "fs"; // Synchronous & callback-based API
import fsp from "fs/promises"; // Promise-based API
import { deleteFile, deleteFiles } from "./utils/junkDelete.js";

// ------------------- File path setup -------------------
const __filename = fileURLToPath(import.meta.url); // Current file path
const __dirname = path.dirname(__filename); // Current directory

const app = express(); // Initialize Express app

// ------------------- Middlewares -------------------
app.use(cors()); // Enable CORS
app.use(express.json()); // Parse JSON bodies

// Configure Multer for file uploads
const upload = multer({
    dest: "uploads/", // Temporary upload directory
    limits: { fileSize: 5 * 1024 * 1024 } // 5MB max file size
});

// ------------------- Test route -------------------
app.get("/", (req, res) => {
    res.json({ message: "Server is running 🚀" });
});

// ------------------- Upload images route -------------------
app.post("/api/upload", upload.array("image"), (req, res) => {

    // Validate files exist
    if (!req.files || req.files.length === 0) {
        return res.status(400).json({ error: "No files uploaded" });
    }

    // Extract MIME types and custom extension from request body
    const exe = req.body; // e.g., { type_0: "image/jpeg", type_1: "image/png" }

    // Map uploaded files to structured data for worker
    const filesData = req.files.map((file, index) => {
        const custypes = req.body.cusExt; // Custom extension selected by user
        const fileType = exe[`type_${index}`] || file.mimetype; // Fallback to multer MIME type
        const fileExtension = fileType ? fileType.split("/")[1] : ''; // Extract extension

        return {
            path: file.path, // Temporary upload path
            filename: file.filename, // Unique filename assigned by multer
            originalname: file.originalname, // Original file name
            mimeType: fileType, // MIME type
            extension: fileExtension, // File extension
            cusExt: custypes // Selected custom extension
        };
    });

    // ------------------- Spawn worker thread for image processing -------------------
    try {
        const worker = new Worker(path.resolve(__dirname, "./worker.js"), {
            workerData: filesData // Pass files to worker
        });

        // Listen for messages from worker (processed files)
        worker.on("message", processedFiles => {
            res.json({ processedFiles });
        });

        // Handle worker errors
        worker.on("error", err => {
            console.error("Worker error:", err);
            res.status(500).json({ error: "Image processing failed" });
        });

    } catch (err) {
        console.error("Worker creation failed:", err);
        res.status(500).json({ error: "Worker creation failed" });
    }
});

// ------------------- Delete all junk files route -------------------
app.get("/deleteAllJunk", async (req, res) => {

    const processedDir = path.resolve("./processed"); // Processed files folder
    const uploadDir = path.resolve("./uploads"); // Uploads folder

    // Helper to read all files in a directory
    async function getAllFiles(dir) {
        try {
            const files = await fsp.readdir(dir); // List files
            const filePaths = files.map(file => path.join(dir, file)); // Full paths
            console.log("Files in folder:", filePaths);
            return filePaths;
        } catch (err) {
            console.error("Error reading folder:", err.message);
            return [];
        }
    }

    const processedFiles = await getAllFiles(processedDir);
    deleteFiles(processedFiles); // Delete all processed files

    const uploadFiles = await getAllFiles(uploadDir);
    deleteFiles(uploadFiles); // Delete all uploaded files

    res.json("Delete All Junk"); // Response
});

// ------------------- Download route -------------------
app.get("/download", async (req, res) => {
    const filePath = req.query.file; // File path from query
    if (!filePath) {
        return res.status(400).send("Missing file parameter");
    }

    // Ensure download is restricted to processed directory
    const processedDir = path.resolve("processed") + path.sep; // Ensure trailing separator
    const resolvedPath = path.resolve(filePath);

    if (!resolvedPath.startsWith(processedDir)) {
        return res.status(403).send("Forbidden");
    }

    // Check if file exists
    if (!fs.existsSync(resolvedPath)) {
        return res.status(404).send("File not found");
    }

    // Send file for download
    res.download(resolvedPath, err => {
        if (err) {
            console.error("Download error:", err);
            return res.status(500).send("Error downloading file");
        }
    });
});

// ------------------- Global error handler -------------------
app.use((err, req, res, next) => {
    const statusCode = err.status || err.statusCode || 500;

    // Log error details
    console.error("🔥 Error caught:", {
        message: err.message,
        stack: err.stack,
        route: req.originalUrl,
        method: req.method
    });

    // Send error response
    res.status(statusCode).json({
        success: false,
        message: err.message || "Something went wrong",
        statusCode,
        stack: err.stack // Show stack only in development
    });
});

// ------------------- Start server -------------------
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
