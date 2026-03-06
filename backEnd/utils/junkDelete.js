import fsp from "fs/promises";
import path from "path";

/**
 * Returns full file paths for all files in a directory.
 * Returns an empty array if the directory does not exist or cannot be read.
 */
export async function getAllFiles(dir) {
    try {
        const files = await fsp.readdir(dir);
        return files.map(file => path.join(dir, file));
    } catch (err) {
        console.error("Error reading folder:", err.message);
        return [];
    }
}

/**
 * Deletes an array of file paths.
 * Logs a warning for any file that fails to delete.
 */
export async function deleteFiles(filePaths) {
    for (const filePath of filePaths) {
        await fsp.unlink(filePath).catch(err =>
            console.warn("Failed to delete file:", filePath, err.message)
        );
    }
}