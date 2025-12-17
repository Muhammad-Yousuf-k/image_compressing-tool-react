import React, { useEffect, useRef, useState } from 'react'
import Nav from './components/nav'
import backG from './assets/images/001-backG.jpg'

const App = () => {

  const dropzone = useRef(null)
  const fileInput = useRef(null)
  const previewContainer = useRef(null)
  const [filesData, setFilesData] = useState([])
  const [filesList, setFilesList] = useState([])
  const [cusExt, setCusExt] = useState("")
  const [trigeredError, setTrigeredError] = useState(null)

  async function deleteJunk() {
    const res = await fetch("http://localhost:3000/deleteAllJunk", {
      method: "GET",
    });

    const data = await res.json();
    console.log("server data", data);

  }


  useEffect(() => {

    setTimeout(() => {
      setTrigeredError(null)
    }, 3000)

  }, [trigeredError])


  useEffect(() => {

    deleteJunk()

  }, [])



  // Handle click on dropzone to trigger hidden file input
  const handleDropzoneClick = () => {
    fileInput.current.click()
  }
  const handleFileInput = (e) => {
    e.preventDefault()
    handleFiles(e.target.files)

  }
  // Handle drag-and-drop
  const handleDrop = (e) => {
    e.preventDefault()
    handleFiles(e.dataTransfer.files)
  }

  const handleDragOver = (e) => {
    e.preventDefault() // Needed to allow drop
  }

  function handleFiles(files) {
    if (!files || files.length === 0) return
    const filesLists = Array.from(files).filter(f => f.type.startsWith("image/"))

    setFilesList(filesLists)

    // Read files and create preview URLs
    const filePreviews = filesLists.map(file => {
      const url = URL.createObjectURL(file)
      let size = file.size / (1024 * 1024)
      return { file, url, size: size.toFixed(2) }
    })

    setFilesData(prev => [...prev, ...filePreviews])
  }



  async function uploadImages(filesList) {
    if (filesList.length === 0) {
      setTrigeredError("Please upload images first");
      return;
    }
    setTrigeredError("loading")

    const formData = new FormData();
    filesList.forEach((file, index) => {
      const fileType = file.type;               // e.g., "image/jpeg"
      formData.append("image", file, file.name);     // file itself
      formData.append(`type_${index}`, fileType);    // extra field for MIME type
      formData.append("cusExt", cusExt);    // extra field for MIME type
    });

    try {
      const res = await fetch("http://localhost:3000/api/upload", {
        method: "POST",
        body: formData
      });

      const data = await res.json();
      if (data) {
        setTrigeredError("processing complete")
      }


      console.log("server data", data);


      // Update filesData with original and custom processed files
      setFilesData(prevData => {
        return prevData.map(file => {
          const processed = data.processedFiles.find(
            p => p.originalFile.originalName === file.file.name
          );

          // If no processed data, leave file unchanged
          if (!processed) {
            console.warn(`No processed data found for file: ${file.file.name}`);
            return file;
          }

          return {
            ...file,
            originalFile: {
              path: processed.originalFile.path,
              sizeKB: processed.originalFile.sizeKB,
              ext: processed.originalFile.ext,
              downloadURL: `http://localhost:3000/download?file=${encodeURIComponent(processed.originalFile.path)}`
            },
            customExtCompressFile: processed.customExtCompressFile
              ? {
                path: processed.customExtCompressFile.path,
                sizeKB: processed.customExtCompressFile.sizeKB,
                ext: processed.customExtCompressFile.ext,
                downloadURL: `http://localhost:3000/download?file=${encodeURIComponent(processed.customExtCompressFile.path)}`
              }
              : null, // <--- safe fallback
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
      console.error("Upload error:", err);
    }
  }



  return (
    <>
      {console.log(trigeredError)}


      {trigeredError && trigeredError !== "null" && (
        <div className={`notification absolute bottom-10  right-10 bg-white text-xl h-15 w-100 rounded flex items-center px-5 z-50 `}>{trigeredError}</div>

      )}
      <Nav />
      <main className='pt-10 relative '>
        <div className=" absolute inset-0 w-full h-[90vh] z-0">
          <img src={backG} alt="" className='w-full h-full object-cover' />
        </div>
        <div className='relative  flex flex-col gap-5 justify-center items-center w-screen z-20 '>

          {/* DropZone */}
          <div className='backdrop-blur flex flex-col gap-5 justify-center p-5 rounded-2xl  w-1/2'>
            <div ref={dropzone} onClick={handleDropzoneClick} onDrop={handleDrop} onDragOver={handleDragOver}
              className="  border-2 border-white border-dashed w150 w-full h-80 rounded flex flex-col items-center justify-between p-10">
              <h1 className='text-2xl text-white font-bold'>Upload Images</h1>
              <input onChange={handleFileInput} ref={fileInput} accept="image/*" type="file" className='border hidden' multiple />
              <p className='text-xl text-center text-white'>Drop Your Images or click to add images</p>
            </div>
            <div className='bg-gray-600 rounded flex items-center justify-center h-15 w-full gap-10'>
              <button onClick={() => { setCusExt("avif") }} className={`px-3 py-1 rounded text-white active:scale-95 ${cusExt === "avif" ? "bg-green-600" : "bg-red-400"}`}>AVIF</button>
              <button onClick={() => { setCusExt("jpeg") }} className={`px-3 py-1 rounded text-white active:scale-95 ${cusExt === "jpeg" ? "bg-green-600" : "bg-red-400"}`}>JPEG</button>
              <button onClick={() => { setCusExt("png") }} className={`px-3 py-1 rounded text-white active:scale-95 ${cusExt === "png" ? "bg-green-600" : "bg-red-400"}`}>PNG</button>
              <button onClick={() => { setCusExt("webp") }} className={`px-3 py-1 rounded text-white active:scale-95 ${cusExt === "webp" ? "bg-green-600" : "bg-red-400"}`}>WEBP</button>
              <button onClick={() => { uploadImages(filesList) }} className='text-white bg-yellow-600 px-3 py-1 rounded active:scale-95'>Compress</button>
            </div>
          </div>

          {/* preview */}
          <div className=" py-2 px-5 rounded flex flex-col w-1/2 bg-gray-600 items-center gap-3 ">
            <h1 className='text-5xl font-bold text-white'>Preview</h1>
            {filesData.map((e, idx) => {
              const beforeSize = e.sizeBeforeKB ? e.sizeBeforeKB : e.size; // MB
              const afterSize = e.originalExtCompressFile?.sizeKB
                ? (e.originalExtCompressFile.sizeKB / 1024).toFixed(2)
                : beforeSize;




              return <div key={idx} ref={previewContainer} className="border bg-white rounded px-5 py-2 flex justify-between items-center w-full">
                <div className='flex gap-2 items-center'>
                  <img src={e.url} alt="image" className='w-30 h-20 object-cover rounded' />
                  <div>
                    <h1 className=''><span className='font-bold'>Name:</span> {e.file.name}</h1>
                    <h1 className=''><span className='font-bold'>Before-Size:</span> {beforeSize} MB </h1>
                    <h1 className=''><span className='font-bold'>After-Size:</span> {afterSize} MB </h1>
                  </div>
                </div>
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