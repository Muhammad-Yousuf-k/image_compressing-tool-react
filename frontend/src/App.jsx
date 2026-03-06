import React, { useEffect, useRef, useState, useCallback } from 'react';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

// ─── Constants ────────────────────────────────────────────────────────────────
const API_BASE = import.meta.env.VITE_API_BASE || "http://localhost:3000";
const ALLOWED_MIME_TYPES = ["image/jpeg", "image/png", "image/webp", "image/avif"];
const MAX_FILE_SIZE_MB = 5;
const EXTENSIONS = ["avif", "jpeg", "png", "webp"];

// ─── Helpers ──────────────────────────────────────────────────────────────────
const toMB = (bytes) => (bytes / (1024 * 1024)).toFixed(2);
const toMBfromKB = (kb) => (kb / 1024).toFixed(2);

async function deleteJunk() {
  try {
    await fetch(`${API_BASE}/images/deleteAllJunk`, {
      method: "DELETE",
      headers: { "x-admin-secret": import.meta.env.VITE_ADMIN_SECRET || "" }
    });
  } catch (err) {
    console.error("Delete junk failed:", err);
  }
}

function validateFile(file) {
  if (!ALLOWED_MIME_TYPES.includes(file.type)) {
    return `"${file.name}" is not a supported image type.`;
  }
  if (file.size > MAX_FILE_SIZE_MB * 1024 * 1024) {
    return `"${file.name}" exceeds the ${MAX_FILE_SIZE_MB}MB size limit.`;
  }
  return null;
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function DropZone({ onFiles, disabled }) {
  const dropRef = useRef(null);
  const inputRef = useRef(null);
  const [dragging, setDragging] = useState(false);

  const handleFiles = useCallback((rawFiles) => {
    const files = Array.from(rawFiles);
    onFiles(files);
  }, [onFiles]);

  const onDrop = (e) => {
    e.preventDefault();
    setDragging(false);
    handleFiles(e.dataTransfer.files);
  };

  const onDragOver = (e) => { e.preventDefault(); setDragging(true); };
  const onDragLeave = () => setDragging(false);
  const onInputChange = (e) => { e.preventDefault(); handleFiles(e.target.files); };

  return (
    <div
      ref={dropRef}
      onClick={() => !disabled && inputRef.current.click()}
      onDrop={onDrop}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      style={{
        border: `2px dashed ${dragging ? "#f5c518" : "rgba(255,255,255,0.35)"}`,
        borderRadius: "12px",
        padding: "48px 24px",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: "16px",
        cursor: disabled ? "not-allowed" : "pointer",
        background: dragging ? "rgba(245,197,24,0.06)" : "rgba(255,255,255,0.04)",
        transition: "all 0.2s ease",
        userSelect: "none",
        opacity: disabled ? 0.5 : 1,
      }}
    >
      <UploadIcon size={44} color={dragging ? "#f5c518" : "rgba(255,255,255,0.5)"} />
      <div style={{ textAlign: "center" }}>
        <p style={{ color: "#fff", fontSize: "1.05rem", fontWeight: 600, margin: 0 }}>
          Drop images here or <span style={{ color: "#f5c518" }}>browse</span>
        </p>
        <p style={{ color: "rgba(255,255,255,0.45)", fontSize: "0.8rem", marginTop: "6px" }}>
          JPG · PNG · WEBP · AVIF &nbsp;·&nbsp; Max {MAX_FILE_SIZE_MB}MB per file
        </p>
      </div>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        multiple
        style={{ display: "none" }}
        onChange={onInputChange}
        disabled={disabled}
      />
    </div>
  );
}

function ExtensionPicker({ value, onChange }) {
  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: "8px", alignItems: "center" }}>
      <span style={{ color: "rgba(255,255,255,0.55)", fontSize: "0.78rem", letterSpacing: "0.08em", textTransform: "uppercase", marginRight: "4px" }}>
        Convert to
      </span>
      {EXTENSIONS.map(ext => (
        <button
          key={ext}
          onClick={() => onChange(value === ext ? "" : ext)}
          style={{
            padding: "5px 14px",
            borderRadius: "6px",
            border: "none",
            fontFamily: "'DM Mono', monospace",
            fontSize: "0.78rem",
            fontWeight: 600,
            letterSpacing: "0.06em",
            cursor: "pointer",
            transition: "all 0.15s ease",
            background: value === ext ? "#f5c518" : "rgba(255,255,255,0.1)",
            color: value === ext ? "#111" : "rgba(255,255,255,0.75)",
            transform: value === ext ? "scale(1.05)" : "scale(1)",
          }}
        >
          {ext.toUpperCase()}
        </button>
      ))}
      {value && (
        <span style={{ color: "rgba(255,255,255,0.35)", fontSize: "0.75rem", marginLeft: "4px" }}>
          ✓ active
        </span>
      )}
    </div>
  );
}

