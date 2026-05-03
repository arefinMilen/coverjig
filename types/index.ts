export interface BookData {
  title: string;
  author: string;
  genre: string;
  pageCount: number;
}

export interface PicsumImage {
  id: string;
  author: string;
  width: number;
  height: number;
  url: string;
  download_url: string;
  isUploaded?: false;
}

export interface UploadedImage {
  id: string;
  author: "User Upload";
  width: number;
  height: number;
  url: string;
  download_url: string;
  isUploaded: true;
  fileName: string;
}

export type CoverImage = PicsumImage | UploadedImage;

export type DesignerStep = "form" | "gallery" | "editor";

export interface BookDesignerContextType {
  // Step tracking
  currentStep: DesignerStep;
  setCurrentStep: (step: DesignerStep) => void;

  // Book metadata
  bookData: BookData;
  setBookData: (data: BookData) => void;

  // Selected cover image
  selectedImage: CoverImage | null;
  setSelectedImage: (image: CoverImage | null) => void;

  // Canvas dimensions (derived from pageCount)
  canvasDimensions: CanvasDimensions;
}

export interface CanvasDimensions {
  frontWidth: number; // Fixed front cover width
  backWidth: number; // Same as front
  spineWidth: number; // Dynamic: based on pageCount
  height: number; // Fixed height
  totalWidth: number; // frontWidth + backWidth + spineWidth
}
