import fs from "fs";
import path from "path";



/**
 * Delete a single file safely
 * @param {string} filePath - Full path to the file
 * @returns {Promise<boolean>} - Returns true if deleted, false if file doesn't exist
 */
export async function deleteFile(filePath) {
    return new Promise((resolve, reject) => {
        if (!filePath) return resolve(false);

        fs.access(filePath, fs.constants.F_OK, (err) => {
            if (err) {
                // File does not exist
                return resolve(false);
            }

            fs.unlink(filePath, (err) => {
                if (err) return reject(err);
                resolve(true);
            });
        });
    });
}

/**
 * Delete multiple files safely
 * @param {string[]} files - Array of file paths
 */
export async function deleteFiles(files) {
    for (const filePath of files) {
        try {
            const deleted = await deleteFile(filePath);
            if (deleted) console.log(`Deleted: ${filePath}`);
        } catch (err) {
            console.error(`Failed to delete ${filePath}:`, err.message);
        }
    }
}