function FileCard({ item, index, onRemove }) {
  const before = item.size ? `${item.size} MB` : "—";
  const afterKB = item.originalExtCompressFile?.sizeKB;
  const after = afterKB ? `${toMBfromKB(afterKB)} MB` : null;
  const saved = afterKB && item.size
    ? Math.max(0, (100 - (afterKB / 1024 / parseFloat(item.size)) * 100)).toFixed(0)
    : null;

  return (
    <div
      style={{
        background: "rgba(255,255,255,0.05)",
        border: "1px solid rgba(255,255,255,0.1)",
        borderRadius: "12px",
        padding: "14px 18px",
        display: "flex",
        flexWrap: "wrap",
        alignItems: "center",
        gap: "16px",
        animation: "fadeSlideIn 0.3s ease both",
        animationDelay: `${index * 0.05}s`,
      }}
    >
      {/* Thumbnail */}
      <img
        src={item.url}
        alt={item.file.name}
        style={{
          width: "72px",
          height: "56px",
          objectFit: "cover",
          borderRadius: "8px",
          flexShrink: 0,
          border: "1px solid rgba(255,255,255,0.12)",
        }}
      />

      {/* Info */}
      <div style={{ flex: 1, minWidth: "140px" }}>
        <p style={{
          color: "#fff",
          fontWeight: 600,
          fontSize: "0.85rem",
          margin: 0,
          whiteSpace: "nowrap",
          overflow: "hidden",
          textOverflow: "ellipsis",
          maxWidth: "220px",
        }}>
          {item.file.name}
        </p>
        <div style={{ display: "flex", gap: "12px", marginTop: "6px", flexWrap: "wrap" }}>
          <SizeBadge label="Before" value={before} />
          {after && <SizeBadge label="After" value={after} accent />}
          {saved && (
            <span style={{
              background: "rgba(80,200,120,0.15)",
              color: "#50c878",
              fontSize: "0.72rem",
              fontWeight: 700,
              padding: "2px 8px",
              borderRadius: "999px",
              letterSpacing: "0.04em",
            }}>
              −{saved}%
            </span>
          )}
        </div>
      </div>

      {/* Download buttons */}
      <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", marginLeft: "auto" }}>
        {item.originalExtCompressFile?.downloadURL && (
          <DownloadBtn
            href={item.originalExtCompressFile.downloadURL}
            label={`.${item.originalExtCompressFile.ext}`}
            color="#3b82f6"
          />
        )}
        {item.customExtCompressFile?.downloadURL && (
          <DownloadBtn
            href={item.customExtCompressFile.downloadURL}
            label={`.${item.customExtCompressFile.ext}`}
            color="#f5c518"
            dark
          />
        )}
      </div>

      {/* Remove */}
      {!item.originalExtCompressFile && (
        <button
          onClick={() => onRemove(index)}
          title="Remove"
          style={{
            background: "none",
            border: "none",
            color: "rgba(255,255,255,0.3)",
            cursor: "pointer",
            fontSize: "1rem",
            lineHeight: 1,
            padding: "4px",
            transition: "color 0.15s",
          }}
          onMouseEnter={e => e.currentTarget.style.color = "#ef4444"}
          onMouseLeave={e => e.currentTarget.style.color = "rgba(255,255,255,0.3)"}
        >
          ✕
        </button>
      )}
    </div>
  );
}

