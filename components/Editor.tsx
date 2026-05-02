"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useBookDesigner } from "@/context/BookDesignerContext";
import { useBookCanvas } from "@/hooks/useBookCanvas";

// ─── Text style controls state ────────────────────────────────────────────────
interface TextControls {
  titleFontSize: number;
  authorFontSize: number;
  titleColor: string;
  authorColor: string;
}

const DEFAULT_CONTROLS: TextControls = {
  titleFontSize: 36,
  authorFontSize: 14,
  titleColor: "#f0ece3",
  authorColor: "#c9a84c",
};

export default function Editor() {
  const {
    bookData,
    setBookData,
    selectedImage,
    canvasDimensions: dims,
    setCurrentStep,
  } = useBookDesigner();

  if (!selectedImage) {
    return (
      <div className="editor-error">
        No image selected.{" "}
        <button onClick={() => setCurrentStep("gallery")}>Go back</button>
      </div>
    );
  }

  return (
    <EditorInner
      bookData={bookData}
      setBookData={setBookData}
      selectedImage={selectedImage}
      dims={dims}
      setCurrentStep={setCurrentStep}
    />
  );
}

function EditorInner({
  bookData,
  setBookData,
  selectedImage,
  dims,
  setCurrentStep,
}: {
  bookData: ReturnType<typeof useBookDesigner>["bookData"];
  setBookData: ReturnType<typeof useBookDesigner>["setBookData"];
  selectedImage: NonNullable<ReturnType<typeof useBookDesigner>["selectedImage"]>;
  dims: ReturnType<typeof useBookDesigner>["canvasDimensions"];
  setCurrentStep: ReturnType<typeof useBookDesigner>["setCurrentStep"];
}) {
  const canvasEl = useRef<HTMLCanvasElement>(null);
  const fabricRef = useRef<any>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);

  const [isLoading, setIsLoading] = useState(true);
  const [isExporting, setIsExporting] = useState(false);
  const [scale, setScale] = useState(1);
  const [controls, setControls] = useState<TextControls>(DEFAULT_CONTROLS);
  const [activeTab, setActiveTab] = useState<"text" | "layout" | "export">(
    "text"
  );

  // ── Canvas hook ─────────────────────────────────────────────────────────────
  const { initCanvas, updateTexts, exportPNG } = useBookCanvas({
    canvasEl,
    fabricRef,
    bookData,
    selectedImage,
    dims,
    onReady: () => setIsLoading(false),
    overlayOpacity: 0,
  });

  // ── Load Fabric.js dynamically (SSR-safe) ───────────────────────────────────
  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);

    import("fabric").then((mod) => {
      if (cancelled) return;
      const fabric = mod.default ?? mod;
      initCanvas(fabric);
    });

    return () => {
      cancelled = true;
      if (fabricRef.current) {
        fabricRef.current.dispose();
        fabricRef.current = null;
      }
    };
    // Re-init when image or dims change
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedImage?.id, dims.totalWidth, dims.height]);

  // ── Scale canvas to fit viewport ────────────────────────────────────────────
  useEffect(() => {
    function computeScale() {
      if (!wrapperRef.current) return;
      const available = wrapperRef.current.clientWidth - 48;
      const s = Math.min(1, available / dims.totalWidth);
      setScale(parseFloat(s.toFixed(3)));
    }
    computeScale();
    window.addEventListener("resize", computeScale);
    return () => window.removeEventListener("resize", computeScale);
  }, [dims.totalWidth]);

  // ── Apply font-size changes to live canvas ──────────────────────────────────
  useEffect(() => {
    const canvas = fabricRef.current;
    if (!canvas || isLoading) return;
    // Prefer explicit object roles (front + spine), fall back to heuristics.
    canvas.getObjects().forEach((obj: any) => {
      if (obj?.coverRole === "title") {
        obj.set({ fill: controls.titleColor });

        // Only resize the editable front title textbox.
        if (obj.type === "textbox" && obj.angle === 0) {
          obj.set({ fontSize: controls.titleFontSize });
        }
        return;
      }

      if (obj?.coverRole === "author") {
        obj.set({ fill: controls.authorColor });

        // Only resize the editable front author textbox.
        if (obj.type === "textbox" && obj.angle === 0) {
          obj.set({ fontSize: controls.authorFontSize });
        }
        return;
      }

      // Backwards-compatible fallback (older canvases / objects without coverRole)
      if (obj?.type === "textbox") {
        // Title on front: large italic
        if (obj.fontStyle === "italic" && obj.angle === 0) {
          obj.set({
            fontSize: controls.titleFontSize,
            fill: controls.titleColor,
          });
        }
        // Author: small, charSpacing 120
        if (obj.charSpacing === 120) {
          obj.set({
            fontSize: controls.authorFontSize,
            fill: controls.authorColor,
          });
        }
      }
    });
    canvas.renderAll();
  }, [controls, isLoading]);

  // ── Handlers ────────────────────────────────────────────────────────────────
  function handleControlChange<K extends keyof TextControls>(
    key: K,
    value: TextControls[K]
  ) {
    setControls((prev) => ({ ...prev, [key]: value }));
  }

  function handleBookDataChange(
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) {
    const { name, value } = e.target;
    const updated = {
      ...bookData,
      [name]: name === "pageCount" ? parseInt(value) || 0 : value,
    };
    setBookData(updated);
    // Live update text objects without full reinit
    setTimeout(() => updateTexts(), 0);
  }

  async function handleExport() {
    setIsExporting(true);
    await new Promise((r) => setTimeout(r, 80)); // flush render
    exportPNG();
    setTimeout(() => setIsExporting(false), 800);
  }

  return (
    <div className="editor-page">
      {/* ── Top bar ─────────────────────────────────────────────────── */}
      <div className="editor-topbar">
        <div className="editor-topbar-left">
          <button
            className="btn-back"
            onClick={() => setCurrentStep("gallery")}
          >
            ← Gallery
          </button>
          <div className="editor-title-info">
            <span className="step-label">Step 03 / 03</span>
            <h1 className="editor-heading">
              Cover <em>Editor</em>
            </h1>
          </div>
        </div>

        <div className="editor-topbar-actions">
          <div className="dims-badge">
            {dims.totalWidth} × {dims.height}px &nbsp;·&nbsp; Spine:{" "}
            {dims.spineWidth}px
          </div>
          <button
            className={`btn-export ${isExporting ? "btn-export--busy" : ""}`}
            onClick={handleExport}
            disabled={isLoading || isExporting}
          >
            {isExporting ? "Exporting…" : "Export PNG"}
            {!isExporting && <span className="btn-arrow">↓</span>}
          </button>
        </div>
      </div>

      {/* ── Main layout ─────────────────────────────────────────────── */}
      <div className="editor-body">
        {/* Canvas area */}
        <div className="canvas-area" ref={wrapperRef}>
          {isLoading && (
            <div className="canvas-loading">
              <div className="canvas-spinner" />
              <span>Building your cover…</span>
            </div>
          )}

          <div
            className="canvas-scaler"
            style={{
              transform: `scale(${scale})`,
              transformOrigin: "top center",
              width: dims.totalWidth,
              height: dims.height,
              opacity: isLoading ? 0 : 1,
              transition: "opacity 400ms ease",
            }}
          >
            {/* Section labels */}
            <div
              className="canvas-labels"
              style={{ width: dims.totalWidth }}
            >
              <span style={{ width: dims.backWidth }}>Back Cover</span>
              <span style={{ width: dims.spineWidth }}>Spine</span>
              <span style={{ width: dims.frontWidth }}>Front Cover</span>
            </div>
            <canvas ref={canvasEl} />
          </div>

          {/* Scaled height spacer so layout doesn't collapse */}
          <div
            style={{
              height: dims.height * scale + 32,
              width: "100%",
              pointerEvents: "none",
              flexShrink: 0,
            }}
          />
        </div>

        {/* Controls panel */}
        <div className="controls-panel">
          {/* Tab nav */}
          <div className="controls-tabs">
            {(["text", "layout", "export"] as const).map((tab) => (
              <button
                key={tab}
                className={`controls-tab ${activeTab === tab ? "controls-tab--active" : ""}`}
                onClick={() => setActiveTab(tab)}
              >
                {tab.charAt(0).toUpperCase() + tab.slice(1)}
              </button>
            ))}
          </div>

          <div className="controls-body">
            {/* ── TEXT TAB ────────────────────────────── */}
            {activeTab === "text" && (
              <div className="controls-section">
                <div className="ctrl-group">
                  <label className="ctrl-label">Book Title</label>
                  <input
                    className="ctrl-input"
                    name="title"
                    value={bookData.title}
                    onChange={handleBookDataChange}
                    placeholder="Book Title"
                  />
                </div>

                <div className="ctrl-group">
                  <label className="ctrl-label">Author</label>
                  <input
                    className="ctrl-input"
                    name="author"
                    value={bookData.author}
                    onChange={handleBookDataChange}
                    placeholder="Author Name"
                  />
                </div>

                <div className="ctrl-divider" />

                <div className="ctrl-group">
                  <label className="ctrl-label">
                    Title Font Size{" "}
                    <span className="ctrl-value">{controls.titleFontSize}px</span>
                  </label>
                  <input
                    type="range"
                    className="ctrl-range"
                    min={16}
                    max={72}
                    value={controls.titleFontSize}
                    onChange={(e) =>
                      handleControlChange(
                        "titleFontSize",
                        parseInt(e.target.value)
                      )
                    }
                  />
                </div>

                <div className="ctrl-group">
                  <label className="ctrl-label">
                    Author Font Size{" "}
                    <span className="ctrl-value">{controls.authorFontSize}px</span>
                  </label>
                  <input
                    type="range"
                    className="ctrl-range"
                    min={10}
                    max={28}
                    value={controls.authorFontSize}
                    onChange={(e) =>
                      handleControlChange(
                        "authorFontSize",
                        parseInt(e.target.value)
                      )
                    }
                  />
                </div>

                <div className="ctrl-row">
                  <div className="ctrl-group ctrl-group--half">
                    <label className="ctrl-label">Title Color</label>
                    <div className="ctrl-color-wrap">
                      <input
                        type="color"
                        className="ctrl-color"
                        value={controls.titleColor}
                        onChange={(e) =>
                          handleControlChange("titleColor", e.target.value)
                        }
                      />
                      <span className="ctrl-color-hex">{controls.titleColor}</span>
                    </div>
                  </div>
                  <div className="ctrl-group ctrl-group--half">
                    <label className="ctrl-label">Author Color</label>
                    <div className="ctrl-color-wrap">
                      <input
                        type="color"
                        className="ctrl-color"
                        value={controls.authorColor}
                        onChange={(e) =>
                          handleControlChange("authorColor", e.target.value)
                        }
                      />
                      <span className="ctrl-color-hex">{controls.authorColor}</span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* ── LAYOUT TAB ──────────────────────────── */}
            {activeTab === "layout" && (
              <div className="controls-section">
                <div className="ctrl-group">
                  <label className="ctrl-label">
                    Page Count (affects spine)
                  </label>
                  <input
                    className="ctrl-input"
                    type="number"
                    name="pageCount"
                    min={10}
                    max={2000}
                    value={bookData.pageCount}
                    onChange={handleBookDataChange}
                  />
                  <span className="ctrl-hint">
                    Spine auto-recalculates on change — canvas will reload.
                  </span>
                </div>

                <div className="ctrl-divider" />

                <div className="layout-info">
                  <div className="layout-info-row">
                    <span>Back Cover</span>
                    <strong>{dims.backWidth}px</strong>
                  </div>
                  <div className="layout-info-row">
                    <span>Spine</span>
                    <strong style={{ color: "var(--accent)" }}>
                      {dims.spineWidth}px
                    </strong>
                  </div>
                  <div className="layout-info-row">
                    <span>Front Cover</span>
                    <strong>{dims.frontWidth}px</strong>
                  </div>
                  <div className="layout-info-row layout-info-row--total">
                    <span>Total Width</span>
                    <strong>{dims.totalWidth}px</strong>
                  </div>
                  <div className="layout-info-row">
                    <span>Height</span>
                    <strong>{dims.height}px</strong>
                  </div>
                </div>

                <div className="ctrl-divider" />

                <p className="ctrl-hint">
                  <strong>Tip:</strong> All text objects on the canvas are{" "}
                  <em>draggable & resizable</em>. Click any text to select it,
                  then drag to reposition or use handles to resize.
                </p>

                <button
                  className="btn-secondary"
                  onClick={() => setCurrentStep("gallery")}
                >
                  ← Change Image
                </button>
              </div>
            )}

            {/* ── EXPORT TAB ──────────────────────────── */}
            {activeTab === "export" && (
              <div className="controls-section">
                <div className="export-preview">
                  <div className="export-icon">↓</div>
                  <p className="export-desc">
                    Export your full book wrap as a high-resolution PNG at{" "}
                    <strong>2× pixel density</strong> for print-ready quality.
                  </p>
                </div>

                <div className="export-specs">
                  <div className="layout-info-row">
                    <span>Output size</span>
                    <strong>
                      {dims.totalWidth * 2} × {dims.height * 2}px
                    </strong>
                  </div>
                  <div className="layout-info-row">
                    <span>Format</span>
                    <strong>PNG (lossless)</strong>
                  </div>
                  <div className="layout-info-row">
                    <span>Filename</span>
                    <strong style={{ fontSize: 11 }}>
                      {(bookData.title || "book-cover")
                        .replace(/\s+/g, "-")
                        .toLowerCase()}
                      .png
                    </strong>
                  </div>
                </div>

                <button
                  className={`btn-export-lg ${isExporting ? "btn-export--busy" : ""}`}
                  onClick={handleExport}
                  disabled={isLoading || isExporting}
                >
                  {isExporting ? "Exporting…" : "Download PNG"}
                  {!isExporting && " ↓"}
                </button>

                <p className="ctrl-hint" style={{ marginTop: 16 }}>
                  Active selections are cleared automatically before export so
                  no UI chrome appears in the file.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}