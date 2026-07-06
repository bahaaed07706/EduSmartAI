// src/components/UI/FileUploadInput.jsx
import React, { useRef, useState } from "react";
import fileApi from "../../api/fileApi";
import Button from "./Button";

const getFileLabel = (value) => {
  if (!value) return "";
  try {
    const url = new URL(value, window.location.origin);
    const last = url.pathname.split("/").filter(Boolean).pop();
    return last || value;
  } catch {
    const last = value.split("/").filter(Boolean).pop();
    return last || value;
  }
};

const FileUploadInput = ({
  label = "File",
  helperText = "Drag & drop a file here, or click to browse.",
  value, // current URL
  onChange,
  disabled = false,
  accept,
}) => {
  const inputRef = useRef(null);
  const [isDragging, setIsDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");

  const handleBrowseClick = () => {
    if (!disabled && inputRef.current) {
      inputRef.current.click();
    }
  };

  const handleFileSelected = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    await uploadFile(file);
    event.target.value = "";
  };

  const handleDrop = async (event) => {
    event.preventDefault();
    event.stopPropagation();
    setIsDragging(false);
    if (disabled) return;
    const file = event.dataTransfer.files?.[0];
    if (!file) return;
    await uploadFile(file);
  };

  const uploadFile = async (file) => {
    setError("");
    setUploading(true);
    try {
      const res = await fileApi.upload(file);
      if (onChange) onChange(res.url);
    } catch (err) {
      console.error("Upload failed", err);
      const msg =
        err?.response?.data?.detail ||
        err?.message ||
        "Failed to upload file.";
      setError(String(msg));
    } finally {
      setUploading(false);
    }
  };

  const handleDragOver = (event) => {
    event.preventDefault();
    event.stopPropagation();
    if (!disabled) {
      setIsDragging(true);
    }
  };

  const handleDragLeave = (event) => {
    event.preventDefault();
    event.stopPropagation();
    setIsDragging(false);
  };

  const currentFileLabel = getFileLabel(value);

  return (
    <div className="space-y-1.5">
      {label && (
        <label className="block text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">
          {label}
        </label>
      )}

      <div
        className={`flex flex-col items-center justify-center rounded-2xl border-2 border-dashed px-3 py-4 text-xs transition ${
          isDragging
            ? "border-primary bg-primary/5"
            : "border-slate-200 bg-slate-50/60 hover:border-primary/60 hover:bg-slate-50"
        } ${disabled ? "opacity-60 cursor-not-allowed" : "cursor-pointer"}`}
        onClick={handleBrowseClick}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
      >
        <input
          ref={inputRef}
          type="file"
          className="hidden"
          onChange={handleFileSelected}
          disabled={disabled || uploading}
          accept={accept}
        />

        <div className="text-center">
          <p className="text-[11px] text-slate-600">{helperText}</p>
          <p className="mt-1 text-[11px] text-slate-400">
            {uploading
              ? "Uploading..."
              : "Supported: PDF, Word, PPT, images, ZIP"}
          </p>

          <Button
            type="button"
            size="sm"
            variant="outline"
            className="mt-2"
            disabled={disabled || uploading}
          >
            {uploading ? "Uploading..." : "Browse files"}
          </Button>
        </div>

        {currentFileLabel && (
          <div className="mt-3 text-[11px] text-slate-600">
            <span className="font-medium">Current file:</span>{" "}
            <a
              href={value}
              target="_blank"
              rel="noreferrer"
              className="underline text-primary break-all"
            >
              {currentFileLabel}
            </a>
          </div>
        )}
      </div>

      {error && (
        <p className="text-[11px] text-rose-600 bg-rose-50 border border-rose-200 rounded px-2 py-1">
          {error}
        </p>
      )}
    </div>
  );
};

export default FileUploadInput;
