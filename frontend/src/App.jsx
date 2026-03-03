import React, { useEffect, useRef, useState } from 'react';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import Nav from './components/nav';
import backG from './assets/images/001-backG.webp';

const App = () => {
  const dropzone = useRef(null);
  const fileInput = useRef(null);

  const [filesData, setFilesData] = useState([]);
  const [filesList, setFilesList] = useState([]);
  const [cusExt, setCusExt] = useState("");
  const [loading, setLoading] = useState(false);

  // ------------------- Delete junk files on server -------------------
  async function deleteJunk() {
    try {
      await fetch("http://localhost:3000/images/deleteAllJunk", { method: "DELETE" });
    } catch (err) {
      console.error("Delete junk failed:", err);
    }
  }

  useEffect(() => { deleteJunk(); }, []);

  const handleDropzoneClick = () => fileInput.current.click();

  const handleFileInput = (e) => {
    e.preventDefault();
    handleFiles(e.target.files);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    handleFiles(e.dataTransfer.files);
  };

  const handleDragOver = (e) => e.preventDefault();

  function handleFiles(files) {
    if (!files || files.length === 0) return;

    const filesLists = Array.from(files).filter(f => f.type.startsWith("image/"));
    setFilesList(filesLists);

    const filePreviews = filesLists.map(file => ({
      file,
      url: URL.createObjectURL(file),
      size: (file.size / (1024 * 1024)).toFixed(2)
    }));

    setFilesData(prev => [...prev, ...filePreviews]);
  }

  async function uploadImages(filesList) {
    if (!filesList.length) {
      toast.error("Upload image first");
      return;
    }

    setLoading(true);

    const formData = new FormData();
    filesList.forEach((file, index) => {
      formData.append("image", file, file.name);
      formData.append(`type_${index}`, file.type);
      formData.append("cusExt", cusExt);
    });

    try {
      const res = await fetch("http://localhost:3000/images/upload", { method: "POST", body: formData });
      const data = await res.json();

      setLoading(false);
      toast.success("Images processed successfully");

      setFilesData(prevData => prevData.map(file => {
        const processed = data.processedFiles.find(p => p.originalFile.originalName === file.file.name);
        if (!processed) return file;

        return {
          ...file,
          originalFile: {
            path: processed.originalFile.path,
            sizeKB: processed.originalFile.sizeKB,
            ext: processed.originalFile.ext,
            downloadURL: `http://localhost:3000/images/download?file=${encodeURIComponent(processed.originalFile.path)}`
          },
          customExtCompressFile: processed.customExtCompressFile ? {
            path: processed.customExtCompressFile.path,
            sizeKB: processed.customExtCompressFile.sizeKB,
            ext: processed.customExtCompressFile.ext,
            downloadURL: `http://localhost:3000/images/download?file=${encodeURIComponent(processed.customExtCompressFile.path)}`
          } : null,
          originalExtCompressFile: {
            path: processed.originalExtCompressFile.path,
            sizeKB: processed.originalExtCompressFile.sizeKB,
            ext: processed.originalExtCompressFile.ext,
            downloadURL: `http://localhost:3000/images/download?file=${encodeURIComponent(processed.originalExtCompressFile.path)}`
          }
        };
      }));
    } catch (err) {
      setLoading(false);
      toast.error(`Upload failed: ${err.message}`);
    }
  }

  return (
    <>
      <ToastContainer position="top-right" autoClose={3000} hideProgressBar={false} />
      <Nav />
      <main className='pt-10 relative min-h-screen'>
        <div className="absolute inset-0 w-full h-full z-0">
          <img src={backG} alt="" className='w-full h-full object-cover' />
        </div>

        <div className='relative flex flex-col gap-5 justify-center items-center w-screen z-20'>
          {/* DropZone */}
          <div className='backdrop-blur flex flex-col gap-5 justify-center p-5 rounded-2xl w-[90%] md:w-1/2'>
            <div
              ref={dropzone}
              onClick={handleDropzoneClick}
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              className="border-2 border-white border-dashed w-full h-80 rounded flex flex-col items-center justify-between p-10"
            >
              <h1 className='text-2xl text-white font-bold'>Upload Images</h1>
              <input
                onChange={handleFileInput}
                ref={fileInput}
                accept="image/*"
                type="file"
                className='hidden'
                multiple
              />
              <p className='text-xl text-center text-white'>Drop Your Images or click to add images</p>
            </div>

            {/* Extension selection & compress button */}
            <div className='bg-gray-600 rounded flex flex-wrap items-center justify-center py-3 w-full gap-3'>
              {["avif", "jpeg", "png", "webp"].map(ext => (
                <button
                  key={ext}
                  onClick={() => setCusExt(ext)}
                  className={`px-3 py-1 rounded text-white active:scale-95 ${cusExt === ext ? "bg-green-600" : "bg-[#2B7FFF]"}`}
                >
                  {ext.toUpperCase()}
                </button>
              ))}
              <button
                onClick={() => uploadImages(filesList)}
                disabled={loading}
                className={`px-3 py-1 text-white rounded ${loading ? "bg-gray-400 cursor-not-allowed" : "bg-yellow-600"}`}
              >
                {loading ? "Processing..." : "Compress"}
              </button>
            </div>
          </div>

          {/* Preview section */}
          <div className="py-2 px-5 rounded flex flex-col w-[80%] bg-gray-600 items-center gap-3">
            <h1 className='text-3xl md:text-5xl font-bold text-white'>Preview</h1>
            {filesData.map((e, idx) => {
              const beforeSize = e.size || 0;
              const afterSize = e.originalExtCompressFile?.sizeKB ? (e.originalExtCompressFile.sizeKB / 1024).toFixed(2) : beforeSize;
              return (
                <div key={idx} className="bg-white rounded px-5 py-2 flex flex-col md:flex-row md:justify-between justify-center items-center gap-5 w-full">
                  <div className='flex flex-wrap gap-2 items-center justify-center'>
                    <img src={e.url} alt="image" className='w-30 h-20 object-cover rounded' />
                    <div>
                      <h1><span className='font-bold'>Before-Size:</span> {beforeSize} MB</h1>
                      <h1><span className='font-bold'>After-Size:</span> {afterSize} MB</h1>
                    </div>
                  </div>

                  <div className='flex gap-5'>
                    <a href={e.originalExtCompressFile?.downloadURL} download className='bg-blue-500 text-white px-3 py-2 h-10 rounded flex items-center justify-center'>{e.file.type.split("/")[1]}</a>
                    {e.customExtCompressFile?.ext && (
                      <a href={e.customExtCompressFile?.downloadURL} download className='bg-green-500 text-white px-3 py-2 h-10 rounded flex items-center justify-center'>
                        {e.customExtCompressFile.ext}
                      </a>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </main>
    </>
  );
};

export default App;