function SizeBadge({ label, value, accent }) {
  return (
    <span style={{ color: accent ? "#f5c518" : "rgba(255,255,255,0.45)", fontSize: "0.75rem" }}>
      <span style={{ fontWeight: 600, color: accent ? "#f5c518" : "rgba(255,255,255,0.6)" }}>{label}: </span>
      {value}
    </span>
  );
}

function DownloadBtn({ href, label, color, dark }) {
  return (
    <a
      href={href}
      download
      style={{
        background: color,
        color: dark ? "#111" : "#fff",
        padding: "6px 14px",
        borderRadius: "7px",
        fontSize: "0.75rem",
        fontWeight: 700,
        textDecoration: "none",
        fontFamily: "'DM Mono', monospace",
        letterSpacing: "0.04em",
        transition: "opacity 0.15s",
        display: "inline-flex",
        alignItems: "center",
      }}
      onMouseEnter={e => e.currentTarget.style.opacity = "0.8"}
      onMouseLeave={e => e.currentTarget.style.opacity = "1"}
    >
      ↓ {label}
    </a>
  );
}

function UploadIcon({ size, color }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="16 16 12 12 8 16" />
      <line x1="12" y1="12" x2="12" y2="21" />
      <path d="M20.39 18.39A5 5 0 0 0 18 9h-1.26A8 8 0 1 0 3 16.3" />
    </svg>
  );
}

function Spinner() {
  return (
    <span style={{
      display: "inline-block",
      width: "14px",
      height: "14px",
      border: "2px solid rgba(0,0,0,0.3)",
      borderTopColor: "#111",
      borderRadius: "50%",
      animation: "spin 0.7s linear infinite",
      verticalAlign: "middle",
      marginRight: "8px",
    }} />
  );
}

// ─── Main App ─────────────────────────────────────────────────────────────────

