"use client";

import React, {
  createContext,
  useContext,
  useState,
  useMemo,
  useCallback,
} from "react";
import {
  BookData,
  BookDesignerContextType,
  CanvasDimensions,
  CoverImage,
  DesignerStep,
} from "@/types";

// ─── Constants ────────────────────────────────────────────────────────────────
const FRONT_COVER_WIDTH = 400;  // px — fixed front cover width
const COVER_HEIGHT = 560;       // px — fixed height for all panels
const MIN_SPINE_WIDTH = 30;     // px — minimum visible spine
const PAGES_PER_PX = 0.08;      // spine px per page (tune to taste)

// ─── Helpers ──────────────────────────────────────────────────────────────────
function calculateSpineWidth(pageCount: number): number {
  const width = Math.max(MIN_SPINE_WIDTH, Math.round(pageCount * PAGES_PER_PX));
  return width;
}

function buildCanvasDimensions(pageCount: number): CanvasDimensions {
  const spineWidth = calculateSpineWidth(pageCount);
  const frontWidth = FRONT_COVER_WIDTH;
  const backWidth = FRONT_COVER_WIDTH;
  return {
    frontWidth,
    backWidth,
    spineWidth,
    height: COVER_HEIGHT,
    totalWidth: frontWidth + backWidth + spineWidth,
  };
}

// ─── Defaults ─────────────────────────────────────────────────────────────────
const defaultBookData: BookData = {
  title: "",
  author: "",
  genre: "",
  pageCount: 300,
};

// ─── Context ──────────────────────────────────────────────────────────────────
const BookDesignerContext = createContext<BookDesignerContextType | null>(null);

export function BookDesignerProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [currentStep, setCurrentStep] = useState<DesignerStep>("form");
  const [bookData, setBookDataState] = useState<BookData>(defaultBookData);
  const [selectedImage, setSelectedImage] = useState<CoverImage | null>(null);

  // Wrapped setter so callers can pass partial updates
  const setBookData = useCallback((data: BookData) => {
    setBookDataState(data);
  }, []);

  // Derive canvas dimensions reactively from pageCount
  const canvasDimensions = useMemo(
    () => buildCanvasDimensions(bookData.pageCount),
    [bookData.pageCount]
  );

  const value: BookDesignerContextType = {
    currentStep,
    setCurrentStep,
    bookData,
    setBookData,
    selectedImage,
    setSelectedImage,
    canvasDimensions,
  };

  return (
    <BookDesignerContext.Provider value={value}>
      {children}
    </BookDesignerContext.Provider>
  );
}

// ─── Hook ─────────────────────────────────────────────────────────────────────
export function useBookDesigner(): BookDesignerContextType {
  const ctx = useContext(BookDesignerContext);
  if (!ctx) {
    throw new Error("useBookDesigner must be used within BookDesignerProvider");
  }
  return ctx;
}