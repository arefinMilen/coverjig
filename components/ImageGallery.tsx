"use client";

import { useEffect, useState, useCallback } from "react";
import Image from "next/image";
import { useBookDesigner } from "@/context/BookDesignerContext";
import { PicsumImage } from "@/types";

const PAGE_SIZE = 12;

export default function ImageGallery() {
  const { bookData, selectedImage, setSelectedImage, setCurrentStep } =
    useBookDesigner();

  const [images, setImages] = useState<PicsumImage[]>([]);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [error, setError] = useState<string | null>(null);

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
    } catch (err) {
      setError("Could not load images. Please check your connection.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchImages(1);
  }, [fetchImages]);

  function loadMore() {
    const next = page + 1;
    setPage(next);
    fetchImages(next);
  }

  function handleSelect(image: PicsumImage) {
    setSelectedImage(image);
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
      {/* Header */}
      <div className="gallery-header">
        <div className="gallery-header-left">
          <button className="btn-back" onClick={handleBack}>
            ← Back to Details
          </button>
          <div>
            <span className="step-label">🖼️ Step 02 / 03</span>
            <h1 className="gallery-title">
              Choose Your <em>Cover Image</em>
            </h1>
            <p className="gallery-subtitle">
              Designing cover for{" "}
              <strong>&ldquo;{bookData.title}&rdquo;</strong> by{" "}
              <strong>{bookData.author}</strong> • {bookData.pageCount} pages
            </p>
          </div>
        </div>

        <button
          className="btn-primary"
          onClick={handleProceed}
          disabled={!selectedImage}
          title={!selectedImage ? "Select an image first" : ""}
        >
          {selectedImage ? "Edit in Designer" : "Select Image"}
          <span className="btn-arrow">→</span>
        </button>
      </div>

      {/* Selected banner */}
      {selectedImage && (
        <div className="selected-banner">
          <div className="selected-thumb">
            <Image
              src={`https://picsum.photos/id/${selectedImage.id}/60/40`}
              alt={selectedImage.author}
              width={60}
              height={40}
              style={{ objectFit: "cover", borderRadius: "6px" }}
            />
          </div>
          <div style={{ flex: 1 }}>
            <span style={{ fontWeight: 600, fontSize: "14px" }}>
              ✓ Selected
            </span>
            <br />
            <span style={{ fontSize: "12px", color: "var(--text-secondary)" }}>
              Photo by <em>{selectedImage.author}</em> • {selectedImage.width}×
              {selectedImage.height}px
            </span>
          </div>
          <span className="selected-check">✓</span>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="gallery-error">
          <span>⚠️ {error}</span>
          <button onClick={() => fetchImages(page)}>Retry</button>
        </div>
      )}

      {/* Grid */}
      <div className="image-grid">
        {images.map((img) => {
          const isSelected = selectedImage?.id === img.id;
          return (
            <button
              key={img.id}
              className={`image-card ${isSelected ? "image-card--selected" : ""}`}
              onClick={() => handleSelect(img)}
              title={`Photo by ${img.author} - ${img.width}×${img.height}`}
            >
              <div className="image-card-inner">
                <Image
                  src={`https://picsum.photos/id/${img.id}/400/280`}
                  alt={img.author}
                  width={400}
                  height={280}
                  className="image-card-img"
                  loading="lazy"
                />
                {isSelected && (
                  <div className="image-card-overlay">
                    <span className="image-card-check">✓ Selected</span>
                  </div>
                )}
              </div>
              <div className="image-card-meta">
                <span className="image-card-author">by {img.author}</span>
                <span className="image-card-dim">
                  {img.width}×{img.height}
                </span>
              </div>
            </button>
          );
        })}

        {/* Skeleton loaders */}
        {loading &&
          Array.from({ length: PAGE_SIZE }).map((_, i) => (
            <div key={`skel-${i}`} className="image-skeleton" />
          ))}
      </div>

      {/* Load More */}
      {!loading && hasMore && (
        <div className="gallery-footer">
          <button className="btn-load-more" onClick={loadMore}>
            ↓ Load More Images
          </button>
        </div>
      )}
    </div>
  );
}
