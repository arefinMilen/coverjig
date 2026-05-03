"use client";

import { useEffect, useRef, useCallback } from "react";
import { BookData, CanvasDimensions, CoverImage } from "@/types";

// We import fabric types only — the actual lib is loaded dynamically
type FabricCanvas = any;
type FabricObject = any;

type CanvasBBox = { left: number; top: number; width: number; height: number };

/** Axis-aligned bbox of a Fabric object after transforms (handles rotated spine text). */
function readCanvasBBox(obj: FabricObject): CanvasBBox | null {
  try {
    if (typeof obj?.setCoords === "function") obj.setCoords();
    if (typeof obj?.getBoundingRect !== "function") return null;
    let r = obj.getBoundingRect(true);
    if (!r?.width || !Number.isFinite(r.left)) r = obj.getBoundingRect();
    if (!r || !Number.isFinite(r.width)) return null;
    return {
      left: r.left,
      top: r.top,
      width: r.width,
      height: r.height,
    };
  } catch {
    return null;
  }
}

/** Center spine text horizontally in the spine stripe & keep its top edge inset from clipping. */
function fitSpineObjectInStripe(
  obj: FabricObject,
  spineLeft: number,
  spineWidth: number,
  minTopPx: number,
) {
  const spineCx = spineLeft + spineWidth / 2;
  const eps = 0.25;

  for (let i = 0; i < 8; i++) {
    if (typeof obj.setCoords === "function") obj.setCoords();
    const bb = readCanvasBBox(obj);
    if (!bb || bb.width <= 0) break;

    const dx = spineCx - (bb.left + bb.width / 2);
    if (Math.abs(dx) > eps) {
      obj.set({ left: (obj.left ?? 0) + dx });
    }

    if (typeof obj.setCoords === "function") obj.setCoords();
    const bb2 = readCanvasBBox(obj);
    if (!bb2) break;
    if (bb2.top + eps < minTopPx) {
      obj.set({ top: (obj.top ?? 0) + (minTopPx - bb2.top) });
    }
  }
  obj.setCoords?.();
}

/** Position rotated title + author on spine: top inset, horizontally centered vs actual painted bbox. */
function layoutVerticalSpinePair(options: {
  titleSpine: FabricObject | null;
  authorSpine: FabricObject | null;
  spineLeft: number;
  spineWidth: number;
  height: number;
  titleFontPx: number;
  authorFontPx: number;
}) {
  const {
    titleSpine,
    authorSpine,
    spineLeft,
    spineWidth,
    height,
    titleFontPx,
    authorFontPx,
  } = options;

  if (!titleSpine || spineWidth < 24) return;

  const spineCx = spineLeft + spineWidth / 2;
  const edgePadTop = Math.max(
    32,
    Math.round(titleFontPx * 2.25),
    Math.round(spineWidth * 0.55),
  );
  const spineStackGap = Math.max(
    16,
    Math.round(Math.min(titleFontPx * 1.2, spineWidth * 0.55)),
  );

  titleSpine.set({
    originX: "center",
    originY: "top",
    left: spineCx,
    top: edgePadTop,
  });
  fitSpineObjectInStripe(titleSpine, spineLeft, spineWidth, edgePadTop);

  if (!authorSpine) return;

  const tb = readCanvasBBox(titleSpine);
  const titleText =
    typeof titleSpine.text === "string" ? titleSpine.text : "Book Title";
  const authorSeedTop =
    tb && Number.isFinite(tb.top + tb.height)
      ? tb.top + tb.height + spineStackGap
      : edgePadTop + spineTitleFontGuess(titleText, titleFontPx);

  authorSpine.set({
    originX: "center",
    originY: "top",
    left: spineCx,
    top: authorSeedTop,
  });
  fitSpineObjectInStripe(
    authorSpine,
    spineLeft,
    spineWidth,
    authorSeedTop,
  );

  const hb = readCanvasBBox(authorSpine);
  if (hb) {
    const over = hb.top + hb.height - (height - 22);
    if (over > 0) {
      authorSpine.set({ top: (authorSpine.top ?? 0) - over });
      fitSpineObjectInStripe(
        authorSpine,
        spineLeft,
        spineWidth,
        authorSeedTop,
      );
    }
  }
}

/** Rough rotated-title depth when bbox read fails mid-layout. */
function spineTitleFontGuess(text: string, fontPx: number): number {
  const len = [...(text || "Book Title")].length;
  return Math.min(220, Math.max(fontPx * 4, Math.round(len * fontPx * 0.72)));
}

interface UseBookCanvasProps {
  canvasEl: React.RefObject<HTMLCanvasElement | null>;
  fabricRef: React.MutableRefObject<FabricCanvas | null>;
  bookData: BookData;
  selectedImage: CoverImage;
  dims: CanvasDimensions;
  onReady: () => void;
  overlayOpacity?: number; // 0-100
}

