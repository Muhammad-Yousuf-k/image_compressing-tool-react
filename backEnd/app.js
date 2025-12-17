import dotenv from "dotenv";
dotenv.config();

import express from "express";
import cors from "cors";
import multer from "multer";
import path from "path";
import { Worker } from "worker_threads";
import { fileURLToPath } from "url";
import { type } from "os";
// Synchronous & callback-based API
import fs from "fs";
// Promise-based API
import fsp from "fs/promises";
import { deleteFile, deleteFiles } from "./utils/junkDelete.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();


// Middlewares
app.use(cors());
app.use(express.json());
const upload = multer({ dest: "uploads/" });

// Test route
app.get("/", (req, res) => {
    res.json({ message: "Server is running 🚀" });
});

// Upload route
app.post("/api/upload", upload.array("image"), (req, res) => {
    if (!req.files || req.files.length === 0) {
        return res.status(400).json({ error: "No files uploaded" });
    }

    // Access types from req.body
    const exe = req.body; // e.g., { type_0: "image/jpeg", type_1: "image/png" }


    const filesData = req.files.map((file, index) => {
        const custypes = req.body.cusExt;
        const fileType = exe[`type_${index}`];    // get MIME type
        const fileExtension = fileType.split("/")[1];

        return {
            path: file.path,
            filename: file.filename,
            originalname: file.originalname,
            mimeType: fileType,
            extension: fileExtension,
            cusExt: custypes
        };
    });




    try {
        const worker = new Worker(path.resolve(__dirname, "./worker.js"), {
            workerData: filesData
        });

        worker.on("message", processedFiles => {
            res.json({ processedFiles });
        });


        worker.on("error", err => {
            console.error("Worker error:", err);
            res.status(500).json({ error: "Image processing failed" });
        });
    } catch (err) {
        console.error("Worker creation failed:", err);
        res.status(500).json({ error: "Worker creation failed" });
    }

});

app.get("/deleteAllJunk", async (req, res) => {

    const processedDir = path.resolve("./processed");
    const uploadDir = path.resolve("./uploads");

    async function getAllFiles(dir) {
        try {
            const files = await fsp.readdir(dir); // fs/promises version
            const filePaths = files.map(file => path.join(dir, file));
            console.log("Files in folder:", filePaths);
            return filePaths;
        } catch (err) {
            console.error("Error reading folder:", err.message);
            return [];
        }
    }

    const processedFiles = await getAllFiles(processedDir);
    deleteFiles(processedFiles)

    const uploadFiles = await getAllFiles(uploadDir);
    deleteFiles(uploadFiles)

    res.json("Delete All Junk")
});


app.get("/download", async (req, res) => {
    const filePath = req.query.file;

    if (!filePath || !fs.existsSync(filePath)) {
        return res.status(404).send("File not found");
    }

    // Send file for download
    res.download(filePath, (err) => {
        if (err) {
            console.error("Download error:", err);
            return res.status(500).send("Error downloading file");
        }

        // Delete the file AFTER download completes
        deleteFile(filePath)
            .then(() => console.log(`Deleted file: ${filePath}`))
            .catch((err) => console.error(`Failed to delete file: ${filePath}`, err));
    });
});


const PORT = 3000;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
