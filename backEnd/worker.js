import { workerData, parentPort } from "worker_threads"; // Worker threads API
import sharp from "sharp"; // Image processing library
import path from "path";
import fs from "fs";

// ------------------- Ensure processed folder exists -------------------
const processedDir = path.join("processed"); // Directory to save processed images
if (!fs.existsSync(processedDir)) fs.mkdirSync(processedDir); // Create if missing

// ------------------- Main worker function -------------------
async function processImages(files) {

  // Array to store processed results
  const results = [];

  // Loop through each uploaded file
  for (const file of files) {

    // Original file extension (lowercase)
    const originalExt = file.extension?.toLowerCase();

    // Determine custom extension (if user selected one)
    let cusExt = null;
    if (typeof file.cusExt === "string") {
      cusExt = file.cusExt.toLowerCase();
    } else if (Array.isArray(file.cusExt) && file.cusExt.length > 0) {
      // take the first element if array
      cusExt = file.cusExt[0].toLowerCase();
    } else {
      cusExt = null; // fallback if none selected
    }

    // ------------------- Save original file -------------------
    const originalOutput = path.join(processedDir, `${file.filename}_original.${originalExt}`);
    await sharp(file.path).toFile(originalOutput); // Save without compression

    // Get size of original file in KB
    const originalStats = fs.statSync(originalOutput);
    const originalSizeKB = Math.round(originalStats.size / 1024);

    // ------------------- Compression helper -------------------
    function applyCompression(pipeline, ext, quality = 60) {
      if (!ext || ext === "null") {
        return pipeline; // no compression
      }

      // Apply appropriate compression format and quality
      switch (ext) {
        case "avif":
          return pipeline.avif({ quality });
        case "png":
          return pipeline.png({ quality });
        case "webp":
          return pipeline.webp({ quality });
        case "jpeg":
        case "jpg":
          return pipeline.jpeg({ quality });
        default:
          return pipeline.jpeg({ quality }); // fallback
      }
    }

    // ------------------- Custom extension compression -------------------
    let customSizeKB = 0;
    let customCompressOutput = null;

    if (cusExt) {
      customCompressOutput = path.join(processedDir, `${file.filename}_custom.${cusExt}`);
      let CustomImagePipeline = applyCompression(sharp(file.path), cusExt); // Apply compression
      await CustomImagePipeline.toFile(customCompressOutput); // Save compressed file
      const customStats = fs.statSync(customCompressOutput);
      customSizeKB = Math.round(customStats.size / 1024); // size in KB
    }

    // ------------------- Compress on original extension -------------------
    const originalCompressOutput = path.join(processedDir, `${file.filename}_compressOnOriginal.${originalExt}`);
    let originalImagePipeline = applyCompression(sharp(file.path), originalExt); // Apply compression
    await originalImagePipeline.toFile(originalCompressOutput); // Save compressed file
    const origiStats = fs.statSync(originalCompressOutput);
    const origiSizeKB = Math.round(origiStats.size / 1024); // size in KB

    // ------------------- Push results -------------------
    results.push({
      message: "processing complete",
      originalFile: {
        originalName: file.originalname,
        path: originalOutput,
        sizeKB: originalSizeKB,
        ext: originalExt
      },
      customExtCompressFile: cusExt ? {
        path: customCompressOutput,
        sizeKB: customSizeKB,
        ext: cusExt,
        url: `/download?file=${encodeURIComponent(customCompressOutput)}` // download link
      } : null,
      originalExtCompressFile: {
        path: originalCompressOutput,
        sizeKB: origiSizeKB,
        ext: originalExt,
        url: `/download?file=${encodeURIComponent(originalCompressOutput)}` // download link
      }
    });
  }

  return results; // return processed file data
}

// ------------------- Run worker -------------------
processImages(workerData)
  .then(results => parentPort.postMessage(results)) // send results back to main thread
  .catch(err => parentPort.postMessage({ error: err.message })); // send error if failed


  