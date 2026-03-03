import path from "path";
import { Worker } from "worker_threads";
import { fileURLToPath } from "url";
import fsp from "fs/promises";
import { deleteFiles } from "../utils/junkDelete.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);


export const compressController = (req, res) => {
    if (!req.files || req.files.length === 0) {
        return res.status(400).json({ error: "No files uploaded" });
    }

    try {
        const filesData = req.files.map((file, index) => {
            const mimeType = req.body[`type_${index}`] || file.mimetype;

            return {
                path: file.path,
                filename: file.filename,
                originalname: file.originalname,
                mimeType,
                extension: mimeType.split("/")[1] || "",
                cusExt: req.body.cusExt || ""
            };
        });

        const worker = new Worker(
            path.resolve(__dirname, "../worker.js"),
            { workerData: filesData }
        );

        worker.on("message", processedFiles => {
            res.json({ processedFiles });
        });

        worker.on("error", err => {
            console.error("Worker error:", err);
            if (!res.headersSent) {
                res.status(500).json({ error: "Image processing failed" });
            }
        });

        worker.on("exit", code => {
            if (code !== 0 && !res.headersSent) {
                res.status(500).json({ error: "Worker stopped unexpectedly" });
            }
        });

    } catch (err) {
        console.error("Worker creation failed:", err);
        res.status(500).json({ error: "Worker creation failed" });
    }
};

export const downloadController = async (req, res) => {
    const fileName = req.query.file;

    if (!fileName) {
        return res.status(400).send("Missing file parameter");
    }

    const processedDir = path.resolve("processed");
    const resolvedPath = path.join(processedDir, fileName);

    try {
        await fsp.access(resolvedPath);
    } catch {
        return res.status(404).send("File not found");
    }

    res.download(resolvedPath, fileName, err => {
        if (err) {
            console.error("Download error:", err);
            return res.status(500).send("Error downloading file");
        }
    });
};

export const deleteController = async (req, res) => {

    const processedDir = path.resolve("./processed"); // Processed files folder
    const uploadDir = path.resolve("./uploads"); // Uploads folder

    // Helper to read all files in a directory
    async function getAllFiles(dir) {
        try {
            const files = await fsp.readdir(dir); // List files
            const filePaths = files.map(file => path.join(dir, file)); // Full paths
            return filePaths;
        } catch (err) {
            console.error("Error reading folder:", err.message);
            return [];
        }
    }

    const processedFiles = await getAllFiles(processedDir);
    await deleteFiles(processedFiles);

    const uploadFiles = await getAllFiles(uploadDir);
    await deleteFiles(uploadFiles);

    res.json("Delete All Junk"); // Response
}