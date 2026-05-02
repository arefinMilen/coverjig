"use client";

import { useState } from "react";
import { useBookDesigner } from "@/context/BookDesignerContext";
import { BookData } from "@/types";

const GENRES = [
  "Literary Fiction",
  "Mystery & Thriller",
  "Science Fiction",
  "Fantasy",
  "Romance",
  "Horror",
  "Historical Fiction",
  "Biography",
  "Self-Help",
  "Poetry",
];

export default function BookForm() {
  const { bookData, setBookData, setCurrentStep } = useBookDesigner();
  const [form, setForm] = useState<BookData>(bookData);
  const [errors, setErrors] = useState<Partial<Record<keyof BookData, string>>>({});

  function validate(): boolean {
    const newErrors: Partial<Record<keyof BookData, string>> = {};
    if (!form.title.trim()) newErrors.title = "Title is required";
    if (!form.author.trim()) newErrors.author = "Author is required";
    if (!form.genre) newErrors.genre = "Please select a genre";
    if (!form.pageCount || form.pageCount < 10)
      newErrors.pageCount = "Page count must be at least 10";
    if (form.pageCount > 2000)
      newErrors.pageCount = "Page count must be under 2000";
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }

  function handleSubmit() {
    if (!validate()) return;
    setBookData(form);
    setCurrentStep("gallery");
  }

  function handleChange(
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) {
    const { name, value } = e.target;
    setForm((prev) => ({
      ...prev,
      [name]: name === "pageCount" ? parseInt(value) || 0 : value,
    }));
    // Clear error on change
    if (errors[name as keyof BookData]) {
      setErrors((prev) => ({ ...prev, [name]: undefined }));
    }
  }

  // Live spine preview
  const spineWidth = Math.max(30, Math.round(form.pageCount * 0.08));

  return (
    <div className="form-page">
      <div className="form-left">
        <div className="form-header">
          <span className="step-label">Step 01 / 03</span>
          <h1 className="form-title">
            Define Your
            <br />
            <em>Book</em>
          </h1>
          <p className="form-subtitle">
            Enter the details of your book. These will be used to compose the
            cover layout and spine width.
          </p>
        </div>

        <div className="form-fields">
          <div className="field-group">
            <label className="field-label" htmlFor="title">
              Book Title
            </label>
            <input
              id="title"
              name="title"
              type="text"
              className={`field-input ${errors.title ? "field-input--error" : ""}`}
              placeholder="e.g. The Midnight Library"
              value={form.title}
              onChange={handleChange}
            />
            {errors.title && (
              <span className="field-error">{errors.title}</span>
            )}
          </div>

          <div className="field-group">
            <label className="field-label" htmlFor="author">
              Author Name
            </label>
            <input
              id="author"
              name="author"
              type="text"
              className={`field-input ${errors.author ? "field-input--error" : ""}`}
              placeholder="e.g. Matt Haig"
              value={form.author}
              onChange={handleChange}
            />
            {errors.author && (
              <span className="field-error">{errors.author}</span>
            )}
          </div>

          <div className="field-row">
            <div className="field-group field-group--half">
              <label className="field-label" htmlFor="genre">
                Genre
              </label>
              <select
                id="genre"
                name="genre"
                className={`field-input field-select ${errors.genre ? "field-input--error" : ""}`}
                value={form.genre}
                onChange={handleChange}
              >
                <option value="">Select genre…</option>
                {GENRES.map((g) => (
                  <option key={g} value={g}>
                    {g}
                  </option>
                ))}
              </select>
              {errors.genre && (
                <span className="field-error">{errors.genre}</span>
              )}
            </div>

            <div className="field-group field-group--half">
              <label className="field-label" htmlFor="pageCount">
                Page Count
              </label>
              <input
                id="pageCount"
                name="pageCount"
                type="number"
                min={10}
                max={2000}
                className={`field-input ${errors.pageCount ? "field-input--error" : ""}`}
                placeholder="e.g. 320"
                value={form.pageCount || ""}
                onChange={handleChange}
              />
              {errors.pageCount && (
                <span className="field-error">{errors.pageCount}</span>
              )}
            </div>
          </div>

          <button className="btn-primary" onClick={handleSubmit}>
            Choose Cover Image
            <span className="btn-arrow">→</span>
          </button>
        </div>
      </div>

      {/* Live Spine Preview */}
      <div className="form-right">
        <div className="preview-label">Live Spine Preview</div>
        <div className="book-preview">
          <div className="preview-back">
            <span>Back</span>
          </div>
          <div
            className="preview-spine"
            style={{ width: `${spineWidth}px` }}
          >
            {spineWidth > 40 && (
              <span className="spine-text">{form.title || "Title"}</span>
            )}
          </div>
          <div className="preview-front">
            <div className="preview-front-content">
              <p className="preview-title">{form.title || "Book Title"}</p>
              <p className="preview-author">{form.author || "Author Name"}</p>
            </div>
          </div>
        </div>
        <p className="spine-info">
          Spine width:{" "}
          <strong>{spineWidth}px</strong> &nbsp;·&nbsp; {form.pageCount || 0}{" "}
          pages
        </p>
      </div>
    </div>
  );
}