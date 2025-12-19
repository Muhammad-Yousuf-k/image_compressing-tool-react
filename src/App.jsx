import React, { useEffect, useRef, useState } from 'react'
import Nav from './components/nav'
import NotificationBar from './components/notificationBar'
import backG from './assets/images/001-backG.webp'

const App = () => {

  // ------------------- Refs -------------------
  const dropzone = useRef(null) // ref for dropzone div
  const fileInput = useRef(null) // ref for hidden file input
  const previewContainer = useRef(null) // ref for preview container div

  // ------------------- State -------------------
  const [filesData, setFilesData] = useState([]) // array of files with preview info
  const [filesList, setFilesList] = useState([]) // raw file list for upload
  const [cusExt, setCusExt] = useState("") // selected custom extension
  const [uiStatus, setUiStatus] = useState({ loading: false, error: null, success: null }) // loading/error/success for notification

  // ------------------- Delete junk files on server -------------------
  async function deleteJunk() {
    const res = await fetch("http://localhost:3000/deleteAllJunk", {
      method: "GET",
    });
    // const data = await res.json();
  }

  // ------------------- Auto-dismiss notifications -------------------
  useEffect(() => {
    if (uiStatus.error || uiStatus.success) {
      const timer = setTimeout(() => {
        // clear error or success after 3 seconds
        setUiStatus(prev => ({ ...prev, error: null, success: null }));
      }, 3000);

      return () => clearTimeout(timer);
    }
  }, [uiStatus.error, uiStatus.success]);

  // ------------------- Run deleteJunk once on mount -------------------
  useEffect(() => {
    deleteJunk()
  }, [])

  // ------------------- Dropzone click triggers hidden file input -------------------
  const handleDropzoneClick = () => {
    fileInput.current.click()
  }

  // ------------------- Handle file input selection -------------------
  const handleFileInput = (e) => {
    e.preventDefault()
    handleFiles(e.target.files)
  }

  // ------------------- Handle drag-and-drop -------------------
  const handleDrop = (e) => {
    e.preventDefault()
    handleFiles(e.dataTransfer.files)
  }

  const handleDragOver = (e) => {
    e.preventDefault() // needed to allow drop
  }

  // ------------------- Process selected files -------------------
  function handleFiles(files) {
    if (!files || files.length === 0) return

    // filter only image files
    const filesLists = Array.from(files).filter(f => f.type.startsWith("image/"))

    setFilesList(filesLists)

    // create preview URLs
    const filePreviews = filesLists.map(file => {
      const url = URL.createObjectURL(file) // preview URL
      let size = file.size / (1024 * 1024) // size in MB
      return { file, url, size: size.toFixed(2) }
    })

    // add new previews to state
    setFilesData(prev => [...prev, ...filePreviews])
  }

  // ------------------- Upload images to server -------------------
  async function uploadImages(filesList) {
    if (filesList.length === 0) {
      // show error if no files selected
      setUiStatus({ loading: false, error: "upload image first", success: null });
      return;
    }

    setUiStatus({ loading: true, error: null, success: null }); // show loading

    const formData = new FormData();
    filesList.forEach((file, index) => {
      const fileType = file.type; // e.g., "image/jpeg"
      formData.append("image", file, file.name); // file itself
      formData.append(`type_${index}`, fileType); // MIME type
      formData.append("cusExt", cusExt); // custom extension
    });

    try {
      const res = await fetch("http://localhost:3000/api/upload", {
        method: "POST",
        body: formData
      });

      const data = await res.json();

      // show success notification
      setUiStatus({ loading: false, error: null, success: "Images processed successfully" });

      // ------------------- Update filesData with processed files -------------------
      setFilesData(prevData => {
        return prevData.map(file => {
          const processed = data.processedFiles.find(
            p => p.originalFile.originalName === file.file.name
          );

          if (!processed) {
            console.warn(`No processed data found for file: ${file.file.name}`);
            return file;
          }

          return {
            ...file,
            // original file info
            originalFile: {
              path: processed.originalFile.path,
              sizeKB: processed.originalFile.sizeKB,
              ext: processed.originalFile.ext,
              downloadURL: `http://localhost:3000/download?file=${encodeURIComponent(processed.originalFile.path)}`
            },
            // custom extension compressed file info
            customExtCompressFile: processed.customExtCompressFile
              ? {
                path: processed.customExtCompressFile.path,
                sizeKB: processed.customExtCompressFile.sizeKB,
                ext: processed.customExtCompressFile.ext,
                downloadURL: `http://localhost:3000/download?file=${encodeURIComponent(processed.customExtCompressFile.path)}`
              }
              : null,
            // original extension compressed file info
            originalExtCompressFile: {
              path: processed.originalExtCompressFile.path,
              sizeKB: processed.originalExtCompressFile.sizeKB,
              ext: processed.originalExtCompressFile.ext,
              downloadURL: `http://localhost:3000/download?file=${encodeURIComponent(processed.originalExtCompressFile.path)}`
            }
          };
        });
      });

    } catch (err) {
      // show error if upload fails
      setUiStatus({ loading: false, error: err.message, success: null });
    }
  }

  // ------------------- JSX -------------------
  return (
    <>
      {/* Notification bar */}
      <NotificationBar uiStatus={uiStatus} />

      {/* Navbar */}
      <Nav />

      <main className='pt-10 relative min-h-screen '>
        {/* Background image */}
        <div className="absolute inset-0 w-full h-full z-0">
          <img src={backG} alt="" className='w-full h-full object-cover' />
        </div>

        <div className='relative flex flex-col gap-5 justify-center items-center w-screen z-20 '>

          {/* DropZone */}
          <div className='backdrop-blur flex flex-col gap-5 justify-center p-5 rounded-2xl w-[90%] md:w-1/2'>
            <div ref={dropzone} onClick={handleDropzoneClick} onDrop={handleDrop} onDragOver={handleDragOver}
              className="border-2 border-white border-dashed w150 w-full h-80 rounded flex flex-col items-center justify-between p-10">
              <h1 className='text-2xl text-white font-bold'>Upload Images</h1>
              {/* Hidden file input */}
              <input onChange={handleFileInput} ref={fileInput} accept="image/*" type="file" className='border hidden' multiple />
              <p className='text-xl text-center text-white'>Drop Your Images or click to add images</p>
            </div>

            {/* Extension selection & compress button */}
            <div className='bg-gray-600 rounded flex flex-wrap items-center justify-center h15 py-3 w-full gap-10'>
              <button onClick={() => { setCusExt("avif") }} className={`px-3 py-1 rounded text-white active:scale-95 ${cusExt === "avif" ? "bg-green-600" : "bg-[#2B7FFF]"}`}>AVIF</button>
              <button onClick={() => { setCusExt("jpeg") }} className={`px-3 py-1 rounded text-white active:scale-95 ${cusExt === "jpeg" ? "bg-green-600" : "bg-[#2B7FFF]"}`}>JPEG</button>
              <button onClick={() => { setCusExt("png") }} className={`px-3 py-1 rounded text-white active:scale-95 ${cusExt === "png" ? "bg-green-600" : "bg-[#2B7FFF]"}`}>PNG</button>
              <button onClick={() => { setCusExt("webp") }} className={`px-3 py-1 rounded text-white active:scale-95 ${cusExt === "webp" ? "bg-green-600" : "bg-[#2B7FFF]"}`}>WEBP</button>
              <button onClick={() => uploadImages(filesList)} disabled={uiStatus.loading} className={`px-3 py-1 text-white rounded ${uiStatus.loading ? "bg-gray-400 cursor-not-allowed" : "bg-yellow-600"}`}>{uiStatus.loading ? "Processing..." : "Compress"}</button>
            </div>
          </div>

          {/* Preview section */}
          <div className="py-2 px-5 rounded flex flex-col w1/2 w-[80%] bg-gray-600 items-center gap-3 ">
            <h1 className='text-5xl font-bold text-white'>Preview</h1>

            {filesData.map((e, idx) => {
              const beforeSize = e.sizeBeforeKB ? e.sizeBeforeKB : e.size; // MB
              const afterSize = e.originalExtCompressFile?.sizeKB
                ? (e.originalExtCompressFile.sizeKB / 1024).toFixed(2)
                : beforeSize;

              return <div key={idx} ref={previewContainer} className="bg-white rounded px-5 py-2 flex flex-col md:flex-row md:justify-between justify-center items-center gap-5 w-full">
                {/* Image preview and info */}
                <div className='flex flex-wrap gap-2 items-center justify-center '>
                  <img src={e.url} alt="image" className='w-30 h-20 object-cover rounded' />
                  <div className=''>
                    <h1 className=''><span className='font-bold'>Before-Size:</span> {beforeSize} MB </h1>
                    <h1 className=''><span className='font-bold'>After-Size:</span> {afterSize} MB </h1>
                  </div>
                </div>

                {/* Download buttons */}
                <div className='flex gap-5'>
                  <a href={e.originalExtCompressFile?.downloadURL} download className='bg-blue-500 text-white px-3 py-2 h-10 rounded flex items-center justify-center'>{e.file.type.split("/")[1]}</a>
                  {e.customExtCompressFile?.ext && e.customExtCompressFile.ext !== "null" && (
                    <a href={e.customExtCompressFile?.downloadURL} className='bg-green-500 text-white px-3 py-2 h-10 rounded flex items-center justify-center'>
                      {e.customExtCompressFile.ext}
                    </a>
                  )}
                </div>
              </div>
            })}
          </div>

        </div>

      </main>

    </>
  )
}

export default App
