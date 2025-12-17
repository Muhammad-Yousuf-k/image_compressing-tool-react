import { workerData, parentPort } from "worker_threads";
import sharp from "sharp";
import path from "path";
import fs from "fs";

// Ensure processed folder exists
const processedDir = path.join("processed");
if (!fs.existsSync(processedDir)) fs.mkdirSync(processedDir);

// main worker function
async function processImages(files) {

  // store result
  const results = [];

  for (const file of files) {
    const originalExt = file.extension?.toLowerCase(); // original extension

    let cusExt = null;
    if (typeof file.cusExt === "string") {
      cusExt = file.cusExt.toLowerCase();
    } else if (Array.isArray(file.cusExt) && file.cusExt.length > 0) {
      // take the first element (or handle multiple if needed)
      cusExt = file.cusExt[0].toLowerCase();
    } else {
      cusExt = null; // fallback if nothing selected
    }



    // ------------------------------
    // Save original file
    const originalOutput = path.join(processedDir, `${file.filename}_original.${originalExt}`);
    await sharp(file.path).toFile(originalOutput);


    // get size of file
    const originalStats = fs.statSync(originalOutput);
    const originalSizeKB = Math.round(originalStats.size / 1024);



    function applyCompression(pipeline, ext, quality = 60) {
      if (!ext || ext === "null") {
        return pipeline; // no compression
      }

      switch (ext) {
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

    let customSizeKB = 0;
    let customCompressOutput = null;

    if (cusExt) {
      customCompressOutput = path.join(processedDir, `${file.filename}_custom.${cusExt}`);
      let CustomImagePipeline = applyCompression(sharp(file.path), cusExt);
      await CustomImagePipeline.toFile(customCompressOutput);
      const customStats = fs.statSync(customCompressOutput);
      customSizeKB = Math.round(customStats.size / 1024);
    }


    const originalCompressOutput = path.join(processedDir, `${file.filename}_compressOnOriginal.${originalExt}`);
    let originalImagePipeline = applyCompression(sharp(file.path), originalExt);
    await originalImagePipeline.toFile(originalCompressOutput);
    const origiStats = fs.statSync(originalCompressOutput);
    const origiSizeKB = Math.round(origiStats.size / 1024);





    // ------------------------------
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
        ext: cusExt
      } : null,
      originalExtCompressFile: {
        path: originalCompressOutput,
        sizeKB: origiSizeKB,
        ext: originalExt
      }
    });

  }



  return results;
}

// Run worker
processImages(workerData)
  .then(results => parentPort.postMessage(results))
  .catch(err => parentPort.postMessage({ error: err.message }));
