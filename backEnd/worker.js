import { workerData, parentPort } from "worker_threads";
import sharp from "sharp";
import path from "path";
import fs from "fs";

// ------------------- Ensure processed folder exists -------------------
const processedDir = path.join("processed");
if (!fs.existsSync(processedDir)) fs.mkdirSync(processedDir);

// ------------------- Compression helper (module-level, not inside loop) -------------------
function applyCompression(pipeline, ext, quality = 60) {
  if (!ext || ext === "null") {
    return pipeline;
  }

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
      return pipeline.jpeg({ quality });
  }
}

// ------------------- Main worker function -------------------
async function processImages(files) {
  const results = [];

  for (const file of files) {
    const originalExt = file.extension?.toLowerCase();

    // Resolve cusExt whether it comes in as string or array
    let cusExt = null;
    if (typeof file.cusExt === "string" && file.cusExt) {
      cusExt = file.cusExt.toLowerCase();
    } else if (Array.isArray(file.cusExt) && file.cusExt.length > 0) {
      cusExt = file.cusExt[0].toLowerCase();
    }

    // ------------------- Save original (no compression) -------------------
    const originalOutput = path.join(processedDir, `${file.filename}_original.${originalExt}`);
    await sharp(file.path).toFile(originalOutput);
    const originalSizeKB = Math.round(fs.statSync(originalOutput).size / 1024);

    // ------------------- Custom extension compression -------------------
    let customSizeKB = 0;
    let customCompressOutput = null;

    if (cusExt) {
      customCompressOutput = path.join(processedDir, `${file.filename}_custom.${cusExt}`);
      await applyCompression(sharp(file.path), cusExt).toFile(customCompressOutput);
      customSizeKB = Math.round(fs.statSync(customCompressOutput).size / 1024);
    }

    // ------------------- Compress on original extension -------------------
    const originalCompressOutput = path.join(processedDir, `${file.filename}_compressOnOriginal.${originalExt}`);
    await applyCompression(sharp(file.path), originalExt).toFile(originalCompressOutput);
    const origiSizeKB = Math.round(fs.statSync(originalCompressOutput).size / 1024);

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
        url: `/download?file=${encodeURIComponent(path.basename(customCompressOutput))}`
      } : null,
      originalExtCompressFile: {
        path: originalCompressOutput,
        sizeKB: origiSizeKB,
        ext: originalExt,
        url: `/download?file=${encodeURIComponent(path.basename(originalCompressOutput))}`
      }
    });
  }

  return results;
}

// ------------------- Run worker -------------------
processImages(workerData)
  .then(results => parentPort.postMessage(results))
  .catch(err => {
    console.error("Worker processing error:", err);
    parentPort.postMessage({ error: "Processing failed" });
  });