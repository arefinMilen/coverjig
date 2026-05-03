"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import { useBookDesigner } from "@/context/BookDesignerContext";
import { CoverImage, PicsumImage, UploadedImage } from "@/types";

const PAGE_SIZE = 12;
const MAX_UPLOAD_BYTES = 5 * 1024 * 1024;

function getPreviewSrc(image: CoverImage, width: number, height: number) {
  if (image.isUploaded) return image.download_url;
  return `https://picsum.photos/id/${image.id}/${width}/${height}`;
}

function getImageLabel(image: CoverImage) {
  return image.isUploaded ? image.fileName : `Photo by ${image.author}`;
}

export default function ImageGallery() {
  const { bookData, selectedImage, setSelectedImage, setCurrentStep } =
    useBookDesigner();

  const [images, setImages] = useState<PicsumImage[]>([]);
  const [uploadedImages, setUploadedImages] = useState<UploadedImage[]>([]);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const galleryImages = useMemo(
    () => [...uploadedImages, ...images],
    [uploadedImages, images],
  );

  const fetchImages = useCallback(async (pageNum: number) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(
        `https://picsum.photos/v2/list?page=${pageNum}&limit=${PAGE_SIZE}`,
      );
      if (!res.ok) throw new Error("Failed to fetch images");
      const data: PicsumImage[] = await res.json();
      setImages((prev) => (pageNum === 1 ? data : [...prev, ...data]));
      setHasMore(data.length === PAGE_SIZE);
    } catch {
      setError("Could not load images. Please check your connection.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      fetchImages(1);
    }, 0);

    return () => window.clearTimeout(timer);
  }, [fetchImages]);

  function loadMore() {
    const next = page + 1;
    setPage(next);
    fetchImages(next);
  }

  function handleUploadClick() {
    fileInputRef.current?.click();
  }

  function handleFileUpload(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    setUploadError(null);

    if (!file.type.startsWith("image/")) {
      setUploadError("Please select a valid image file.");
      return;
    }

    if (file.size > MAX_UPLOAD_BYTES) {
      setUploadError("Image size must be less than 5 MB.");
      return;
    }

    const reader = new FileReader();

    reader.onload = (readerEvent) => {
      const dataUrl = readerEvent.target?.result;
      if (typeof dataUrl !== "string") {
        setUploadError("Failed to read file. Please try again.");
        return;
      }

      const img = new window.Image();
      img.onload = () => {
        const uploadedImage: UploadedImage = {
          id: `upload-${Date.now()}-${Math.random().toString(36).slice(2)}`,
          author: "User Upload",
          width: img.naturalWidth,
          height: img.naturalHeight,
          url: dataUrl,
          download_url: dataUrl,
          isUploaded: true,
          fileName: file.name,
        };

        setUploadedImages((prev) => [uploadedImage, ...prev]);
        setSelectedImage(uploadedImage);
      };
      img.onerror = () => {
        setUploadError("Failed to load image. Please try another file.");
      };
      img.src = dataUrl;
    };

    reader.onerror = () => {
      setUploadError("Failed to read file. Please try again.");
    };

    reader.readAsDataURL(file);
  }

  function handleProceed() {
    if (!selectedImage) return;
    setCurrentStep("editor");
  }

  function handleBack() {
    setCurrentStep("form");
  }

  return (
    <div className="gallery-page">
      <div className="gallery-header">
        <div className="gallery-header-left">
          <button className="btn-back" onClick={handleBack}>
           ⬅️ Back to Details
          </button>
          <div>
            <span className="step-label">Step 02 / 03</span>
            <h1 className="gallery-title">
              Choose Your <em>Cover Image</em>
            </h1>
            <p className="gallery-subtitle">
              Designing cover for{" "}
              <strong>&ldquo;{bookData.title}&rdquo;</strong> by{" "}
              <strong>{bookData.author}</strong> - {bookData.pageCount} pages
            </p>
          </div>
        </div>

        <div className="gallery-header-actions">
          <button
            className="btn-secondary border-2 border-black"
            onClick={handleUploadClick}
            title="Upload your own image"
          >
            Upload Photo
          </button>
          <button
            className="btn-primary"
            onClick={handleProceed}
            disabled={!selectedImage}
            title={!selectedImage ? "Select an image first" : ""}
          >
            {selectedImage ? "Create Cover" : "Select Image"}
            <span className="btn-arrow">-&gt;</span>
          </button>
        </div>

        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleFileUpload}
          style={{ display: "none" }}
          aria-label="Upload image"
        />
      </div>

      {selectedImage && (
        <div className="selected-banner">
          <div className="selected-thumb">
            <Image
              src={getPreviewSrc(selectedImage, 60, 40)}
              alt={getImageLabel(selectedImage)}
              width={60}
              height={40}
              unoptimized={selectedImage.isUploaded}
              style={{ objectFit: "cover", borderRadius: "6px" }}
            />
          </div>
          <div style={{ flex: 1 }}>
            <span style={{ fontWeight: 600, fontSize: "14px" }}>Selected</span>
            <br />
            <span style={{ fontSize: "12px", color: "var(--text-secondary)" }}>
              {getImageLabel(selectedImage)} - {selectedImage.width}x
              {selectedImage.height}px
            </span>
          </div>
          <span className="selected-check">✓</span>
        </div>
      )}

      {uploadError && (
        <div className="gallery-error">
          <span>{uploadError}</span>
          <button onClick={() => setUploadError(null)}>Dismiss</button>
        </div>
      )}

      {error && (
        <div className="gallery-error">
          <span>{error}</span>
          <button onClick={() => fetchImages(page)}>Retry</button>
        </div>
      )}

      <div className="image-grid">
        {galleryImages.map((img) => {
          const isSelected = selectedImage?.id === img.id;
          return (
            <button
              key={img.id}
              className={`image-card ${isSelected ? "image-card--selected" : ""}`}
              onClick={() => setSelectedImage(img)}
              title={`${getImageLabel(img)} - ${img.width}x${img.height}`}
            >
              <div className="image-card-inner">
                <Image
                  src={getPreviewSrc(img, 400, 280)}
                  alt={getImageLabel(img)}
                  width={400}
                  height={280}
                  className="image-card-img"
                  loading="lazy"
                  unoptimized={img.isUploaded}
                />
                {isSelected && (
                  <div className="image-card-overlay">
                    <span className="image-card-check">Selected</span>
                  </div>
                )}
              </div>
              <div className="image-card-meta">
                <span className="image-card-author">{getImageLabel(img)}</span>
                <span className="image-card-dim">
                  {img.width}x{img.height}
                </span>
              </div>
            </button>
          );
        })}

        {loading &&
          Array.from({ length: PAGE_SIZE }).map((_, i) => (
            <div key={`skel-${i}`} className="image-skeleton" />
          ))}
      </div>

      {!loading && hasMore && (
        <div className="gallery-footer">
          <button className="btn-load-more" onClick={loadMore}>
            Load More Images
          </button>
        </div>
      )}
    </div>
  );
}
