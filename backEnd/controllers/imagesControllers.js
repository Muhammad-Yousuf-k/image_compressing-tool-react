import path from "path";
import { Worker } from "worker_threads";
import { fileURLToPath } from "url";
import fsp from "fs/promises";
import { deleteFiles, getAllFiles } from "../utils/junkDelete.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PROCESSED_DIR = path.resolve("processed");
const UPLOAD_DIR = path.resolve("uploads");


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

        worker.on("message", async (workerResult) => {
            // Handle error message sent from worker
            if (workerResult?.error) {
                if (!res.headersSent) {
                    res.status(500).json({ error: "Image processing failed" });
                }
                return;
            }

            // Respond first, then clean up uploads
            if (!res.headersSent) {
                res.json({ processedFiles: workerResult });
            }

            // Clean up original uploaded files after responding
            for (const file of req.files) {
                await fsp.unlink(file.path).catch(err =>
                    console.error("Upload cleanup failed:", file.path, err.message)
                );
            }
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
    const rawFileName = req.query.file;

    if (!rawFileName) {
        return res.status(400).send("Missing file parameter");
    }

    // Prevent path traversal: strip any directory components
    const safeFileName = path.basename(rawFileName);
    const resolvedPath = path.resolve(PROCESSED_DIR, safeFileName);

    // Double-check resolved path stays inside processedDir
    if (!resolvedPath.startsWith(PROCESSED_DIR + path.sep)) {
        return res.status(400).send("Invalid file path");
    }

    try {
        await fsp.access(resolvedPath);
    } catch {
        return res.status(404).send("File not found");
    }

    res.download(resolvedPath, safeFileName, err => {
        if (err) {
            console.error("Download error:", err);
            if (!res.headersSent) {
                res.status(500).send("Error downloading file");
            }
        }
    });
};


export const deleteController = async (req, res) => {
    // Verify admin secret to prevent unauthorized wipes
    const adminSecret = req.headers["x-admin-secret"];
    if (!adminSecret || adminSecret !== process.env.ADMIN_SECRET) {
        return res.status(403).json({ error: "Forbidden" });
    }

    const processedFiles = await getAllFiles(PROCESSED_DIR);
    await deleteFiles(processedFiles);

    const uploadFiles = await getAllFiles(UPLOAD_DIR);
    await deleteFiles(uploadFiles);

    res.json({ message: "All junk deleted successfully" });
};