export function useBookCanvas({
  canvasEl,
  fabricRef,
  bookData,
  selectedImage,
  dims,
  onReady,
  overlayOpacity = 0,
}: UseBookCanvasProps) {
  const objectsRef = useRef<{
    titleFront: FabricObject | null;
    authorFront: FabricObject | null;
    titleSpine: FabricObject | null;
    authorSpine: FabricObject | null;
    dividerLeft: FabricObject | null;
    dividerRight: FabricObject | null;
    backText: FabricObject | null;
    backOverlay: FabricObject | null;
    spineOverlay: FabricObject | null;
    frontOverlay: FabricObject | null;
  }>({
    titleFront: null,
    authorFront: null,
    titleSpine: null,
    authorSpine: null,
    dividerLeft: null,
    dividerRight: null,
    backText: null,
    backOverlay: null,
    spineOverlay: null,
    frontOverlay: null,
  });

  const setOverlayOpacity = useCallback(
    (nextOpacity: number) => {
      const canvas = fabricRef.current;
      if (!canvas) return;
      const o = Math.max(0, Math.min(100, nextOpacity)) / 100;
      const { backOverlay, spineOverlay, frontOverlay } = objectsRef.current;

      // Keep relative differences similar to the old hardcoded values.
      if (backOverlay) backOverlay.set("fill", `rgba(0,0,0,${(0.38 * o).toFixed(3)})`);
      if (frontOverlay) frontOverlay.set("fill", `rgba(0,0,0,${(0.28 * o).toFixed(3)})`);
      if (spineOverlay) spineOverlay.set("fill", `rgba(0,0,0,${(0.55 * o).toFixed(3)})`);

      canvas.renderAll();
    },
    [fabricRef],
  );

  // ── Initialize canvas ───────────────────────────────────────────────────────
  const initCanvas = useCallback(
    async (fabric: any) => {
      if (!canvasEl.current) return;

      // Destroy previous instance
      if (fabricRef.current) {
        fabricRef.current.dispose();
        fabricRef.current = null;
      }

      const canvas = new fabric.Canvas(canvasEl.current, {
        width: dims.totalWidth,
        height: dims.height,
        selection: true,
        preserveObjectStacking: true,
      });
      fabricRef.current = canvas;

      // ── Load background image (Fabric v7-safe) ──────────────────────────
      const imgUrl = selectedImage.isUploaded
        ? selectedImage.download_url
        : `https://picsum.photos/id/${selectedImage.id}/${dims.totalWidth}/${dims.height}?cacheBust=${Date.now()}`;

      const addFallback = () => {
        const fallback = new fabric.Rect({
          left: 0,
          top: 0,
          width: dims.totalWidth,
          height: dims.height,
          fill: "#2a2a2a",
          selectable: false,
          evented: false,
        });
        canvas.add(fallback);
      };

      try {
        const imgEl = new Image();
        if (!selectedImage.isUploaded) {
          imgEl.crossOrigin = "anonymous";
        }
        imgEl.decoding = "async";

        const loadPromise = new Promise<void>((resolve, reject) => {
          imgEl.onload = () => resolve();
          imgEl.onerror = () => reject(new Error("Image failed to load"));
        });

        imgEl.src = imgUrl;

        const timeoutPromise = new Promise<void>((_, reject) =>
          setTimeout(() => reject(new Error("Image load timeout")), 8000),
        );

        await Promise.race([loadPromise, timeoutPromise]);

        // Some browsers support decode() for better reliability
        if (typeof (imgEl as any).decode === "function") {
          try {
            await (imgEl as any).decode();
          } catch {
            // ignore decode errors; onload already fired
          }
        }

        const FabricImageCtor = fabric.FabricImage ?? fabric.Image;
        const imgObj: FabricObject = new FabricImageCtor(imgEl, {
          left: dims.totalWidth / 2,
          top: dims.height / 2,
          originX: "center",
          originY: "center",
          selectable: false,
          evented: false,
        });

        // Scale to cover the entire wrap (back + spine + front)
        const scale = Math.max(
          dims.totalWidth / imgObj.width,
          dims.height / imgObj.height,
        );
        imgObj.scale(scale);
        imgObj.setCoords();

        if (typeof canvas.setBackgroundImage === "function") {
          canvas.setBackgroundImage(imgObj, canvas.renderAll.bind(canvas));
        } else {
          canvas.add(imgObj);
          if (typeof imgObj.sendToBack === "function") imgObj.sendToBack();
        }
      } catch (err) {
        console.warn("Image load failed, using fallback:", err);
        addFallback();
      }

      // Draw layout after background is ready (objects appear on top)
      drawLayout(canvas, fabric);
      setOverlayOpacity(overlayOpacity);
      onReady();
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [selectedImage.id, dims, overlayOpacity, setOverlayOpacity],
  );

  // ── Draw all layout elements ────────────────────────────────────────────────
  const drawLayout = useCallback(
    (canvas: FabricCanvas, fabric: any) => {
      const { backWidth, spineWidth, frontWidth, height, totalWidth } = dims;
      const spineLeft = backWidth;
      const frontLeft = backWidth + spineWidth;

      // ── Dark overlay tint on back + front for text legibility ─────────────
      const backOverlay = new fabric.Rect({
        left: 0,
        top: 0,
        width: backWidth,
        height,
        fill: "rgba(0,0,0,0)",
        selectable: false,
        evented: false,
      });

      const frontOverlay = new fabric.Rect({
        left: frontLeft,
        top: 0,
        width: frontWidth,
        height,
        fill: "rgba(0,0,0,0)",
        selectable: false,
        evented: false,
      });

      // ── Spine overlay (slightly different tint) ────────────────────────────
      const spineOverlay = new fabric.Rect({
        left: spineLeft,
        top: 0,
        width: spineWidth,
        height,
        fill: "rgba(0,0,0,0)",
        selectable: false,
        evented: false,
      });
      objectsRef.current.backOverlay = backOverlay;
      objectsRef.current.frontOverlay = frontOverlay;
      objectsRef.current.spineOverlay = spineOverlay;

      // ── Divider lines ──────────────────────────────────────────────────────
      const divL = new fabric.Line([spineLeft, 0, spineLeft, height], {
        stroke: "rgba(201,168,76,0.7)",
        strokeWidth: 1,
        selectable: false,
        evented: false,
      });
      const divR = new fabric.Line([frontLeft, 0, frontLeft, height], {
        stroke: "rgba(201,168,76,0.7)",
        strokeWidth: 1,
        selectable: false,
        evented: false,
      });
      objectsRef.current.dividerLeft = divL;
      objectsRef.current.dividerRight = divR;

      // ── FRONT COVER: Title (TOP CENTER) ────────────────────────────────────
      const titleFront = new fabric.Textbox(bookData.title || "Book Title", {
        left: frontLeft + frontWidth / 2,
        top: 40,
        width: frontWidth - 56,
        fontSize: 48,
        fontFamily: "Georgia, serif",
        fontStyle: "italic",
        fontWeight: "bold",
        fill: "#f0ece3",
        textAlign: "center",
        lineHeight: 1.3,
        originX: "center",
        selectable: true,
        evented: true,
        shadow: new fabric.Shadow({
          color: "rgba(0,0,0,0.6)",
          blur: 8,
          offsetX: 0,
          offsetY: 2,
        }),
      });
      (titleFront as any).coverRole = "title";
      objectsRef.current.titleFront = titleFront;

      // ── FRONT COVER: Author (UNDER TITLE) ──────────────────────────────────
      const authorFront = new fabric.Textbox(bookData.author || "Author Name", {
        left: frontLeft + frontWidth / 2,
        top: 170,
        width: frontWidth - 56,
        fontSize: 18, // controlled by UI
        fontFamily: "Courier New, monospace",
        fill: "#c9a84c", // controlled by UI
        textAlign: "center",
        originX: "center",
        charSpacing: 80,
        selectable: true,
        evented: true,
        shadow: new fabric.Shadow({
          color: "rgba(0,0,0,0.5)",
          blur: 4,
          offsetX: 0,
          offsetY: 1,
        }),
      });
      (authorFront as any).coverRole = "author";
      objectsRef.current.authorFront = authorFront;

      const spineTitleFont = Math.min(14, spineWidth - 4);
      const spineAuthorFont = Math.min(12, Math.max(10, spineWidth - 8));

      // ── Spine: Title (vertical — layout refined after canvas.add)
      let titleSpine: FabricObject | null = null;
      if (spineWidth >= 24) {
        titleSpine = new fabric.Text(bookData.title || "Book Title", {
          left: spineLeft + spineWidth / 2,
          top: 48,
          fontSize: spineTitleFont,
          fontFamily: "Georgia, serif",
          fontStyle: "italic",
          fill: "#f0ece3",
          textAlign: "center",
          originX: "center",
          originY: "top",
          angle: 90,
          charSpacing: 40,
          selectable: true,
          evented: true,
        });
        (titleSpine as any).coverRole = "title";
        objectsRef.current.titleSpine = titleSpine;
      }

      // ── Spine: Author (stacked via layoutVerticalSpinePair)
      let authorSpine: FabricObject | null = null;
      if (spineWidth >= 24) {
        authorSpine = new fabric.Text(bookData.author || "Author", {
          left: spineLeft + spineWidth / 2,
          top: 160,
          fontSize: spineAuthorFont,
          fontFamily: "Courier New, monospace",
          fill: "#c9a84c",
          textAlign: "center",
          originX: "center",
          originY: "top",
          angle: 90,
          charSpacing: 50,
          selectable: true,
          evented: true,
        });
        (authorSpine as any).coverRole = "author";
        objectsRef.current.authorSpine = authorSpine;
      }

      // ── BACK COVER: Description (LEFT ALIGNED, INSIDE AREA) ─────────────────
      const backText = new fabric.Textbox(
        "This is your blurb! Use it to give the reader a short description of your book that leaves them wanting to read more.\n\nDon't know where to start? Try introducing your main characters, the conflict that they face and what might happen if they don't succeed.",
        {
          left: backWidth / 2,
          top: height / 2,
          originX: "center",
          originY: "center",
          width: Math.max(120, backWidth - 80),
          fontSize: 12,
          fontFamily: "Georgia, serif",
          fill: "rgba(240,236,227,0.9)",
          textAlign: "center",
          lineHeight: 1.5,
          selectable: true,
          evented: true,
        },
      );
      (backText as any).coverRole = "backCover";
      objectsRef.current.backText = backText;

      // ── BACK COVER: Barcode (BOTTOM RIGHT) ──────────────────────────────────
      const barcodeBox = new fabric.Rect({
        left: backWidth - 98,
        top: height - 70,
        width: 70,
        height: 46,
        fill: "rgba(255,255,255,0.15)",
        stroke: "rgba(255,255,255,0.25)",
        strokeWidth: 1,
        rx: 3,
        ry: 3,
        selectable: false,
        evented: false,
      });

      const barcodeLabel = new fabric.Text("ISBN\n0000000", {
        left: backWidth - 95,
        top: height - 65,
        fontSize: 8,
        fontFamily: "Courier New, monospace",
        fill: "rgba(255,255,255,0.4)",
        charSpacing: 80,
        lineHeight: 1.2,
        selectable: false,
        evented: false,
      });

      // ── Add all objects ────────────────────────────────────────────────────
      canvas.add(
        backOverlay,
        spineOverlay,
        frontOverlay,
        divL,
        divR,
        barcodeBox,
        barcodeLabel,
        backText,
        titleFront,
        authorFront,
      );

      if (titleSpine) canvas.add(titleSpine);
      if (authorSpine) canvas.add(authorSpine);

      if (titleSpine && spineWidth >= 24) {
        layoutVerticalSpinePair({
          titleSpine,
          authorSpine,
          spineLeft,
          spineWidth,
          height,
          titleFontPx: spineTitleFont,
          authorFontPx: spineAuthorFont,
        });
      }

      canvas.renderAll();
    },
    [bookData, dims],
  );

  // ── Update text objects without full reinit ─────────────────────────────────
  const updateTexts = useCallback(() => {
    const canvas = fabricRef.current;
    if (!canvas) return;
    const {
      titleFront,
      authorFront,
      titleSpine,
      authorSpine,
      backText,
    } = objectsRef.current;

    if (titleFront) titleFront.set("text", bookData.title || "Book Title");
    if (authorFront) authorFront.set("text", bookData.author || "Author Name");
    if (titleSpine) titleSpine.set("text", bookData.title || "Book Title");
    if (authorSpine) authorSpine.set("text", bookData.author || "Author");

    const sw = dims.spineWidth;
    if (titleSpine && sw >= 24) {
      layoutVerticalSpinePair({
        titleSpine,
        authorSpine,
        spineLeft: dims.backWidth,
        spineWidth: sw,
        height: dims.height,
        titleFontPx: Math.min(14, sw - 4),
        authorFontPx: Math.min(12, Math.max(10, sw - 8)),
      });
    }

    canvas.renderAll();
  }, [bookData, dims, fabricRef]);

  // ── Export PNG ──────────────────────────────────────────────────────────────
  const exportPNG = useCallback(() => {
    const canvas = fabricRef.current;
    if (!canvas) return;

    // Deselect all before export
    canvas.discardActiveObject();
    canvas.renderAll();

    const dataURL = canvas.toDataURL({
      format: "png",
      quality: 1,
      multiplier: 2, // 2× for high-DPI
    });

    const link = document.createElement("a");
    link.href = dataURL;
    link.download = `${
      bookData.title || "book-cover".replace(/\s+/g, "-").toLowerCase()
    }.png`;
    link.click();
  }, [fabricRef, bookData.title]);

  return { initCanvas, updateTexts, exportPNG, setOverlayOpacity };
}