const App = () => {
  const [filesData, setFilesData] = useState([]);
  const [filesList, setFilesList] = useState([]);
  const [cusExt, setCusExt] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => { deleteJunk(); }, []);

  // Revoke object URLs on unmount to avoid memory leaks
  useEffect(() => {
    return () => filesData.forEach(f => URL.revokeObjectURL(f.url));
  }, [filesData]);

  function handleFiles(rawFiles) {
    const valid = [];
    const newPreviews = [];

    for (const file of rawFiles) {
      const error = validateFile(file);
      if (error) {
        toast.error(error);
        continue;
      }
      valid.push(file);
      newPreviews.push({
        file,
        url: URL.createObjectURL(file),
        size: toMB(file.size),
      });
    }

    if (!valid.length) return;
    setFilesList(prev => [...prev, ...valid]);
    setFilesData(prev => [...prev, ...newPreviews]);
  }

  function removeFile(index) {
    URL.revokeObjectURL(filesData[index].url);
    setFilesData(prev => prev.filter((_, i) => i !== index));
    setFilesList(prev => prev.filter((_, i) => i !== index));
  }

  async function uploadImages() {
    if (!filesList.length) {
      toast.error("Add at least one image before compressing.");
      return;
    }

    setLoading(true);

    const formData = new FormData();
    filesList.forEach((file, index) => {
      formData.append("image", file, file.name);
      formData.append(`type_${index}`, file.type);
    });
    if (cusExt) formData.append("cusExt", cusExt);

    try {
      const res = await fetch(`${API_BASE}/images/upload`, { method: "POST", body: formData });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || `Server error ${res.status}`);
      }

      const data = await res.json();
      toast.success("Images compressed successfully!");

      setFilesData(prev => prev.map(item => {
        const processed = data.processedFiles.find(
          p => p.originalFile.originalName === item.file.name
        );
        if (!processed) return item;

        return {
          ...item,
          originalFile: {
            ...processed.originalFile,
            downloadURL: `${API_BASE}/images/download?file=${encodeURIComponent(processed.originalFile.path)}`
          },
          originalExtCompressFile: processed.originalExtCompressFile
            ? {
                ...processed.originalExtCompressFile,
                downloadURL: `${API_BASE}/images/download?file=${encodeURIComponent(processed.originalExtCompressFile.path)}`
              }
            : null,
          customExtCompressFile: processed.customExtCompressFile
            ? {
                ...processed.customExtCompressFile,
                downloadURL: `${API_BASE}/images/download?file=${encodeURIComponent(processed.customExtCompressFile.path)}`
              }
            : null,
        };
      }));
    } catch (err) {
      toast.error(`Upload failed: ${err.message}`);
    } finally {
      setLoading(false);
    }
  }

  const hasResults = filesData.some(f => f.originalExtCompressFile);

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Syne:wght@700;800&family=DM+Mono:wght@400;500&family=DM+Sans:wght@400;500;600&display=swap');

        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

        body {
          background: #0d0d0d;
          color: #fff;
          font-family: 'DM Sans', sans-serif;
          min-height: 100vh;
        }

        @keyframes fadeSlideIn {
          from { opacity: 0; transform: translateY(10px); }
          to   { opacity: 1; transform: translateY(0); }
        }

        @keyframes spin {
          to { transform: rotate(360deg); }
        }

        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50%       { opacity: 0.5; }
        }

        ::-webkit-scrollbar { width: 6px; }
        ::-webkit-scrollbar-track { background: #111; }
        ::-webkit-scrollbar-thumb { background: #333; border-radius: 99px; }
      `}</style>

      <ToastContainer
        position="top-right"
        autoClose={3500}
        hideProgressBar={false}
        theme="dark"
        toastStyle={{ fontFamily: "'DM Sans', sans-serif", fontSize: "0.875rem" }}
      />

      {/* Background grid */}
      <div style={{
        position: "fixed",
        inset: 0,
        backgroundImage: `
          linear-gradient(rgba(255,255,255,0.025) 1px, transparent 1px),
          linear-gradient(90deg, rgba(255,255,255,0.025) 1px, transparent 1px)
        `,
        backgroundSize: "40px 40px",
        pointerEvents: "none",
        zIndex: 0,
      }} />

      {/* Glow */}
      <div style={{
        position: "fixed",
        top: "-200px",
        left: "50%",
        transform: "translateX(-50%)",
        width: "700px",
        height: "500px",
        background: "radial-gradient(ellipse, rgba(245,197,24,0.08) 0%, transparent 70%)",
        pointerEvents: "none",
        zIndex: 0,
      }} />

      <div style={{ position: "relative", zIndex: 1, maxWidth: "720px", margin: "0 auto", padding: "0 20px 80px" }}>

        {/* Header */}
        <header style={{ padding: "52px 0 40px", textAlign: "center", animation: "fadeSlideIn 0.5s ease both" }}>
          <div style={{
            display: "inline-block",
            background: "rgba(245,197,24,0.12)",
            border: "1px solid rgba(245,197,24,0.25)",
            borderRadius: "999px",
            padding: "4px 14px",
            fontSize: "0.7rem",
            fontFamily: "'DM Mono', monospace",
            letterSpacing: "0.12em",
            color: "#f5c518",
            marginBottom: "18px",
            textTransform: "uppercase",
          }}>
            Image Compressor
          </div>
          <h1 style={{
            fontFamily: "'Syne', sans-serif",
            fontSize: "clamp(2rem, 5vw, 3rem)",
            fontWeight: 800,
            letterSpacing: "-0.02em",
            lineHeight: 1.1,
            color: "#fff",
          }}>
            Compress Without<br />
            <span style={{ color: "#f5c518" }}>Losing Quality</span>
          </h1>
          <p style={{ color: "rgba(255,255,255,0.45)", marginTop: "14px", fontSize: "0.9rem", lineHeight: 1.6 }}>
            Drop your images, pick a format, and download in seconds.
          </p>
        </header>

        {/* Upload card */}
        <div
          style={{
            background: "rgba(255,255,255,0.04)",
            border: "1px solid rgba(255,255,255,0.08)",
            borderRadius: "16px",
            padding: "24px",
            display: "flex",
            flexDirection: "column",
            gap: "20px",
            animation: "fadeSlideIn 0.5s ease 0.1s both",
          }}
        >
          <DropZone onFiles={handleFiles} disabled={loading} />

          <div style={{
            display: "flex",
            flexWrap: "wrap",
            alignItems: "center",
            justifyContent: "space-between",
            gap: "16px",
          }}>
            <ExtensionPicker value={cusExt} onChange={setCusExt} />

            <button
              onClick={uploadImages}
              disabled={loading || !filesList.length}
              style={{
                background: loading || !filesList.length ? "rgba(255,255,255,0.08)" : "#f5c518",
                color: loading || !filesList.length ? "rgba(255,255,255,0.3)" : "#111",
                border: "none",
                borderRadius: "8px",
                padding: "9px 24px",
                fontFamily: "'DM Sans', sans-serif",
                fontSize: "0.875rem",
                fontWeight: 700,
                cursor: loading || !filesList.length ? "not-allowed" : "pointer",
                transition: "all 0.2s ease",
                display: "flex",
                alignItems: "center",
                whiteSpace: "nowrap",
              }}
            >
              {loading && <Spinner />}
              {loading ? "Compressing…" : "Compress Images"}
            </button>
          </div>
        </div>

        {/* File list */}
        {filesData.length > 0 && (
          <div style={{ marginTop: "28px", display: "flex", flexDirection: "column", gap: "10px" }}>
            <div style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: "4px",
            }}>
              <h2 style={{
                fontFamily: "'Syne', sans-serif",
                fontSize: "1rem",
                fontWeight: 700,
                color: "rgba(255,255,255,0.7)",
                letterSpacing: "0.04em",
                textTransform: "uppercase",
              }}>
                {filesData.length} {filesData.length === 1 ? "File" : "Files"}
                {hasResults && <span style={{ color: "#50c878", marginLeft: "8px", fontSize: "0.75rem" }}>· Ready</span>}
              </h2>
              <button
                onClick={() => {
                  filesData.forEach(f => URL.revokeObjectURL(f.url));
                  setFilesData([]);
                  setFilesList([]);
                }}
                style={{
                  background: "none",
                  border: "1px solid rgba(255,255,255,0.1)",
                  color: "rgba(255,255,255,0.4)",
                  fontSize: "0.75rem",
                  borderRadius: "6px",
                  padding: "4px 12px",
                  cursor: "pointer",
                  transition: "all 0.15s",
                }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = "#ef4444"; e.currentTarget.style.color = "#ef4444"; }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = "rgba(255,255,255,0.1)"; e.currentTarget.style.color = "rgba(255,255,255,0.4)"; }}
              >
                Clear all
              </button>
            </div>

            {filesData.map((item, idx) => (
              <FileCard key={idx} item={item} index={idx} onRemove={removeFile} />
            ))}
          </div>
        )}

        {/* Empty state */}
        {filesData.length === 0 && (
          <div style={{
            textAlign: "center",
            padding: "48px 0",
            color: "rgba(255,255,255,0.2)",
            fontSize: "0.85rem",
            fontFamily: "'DM Mono', monospace",
            animation: "fadeSlideIn 0.5s ease 0.2s both",
          }}>
            No images added yet.
          </div>
        )}
      </div>
    </>
  );
};

export default App;