"use client";

import dynamic from "next/dynamic";
import { useBookDesigner } from "@/context/BookDesignerContext";
import BookForm from "@/components/BookForm";
import ImageGallery from "@/components/ImageGallery";

// ── Dynamic import: Fabric.js cannot run on the server ──────────────────────
const Editor = dynamic(() => import("@/components/Editor"), {
  ssr: false,
  loading: () => (
    <div className="editor-loading-screen">
      <div className="canvas-spinner" />
      <span>Loading editor…</span>
    </div>
  ),
});

export default function Home() {
  const { currentStep } = useBookDesigner();

  return (
    <main className="app-shell">
      <div className="progress-bar">
        <div
          className="progress-fill"
          style={{
            width:
              currentStep === "form"
                ? "33%"
                : currentStep === "gallery"
                ? "66%"
                : "100%",
          }}
        />
      </div>

      {currentStep === "form" && <BookForm />}
      {currentStep === "gallery" && <ImageGallery />}
      {currentStep === "editor" && <Editor />}
    </main>
  );
}