// frontend/src/components/FileMessage.jsx
import { FaFile, FaDownload } from "react-icons/fa";

export default function FileMessage({ text }) {
  const lines = text.split("\n");
  const fileName = lines[0]?.replace("📎 **", "").replace("**", "") || "File";
  const urlMatch = text.match(/Download:\s*(https?:\/\/[^\s]+)/);
  const fileUrl = urlMatch?.[1] || null;
  
  const getFileIcon = (name) => {
    const ext = name.split('.').pop()?.toLowerCase();
    const icons = {
      pdf: '📄',
      doc: '📝',
      docx: '📝',
      txt: '📃',
      jpg: '🖼️',
      jpeg: '🖼️',
      png: '🖼️',
      gif: '🖼️',
      webp: '🖼️',
      mp4: '🎬',
      mp3: '🎵',
      zip: '📦',
      rar: '📦',
      default: '📎'
    };
    return icons[ext] || icons.default;
  };
  
  const getFileSize = (name) => {
    // You can add file size if available
    return "";
  };
  
  if (!fileUrl) {
    return <p>{text}</p>;
  }
  
  return (
    <div className="space-y-2 p-3 bg-base-100/50 rounded-xl border border-base-300">
      <div className="flex items-center gap-3">
        <div className="text-3xl">{getFileIcon(fileName)}</div>
        <div className="flex-1 min-w-0">
          <p className="font-semibold truncate">{fileName}</p>
          <p className="text-xs opacity-60">Click download to view file</p>
        </div>
      </div>
      <a
        href={fileUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="btn btn-sm btn-primary w-full gap-2"
        download
      >
        <FaDownload /> Download File
      </a>
    </div>
  );
}