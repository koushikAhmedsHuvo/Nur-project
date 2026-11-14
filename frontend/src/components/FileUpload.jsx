// frontend/src/components/FileUpload.jsx
import { useState, useRef } from "react";
import { FaImage, FaFile, FaTimes, FaUpload, FaSpinner } from "react-icons/fa";
import { uploadFile } from "../lib/api";
import toast from "react-hot-toast";

export default function FileUpload({ onFileUploaded, onCancel }) {
  const [uploading, setUploading] = useState(false);
  const [filePreview, setFilePreview] = useState(null);
  const [selectedFile, setSelectedFile] = useState(null);
  const fileInputRef = useRef(null);

  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Validate file size (10MB max)
    if (file.size > 10 * 1024 * 1024) {
      toast.error("File too large! Maximum 10MB");
      return;
    }

    setSelectedFile(file);

    // Preview for images
    if (file.type.startsWith("image/")) {
      const reader = new FileReader();
      reader.onload = (e) => setFilePreview(e.target.result);
      reader.readAsDataURL(file);
    } else {
      setFilePreview(null);
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) return;

    setUploading(true);
    try {
      const result = await uploadFile(selectedFile);
      onFileUploaded(result.file);
      toast.success("File uploaded successfully!");
    } catch (error) {
      toast.error("Failed to upload file");
    } finally {
      setUploading(false);
      setSelectedFile(null);
      setFilePreview(null);
    }
  };

  const handleCancel = () => {
    setSelectedFile(null);
    setFilePreview(null);
    if (onCancel) onCancel();
  };

  return (
    <div className="p-4 bg-base-200 rounded-xl border border-base-300">
      {/* File Input */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => fileInputRef.current?.click()}
          className="btn btn-ghost btn-sm gap-2"
          disabled={uploading}
        >
          <FaFile /> Choose File
        </button>
        <input
          ref={fileInputRef}
          type="file"
          onChange={handleFileSelect}
          className="hidden"
        />
        
        {selectedFile && (
          <button
            onClick={handleUpload}
            className="btn btn-primary btn-sm gap-2"
            disabled={uploading}
          >
            {uploading ? (
              <FaSpinner className="animate-spin" />
            ) : (
              <FaUpload />
            )}
            {uploading ? "Uploading..." : "Upload"}
          </button>
        )}
        
        <button onClick={handleCancel} className="btn btn-ghost btn-sm btn-circle">
          <FaTimes />
        </button>
      </div>

      {/* File Preview */}
      {selectedFile && (
        <div className="mt-3 p-3 bg-base-100 rounded-lg flex items-center gap-3">
          {filePreview ? (
            <img src={filePreview} alt="Preview" className="w-16 h-16 object-cover rounded-lg" />
          ) : (
            <div className="w-16 h-16 bg-base-300 rounded-lg flex items-center justify-center text-2xl">
              📄
            </div>
          )}
          <div className="flex-1 min-w-0">
            <p className="font-medium truncate">{selectedFile.name}</p>
            <p className="text-xs opacity-70">
              {(selectedFile.size / 1024).toFixed(1)} KB • {selectedFile.type.split("/")[1]?.toUpperCase() || "Unknown"}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}