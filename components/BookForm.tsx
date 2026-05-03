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
  const [errors, setErrors] = useState<Partial<Record<keyof BookData, string>>>(
    {},
  );
  const [touched, setTouched] = useState<
    Partial<Record<keyof BookData, boolean>>
  >({});

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
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>,
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

  function handleBlur(field: keyof BookData) {
    setTouched((prev) => ({ ...prev, [field]: true }));
  }

  // Live spine preview
  const spineWidth = Math.max(30, Math.round(form.pageCount * 0.08));
  const isFormValid =
    form.title &&
    form.author &&
    form.genre &&
    form.pageCount >= 10 &&
    form.pageCount <= 2000;

  return (
    <div className="form-page">
      <div className="form-left">
        <div className="form-header">
          <span className="step-label">✨ Step 01 / 03</span>
          <h1 className="form-title">
            Design Your
            <br />
            <em>Book Cover</em>
          </h1>
          <p className="form-subtitle">
            Start by telling us about your book. These details will help us
            create the perfect cover layout for your title and spine.
          </p>
        </div>

        <div className="form-fields">
          <div className="field-group">
            <label className="field-label" htmlFor="title">
              📚 Book Title <span style={{ color: "var(--error)" }}>*</span>
            </label>
            <input
              id="title"
              name="title"
              type="text"
              className={`field-input ${errors.title && touched.title ? "field-input--error" : ""}`}
              placeholder="Enter your book title"
              value={form.title}
              onChange={handleChange}
              onBlur={() => handleBlur("title")}
              maxLength={100}
            />
            {errors.title && touched.title && (
              <span className="field-error">✗ {errors.title}</span>
            )}
            {!errors.title && form.title && (
              <span
                style={{
                  fontSize: "12px",
                  color: "var(--success)",
                  fontWeight: 500,
                }}
              >
                ✓ Looks great!
              </span>
            )}
          </div>

          <div className="field-group">
            <label className="field-label" htmlFor="author">
              ✍️ Author Name <span style={{ color: "var(--error)" }}>*</span>
            </label>
            <input
              id="author"
              name="author"
              type="text"
              className={`field-input ${errors.author && touched.author ? "field-input--error" : ""}`}
              placeholder="Your name or pen name"
              value={form.author}
              onChange={handleChange}
              onBlur={() => handleBlur("author")}
              maxLength={80}
            />
            {errors.author && touched.author && (
              <span className="field-error">✗ {errors.author}</span>
            )}
            {!errors.author && form.author && (
              <span
                style={{
                  fontSize: "12px",
                  color: "var(--success)",
                  fontWeight: 500,
                }}
              >
                ✓ Perfect!
              </span>
            )}
          </div>

          <div className="field-row">
            <div className="field-group">
              <label className="field-label" htmlFor="genre">
                📖 Genre <span style={{ color: "var(--error)" }}>*</span>
              </label>
              <select
                id="genre"
                name="genre"
                className={`field-input field-select ${errors.genre && touched.genre ? "field-input--error" : ""}`}
                value={form.genre}
                onChange={handleChange}
                onBlur={() => handleBlur("genre")}
              >
                <option value="">Select genre…</option>
                {GENRES.map((g) => (
                  <option key={g} value={g}>
                    {g}
                  </option>
                ))}
              </select>
              {errors.genre && touched.genre && (
                <span className="field-error">✗ {errors.genre}</span>
              )}
            </div>

            <div className="field-group">
              <label className="field-label" htmlFor="pageCount">
                📄 Page Count <span style={{ color: "var(--error)" }}>*</span>
              </label>
              <input
                id="pageCount"
                name="pageCount"
                type="number"
                min={10}
                max={2000}
                className={`field-input ${errors.pageCount && touched.pageCount ? "field-input--error" : ""}`}
                placeholder="10 - 2000"
                value={form.pageCount || ""}
                onChange={handleChange}
                onBlur={() => handleBlur("pageCount")}
              />
              {errors.pageCount && touched.pageCount && (
                <span className="field-error">✗ {errors.pageCount}</span>
              )}
              {!errors.pageCount && form.pageCount && (
                <span
                  style={{
                    fontSize: "12px",
                    color: "var(--success)",
                    fontWeight: 500,
                  }}
                >
                  ✓ Valid!
                </span>
              )}
            </div>
          </div>

          <button
            className="btn-primary"
            onClick={handleSubmit}
            disabled={!isFormValid}
            style={{ marginTop: "16px" }}
          >
            Continue to Image Selection
            <span className="btn-arrow">→</span>
          </button>
        </div>
      </div>

      {/* Live Spine Preview */}
      <div className="form-right">
        <div className="preview-label">📐 Live Spine Preview</div>
        <div className="book-preview">
          <div className="preview-back">
            <span>Back</span>
          </div>
          <div className="preview-spine" style={{ width: `${spineWidth}px` }}>
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
          Spine width: <strong>{spineWidth}px</strong> <br />
          {form.pageCount || 0} pages
        </p>
      </div>
    </div>
  );
}
