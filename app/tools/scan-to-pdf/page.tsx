"use client";

import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { PDFDocument } from "pdf-lib";
import { useLanguage } from "@/context/LanguageContext";
import ToolPage, { useToolPage } from "@/components/tools/ToolPage";
import Button from "@/components/ui/Button";
import Spinner from "@/components/ui/Spinner";
import {
  CropData,
  PageSettings,
  defaultCrop,
  defaultSettings,
  processImage,
  detectDocumentEdges,
  blobToImage,
  canvasToBlob,
} from "@/lib/scanner/image-processing";

interface ScanPage {
  id: string;
  originalBlob: Blob;
  originalUrl: string;
  originalWidth: number;
  originalHeight: number;
  settings: PageSettings;
}

const FILTERS = [
  { id: "original", labelKey: "scanner.filterOriginal" },
  { id: "auto", labelKey: "scanner.filterAuto" },
  { id: "grayscale", labelKey: "scanner.filterGrayscale" },
  { id: "bw", labelKey: "scanner.filterBw" },
] as const;

function CropEditor({
  page,
  onUpdate,
  t,
}: {
  page: ScanPage;
  onUpdate: (s: PageSettings) => void;
  t: (k: string) => string;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [dragging, setDragging] = useState<string | null>(null);
  const [displaySize, setDisplaySize] = useState({ w: 0, h: 0 });

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const obs = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setDisplaySize({
          w: entry.contentRect.width,
          h: entry.contentRect.height,
        });
      }
    });
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  const scaleX = displaySize.w / page.originalWidth;
  const scaleY = displaySize.h / page.originalHeight;

  const toDisplay = (p: { x: number; y: number }) => ({
    x: p.x * scaleX,
    y: p.y * scaleY,
  });

  const fromDisplay = (dx: number, dy: number) => ({
    x: Math.max(0, Math.min(page.originalWidth, dx / scaleX)),
    y: Math.max(0, Math.min(page.originalHeight, dy / scaleY)),
  });

  const corners = [
    { key: "topLeft" as const },
    { key: "topRight" as const },
    { key: "bottomRight" as const },
    { key: "bottomLeft" as const },
  ];

  const handlePointerDown = (key: string, e: React.PointerEvent) => {
    e.preventDefault();
    e.stopPropagation();
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    setDragging(key);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!dragging || !containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const pos = fromDisplay(e.clientX - rect.left, e.clientY - rect.top);
    onUpdate({ ...page.settings, crop: { ...page.settings.crop, [dragging]: pos } });
  };

  const handlePointerUp = () => setDragging(null);

  const crop = page.settings.crop;
  const dp = {
    tl: toDisplay(crop.topLeft),
    tr: toDisplay(crop.topRight),
    br: toDisplay(crop.bottomRight),
    bl: toDisplay(crop.bottomLeft),
  };

  return (
    <div className="space-y-2">
      <p className="text-xs font-medium text-gray-500 dark:text-gray-400">
        {t("scanner.dragCorners")}
      </p>
      <div
        ref={containerRef}
        className="relative w-full overflow-hidden rounded-lg border border-gray-300 dark:border-gray-600 select-none touch-none"
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        style={{ aspectRatio: `${page.originalWidth}/${page.originalHeight}` }}
      >
        <img
          src={page.originalUrl}
          alt=""
          className="absolute inset-0 h-full w-full object-contain pointer-events-none"
          draggable={false}
        />
        <svg
          className="absolute inset-0 h-full w-full pointer-events-none"
          viewBox={`0 0 ${displaySize.w} ${displaySize.h}`}
        >
          <polygon
            points={`${dp.tl.x},${dp.tl.y} ${dp.tr.x},${dp.tr.y} ${dp.br.x},${dp.br.y} ${dp.bl.x},${dp.bl.y}`}
            fill="rgba(59,130,246,0.15)"
            stroke="#3b82f6"
            strokeWidth="2"
          />
        </svg>
        {corners.map(({ key }) => {
          const d = toDisplay(crop[key]);
          return (
            <div
              key={key}
              className="absolute z-10 h-7 w-7 -translate-x-1/2 -translate-y-1/2 cursor-grab active:cursor-grabbing rounded-full border-2 border-white bg-blue-500 shadow-lg"
              style={{ left: d.x, top: d.y }}
              onPointerDown={(e) => handlePointerDown(key, e)}
            />
          );
        })}
      </div>
    </div>
  );
}

function FilterBar({
  selected,
  onChange,
  previewUrls,
  t,
}: {
  selected: string;
  onChange: (f: string) => void;
  previewUrls: string[];
  t: (k: string) => string;
}) {
  return (
    <div className="space-y-2">
      <p className="text-xs font-medium text-gray-500 dark:text-gray-400">
        {t("scanner.enhancement")}
      </p>
      <div className="flex gap-2 overflow-x-auto pb-1">
        {FILTERS.map((f, i) => (
          <button
            key={f.id}
            type="button"
            onClick={() => onChange(f.id)}
            className={`shrink-0 flex flex-col items-center gap-1 rounded-lg p-1.5 text-[10px] font-medium transition-colors ${
              selected === f.id
                ? "bg-blue-100 text-blue-700 ring-2 ring-blue-500 dark:bg-blue-900 dark:text-blue-300"
                : "bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600"
            }`}
          >
            <div className="h-10 w-14 overflow-hidden rounded bg-gray-200 dark:bg-gray-600">
              {previewUrls[i] ? (
                <img src={previewUrls[i]} alt={t(f.labelKey)} className="h-full w-full object-cover" />
              ) : (
                <div className="h-full w-full animate-pulse bg-gray-300 dark:bg-gray-500" />
              )}
            </div>
            <span className="truncate max-w-[60px]">{t(f.labelKey)}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

function Adjustments({
  settings,
  onChange,
  t,
}: {
  settings: PageSettings;
  onChange: (s: PageSettings) => void;
  t: (k: string) => string;
}) {
  const sliders = [
    { key: "brightness" as const, label: t("scanner.brightness"), min: -50, max: 50 },
    { key: "contrast" as const, label: t("scanner.contrast"), min: -50, max: 50 },
    { key: "sharpness" as const, label: t("scanner.sharpness"), min: 0, max: 100 },
  ];

  return (
    <div className="space-y-3">
      {sliders.map(({ key, label, min, max }) => (
        <div key={key}>
          <div className="flex items-center justify-between">
            <label className="text-xs font-medium text-gray-500 dark:text-gray-400">{label}</label>
            <span className="text-xs text-gray-400">{settings[key]}</span>
          </div>
          <input
            type="range"
            min={min}
            max={max}
            value={settings[key]}
            onChange={(e) => onChange({ ...settings, [key]: Number(e.target.value) })}
            className="w-full accent-blue-500"
          />
        </div>
      ))}
    </div>
  );
}

function ProcessedPreview({ page }: { page: ScanPage }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const imgRef = useRef<HTMLImageElement | null>(null);

  useEffect(() => {
    let cancelled = false;
    const render = async () => {
      try {
        if (!imgRef.current) {
          imgRef.current = await blobToImage(page.originalBlob);
        }
        if (cancelled) return;
        const canvas = canvasRef.current;
        if (!canvas) return;
        const processed = processImage(imgRef.current, page.settings);
        canvas.width = processed.width;
        canvas.height = processed.height;
        const ctx = canvas.getContext("2d");
        if (ctx) ctx.drawImage(processed, 0, 0);
      } catch {}
    };
    render();
    return () => { cancelled = true; };
  }, [page.settings, page.originalBlob]);

  useEffect(() => { imgRef.current = null; }, [page.originalBlob]);

  return (
    <div ref={containerRef} className="w-full">
      <canvas ref={canvasRef} className="w-full h-auto rounded-lg" style={{ objectFit: "contain" }} />
    </div>
  );
}

function ScanToPdfContent() {
  const { t } = useLanguage();
  const { state, startProcessing, complete, fail, reset } = useToolPage();

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [view, setView] = useState<"idle" | "camera" | "preview" | "crop" | "enhance" | "pages" | "done">("idle");
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [cameraReady, setCameraReady] = useState(false);
  const [facingMode, setFacingMode] = useState<"environment" | "user">("environment");
  const [hasMultipleCameras, setHasMultipleCameras] = useState(false);
  const [torchSupported, setTorchSupported] = useState(false);
  const [torchOn, setTorchOn] = useState(false);

  const [pages, setPages] = useState<ScanPage[]>([]);
  const [selectedPageId, setSelectedPageId] = useState<string | null>(null);
  const [capturedImageUrl, setCapturedImageUrl] = useState<string | null>(null);
  const [capturedBlob, setCapturedBlob] = useState<Blob | null>(null);
  const [capturedDims, setCapturedDims] = useState<{ w: number; h: number } | null>(null);

  const [processing, setProcessing] = useState(false);
  const [processingMsg, setProcessingMsg] = useState("");
  const [fileName, setFileName] = useState("scanned-document");
  const [filterPreviews, setFilterPreviews] = useState<Record<string, string[]>>({});
  const [generating, setGenerating] = useState(false);
  const [pdfResult, setPdfResult] = useState<{ url: string; blob: Blob } | null>(null);

  const selectedPage = useMemo(
    () => pages.find((p) => p.id === selectedPageId) || null,
    [pages, selectedPageId]
  );

  useEffect(() => {
    document.title = `${t("toolPages.scanToPdf")} - PDFCraft`;
  }, [t]);

  useEffect(() => {
    return () => {
      stopCamera();
      pages.forEach((p) => URL.revokeObjectURL(p.originalUrl));
      if (capturedImageUrl) URL.revokeObjectURL(capturedImageUrl);
      if (pdfResult) URL.revokeObjectURL(pdfResult.url);
    };
  }, []);

  useEffect(() => {
    if (view === "camera" && streamRef.current && videoRef.current && !videoRef.current.srcObject) {
      const video = videoRef.current;
      video.srcObject = streamRef.current;
      video.play().then(() => {
        const check = () => {
          if (video.videoWidth > 0 && video.videoHeight > 0) {
            setCameraReady(true);
          } else {
            setTimeout(check, 100);
          }
        };
        check();
      }).catch(() => {});
    }
  }, [view]);

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) videoRef.current.srcObject = null;
    setCameraReady(false);
    setTorchSupported(false);
    setTorchOn(false);
  }, []);

  const startCamera = useCallback(async (facing?: "environment" | "user") => {
    setCameraError(null);
    setCameraReady(false);
    const mode = facing || facingMode;

    stopCamera();

    try {
      if (!navigator.mediaDevices?.getUserMedia) {
        setCameraError(t("toolPages.cameraNotSupported"));
        return;
      }

      const devices = await navigator.mediaDevices.enumerateDevices();
      const vids = devices.filter((d) => d.kind === "videoinput");
      setHasMultipleCameras(vids.length > 1);

      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: mode }, width: { ideal: 1920 }, height: { ideal: 1080 } },
        audio: false,
      });

      streamRef.current = stream;

      const track = stream.getVideoTracks()[0];
      const caps = track.getCapabilities?.() as MediaTrackCapabilities | undefined;
      if (caps && "torch" in (caps as Record<string, unknown>)) {
        setTorchSupported(true);
      }

      const video = videoRef.current;
      if (!video) {
        setView("camera");
        return;
      }

      video.srcObject = stream;

      await new Promise<void>((resolve) => {
        const onMeta = () => {
          video.removeEventListener("loadedmetadata", onMeta);
          video.play().then(() => {
            const check = () => {
              if (video.videoWidth > 0 && video.videoHeight > 0) {
                setCameraReady(true);
                setView("camera");
                resolve();
              } else {
                setTimeout(check, 100);
              }
            };
            check();
          }).catch(() => {
            setCameraError(t("toolPages.cameraError"));
            resolve();
          });
        };
        video.addEventListener("loadedmetadata", onMeta);
      });
    } catch (err) {
      if (err instanceof DOMException) {
        if (err.name === "NotAllowedError") setCameraError(t("scanner.permissionDenied"));
        else if (err.name === "NotFoundError" || err.name === "DevicesNotFoundError") setCameraError(t("scanner.cameraUnavailable"));
        else if (err.name === "NotReadableError" || err.name === "TrackStartError") setCameraError(t("scanner.cameraInUse"));
        else setCameraError(t("toolPages.cameraError"));
      } else {
        setCameraError(t("toolPages.cameraError"));
      }
    }
  }, [facingMode, t, stopCamera]);

  const toggleTorch = useCallback(async () => {
    const track = streamRef.current?.getVideoTracks()[0];
    if (!track) return;
    try {
      const newTorch = !torchOn;
      await track.applyConstraints({ advanced: [{ torch: newTorch } as MediaTrackConstraintSet] });
      setTorchOn(newTorch);
    } catch {}
  }, [torchOn]);

  const switchCamera = useCallback(async () => {
    const newFacing = facingMode === "environment" ? "user" : "environment";
    setFacingMode(newFacing);
    await startCamera(newFacing);
  }, [facingMode, startCamera]);

  const captureFrame = useCallback(() => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas || video.readyState < 2 || video.videoWidth === 0) return;

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    canvas.toBlob(async (blob) => {
      if (!blob) return;
      stopCamera();
      const url = URL.createObjectURL(blob);
      if (capturedImageUrl) URL.revokeObjectURL(capturedImageUrl);
      setCapturedImageUrl(url);
      setCapturedBlob(blob);
      setCapturedDims({ w: canvas.width, h: canvas.height });
      setView("preview");
    }, "image/jpeg", 0.92);
  }, [stopCamera, capturedImageUrl]);

  const handleRetake = useCallback(() => {
    if (capturedImageUrl) URL.revokeObjectURL(capturedImageUrl);
    setCapturedImageUrl(null);
    setCapturedBlob(null);
    setCapturedDims(null);
    startCamera(facingMode);
  }, [capturedImageUrl, startCamera, facingMode]);

  const processCapturedImage = useCallback(async (filter?: string) => {
    if (!capturedBlob || !capturedDims) return;
    setProcessing(true);
    setProcessingMsg(t("scanner.detectingDocument"));

    try {
      const img = await blobToImage(capturedBlob);
      setProcessingMsg(t("scanner.processingImage"));

      const detectedCrop = detectDocumentEdges(img);
      const s = defaultSettings(capturedDims.w, capturedDims.h);
      if (detectedCrop) s.crop = detectedCrop;
      if (filter) s.filter = filter;

      const page: ScanPage = {
        id: `page-${Date.now()}-${Math.random().toString(36).slice(2)}`,
        originalBlob: capturedBlob,
        originalUrl: capturedImageUrl!,
        originalWidth: capturedDims.w,
        originalHeight: capturedDims.h,
        settings: s,
      };

      setPages((prev) => [...prev, page]);
      setSelectedPageId(page.id);
      setView("enhance");
    } catch {
      const s = defaultSettings(capturedDims.w, capturedDims.h);
      const page: ScanPage = {
        id: `page-${Date.now()}-${Math.random().toString(36).slice(2)}`,
        originalBlob: capturedBlob,
        originalUrl: capturedImageUrl!,
        originalWidth: capturedDims.w,
        originalHeight: capturedDims.h,
        settings: s,
      };
      setPages((prev) => [...prev, page]);
      setSelectedPageId(page.id);
      setView("enhance");
    } finally {
      setProcessing(false);
    }
  }, [capturedBlob, capturedDims, capturedImageUrl, t]);

  const handleUseImage = useCallback(() => {
    processCapturedImage();
  }, [processCapturedImage]);

  const handleFileUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = "";

    setProcessing(true);
    setProcessingMsg(t("scanner.processingImage"));

    try {
      const blob = new Blob([await file.arrayBuffer()], { type: file.type });
      const url = URL.createObjectURL(blob);
      const img = await blobToImage(blob);
      const w = img.naturalWidth;
      const h = img.naturalHeight;

      const s = defaultSettings(w, h);
      const detectedCrop = detectDocumentEdges(img);
      if (detectedCrop) s.crop = detectedCrop;

      const page: ScanPage = {
        id: `page-${Date.now()}-${Math.random().toString(36).slice(2)}`,
        originalBlob: blob,
        originalUrl: url,
        originalWidth: w,
        originalHeight: h,
        settings: s,
      };

      setPages((prev) => [...prev, page]);
      setSelectedPageId(page.id);
      setView("enhance");
    } catch {
      setCameraError(t("scanner.processingFailed"));
    } finally {
      setProcessing(false);
    }
  }, [t]);

  const updatePageSettings = useCallback((pageId: string, settings: PageSettings) => {
    setPages((prev) => prev.map((p) => (p.id === pageId ? { ...p, settings } : p)));
  }, []);

  const deletePage = useCallback((pageId: string) => {
    setPages((prev) => {
      const page = prev.find((p) => p.id === pageId);
      if (page) URL.revokeObjectURL(page.originalUrl);
      const next = prev.filter((p) => p.id !== pageId);
      if (selectedPageId === pageId) {
        setSelectedPageId(next.length > 0 ? next[0].id : null);
        if (next.length === 0) setView("idle");
        else setView("pages");
      }
      return next;
    });
  }, [selectedPageId]);

  const movePage = useCallback((pageId: string, dir: -1 | 1) => {
    setPages((prev) => {
      const idx = prev.findIndex((p) => p.id === pageId);
      const newIdx = idx + dir;
      if (newIdx < 0 || newIdx >= prev.length) return prev;
      const next = [...prev];
      [next[idx], next[newIdx]] = [next[newIdx], next[idx]];
      return next;
    });
  }, []);

  const generateFilterPreviews = useCallback(async (page: ScanPage) => {
    try {
      const img = await blobToImage(page.originalBlob);
      const previews: string[] = [];
      for (const f of FILTERS) {
        const s: PageSettings = { ...page.settings, filter: f.id, brightness: 0, contrast: 0, sharpness: 0, rotation: 0 };
        const canvas = processImage(img, s);
        const blob = await canvasToBlob(canvas, "image/jpeg", 0.6);
        previews.push(URL.createObjectURL(blob));
      }
      setFilterPreviews((prev) => ({ ...prev, [page.id]: previews }));
    } catch {}
  }, []);

  useEffect(() => {
    if (selectedPage && !filterPreviews[selectedPage.id]) {
      generateFilterPreviews(selectedPage);
    }
  }, [selectedPage, filterPreviews, generateFilterPreviews]);

  const createPdf = useCallback(async () => {
    if (pages.length === 0) return;
    setGenerating(true);
    startProcessing();

    try {
      const pdfDoc = await PDFDocument.create();
      for (const page of pages) {
        const img = await blobToImage(page.originalBlob);
        const canvas = processImage(img, page.settings);
        const jpgBlob = await canvasToBlob(canvas, "image/jpeg", 0.92);
        const arrBuf = await jpgBlob.arrayBuffer();

        let embedded;
        try {
          embedded = await pdfDoc.embedJpg(arrBuf);
        } catch {
          const pngBlob = await canvasToBlob(canvas, "image/png");
          const pngBuf = await pngBlob.arrayBuffer();
          embedded = await pdfDoc.embedPng(pngBuf);
        }

        const pdfPage = pdfDoc.addPage([embedded.width, embedded.height]);
        pdfPage.drawImage(embedded, { x: 0, y: 0, width: embedded.width, height: embedded.height });
      }

      const pdfBytes = await pdfDoc.save();
      const blob = new Blob([new Uint8Array(pdfBytes)], { type: "application/pdf" });
      const url = URL.createObjectURL(blob);
      if (pdfResult) URL.revokeObjectURL(pdfResult.url);
      setPdfResult({ url, blob });
      setView("done");
    } catch (err) {
      fail(err instanceof Error ? err.message : t("processing.failed"));
    } finally {
      setGenerating(false);
    }
  }, [pages, fail, t, pdfResult, startProcessing]);

  const handleDownload = useCallback(() => {
    if (!pdfResult) return;
    const name = fileName.trim() || "scanned-document";
    complete(pdfResult.url, name.endsWith(".pdf") ? name : `${name}.pdf`);
  }, [pdfResult, fileName, complete]);

  const handleResetAll = useCallback(() => {
    stopCamera();
    pages.forEach((p) => URL.revokeObjectURL(p.originalUrl));
    Object.values(filterPreviews).flat().forEach((url) => URL.revokeObjectURL(url));
    if (capturedImageUrl) URL.revokeObjectURL(capturedImageUrl);
    if (pdfResult) URL.revokeObjectURL(pdfResult.url);
    setPages([]);
    setSelectedPageId(null);
    setCapturedImageUrl(null);
    setCapturedBlob(null);
    setCapturedDims(null);
    setFilterPreviews({});
    setPdfResult(null);
    setView("idle");
    setCameraError(null);
    setFileName("scanned-document");
    reset();
  }, [pages, filterPreviews, capturedImageUrl, pdfResult, stopCamera, reset]);

  const handleResetPage = useCallback(() => {
    if (!selectedPage) return;
    updatePageSettings(selectedPage.id, defaultSettings(selectedPage.originalWidth, selectedPage.originalHeight));
  }, [selectedPage, updatePageSettings]);

  if (state === "completed" && pdfResult) {
    return (
      <div className="space-y-4">
        <iframe src={pdfResult.url} className="w-full rounded-lg border border-gray-200 dark:border-gray-700" style={{ height: "70vh" }} title={t("scanner.pdfPreview")} />
        <div className="flex gap-3">
          <Button variant="primary" size="lg" onClick={handleDownload} className="flex-1">{t("scanner.downloadPdf")}</Button>
          <Button variant="secondary" size="lg" onClick={handleResetAll} className="flex-1">{t("scanner.scanAnother")}</Button>
        </div>
      </div>
    );
  }

  if (state === "completed") {
    return (
      <div className="space-y-4">
        <Button variant="primary" size="lg" onClick={handleResetAll} className="w-full">{t("scanner.scanAnother")}</Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {view === "idle" && !cameraError && (
        <div className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-gray-300 bg-gray-50 p-8 dark:border-gray-600 dark:bg-gray-900">
          <svg xmlns="http://www.w3.org/2000/svg" className="mb-4 h-16 w-16 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6.827 6.175A2.31 2.31 0 015.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 00-1.134-.175 2.31 2.31 0 01-1.64-1.055l-.822-1.316a2.192 2.192 0 00-1.736-1.039 48.774 48.774 0 00-5.232 0 2.192 2.192 0 00-1.736 1.039l-.821 1.316z" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 12.75a4.5 4.5 0 11-9 0 4.5 4.5 0 019 0z" />
          </svg>
          <p className="mb-6 text-center text-gray-600 dark:text-gray-300">{t("scanner.chooseSource")}</p>
          <div className="flex flex-col gap-3 sm:flex-row">
            <Button variant="primary" size="lg" onClick={() => startCamera()}>{t("scanner.openCamera")}</Button>
            <Button variant="secondary" size="lg" onClick={() => fileInputRef.current?.click()}>{t("scanner.chooseImage")}</Button>
          </div>
          <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleFileUpload} />
        </div>
      )}

      {cameraError && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-center dark:border-red-800 dark:bg-red-950">
          <svg xmlns="http://www.w3.org/2000/svg" className="mx-auto mb-3 h-8 w-8 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
          </svg>
          <p className="text-sm font-medium text-red-700 dark:text-red-300">{cameraError}</p>
          <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:justify-center">
            <Button variant="secondary" size="sm" onClick={() => { setCameraError(null); startCamera(); }}>{t("toolPages.tryAgain")}</Button>
            <Button variant="secondary" size="sm" onClick={() => { setCameraError(null); fileInputRef.current?.click(); }}>{t("scanner.chooseImage")}</Button>
          </div>
          <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleFileUpload} />
        </div>
      )}

      {view === "camera" && (
        <div className="fixed inset-0 z-50 bg-black flex flex-col">
          <div className="relative flex-1 overflow-hidden bg-black">
            <video ref={videoRef} autoPlay playsInline muted className="absolute inset-0 h-full w-full object-contain" />
            <canvas ref={canvasRef} className="hidden" />
            {cameraReady && (
              <div className="pointer-events-none absolute inset-6 sm:inset-10">
                <div className="h-full w-full rounded-xl border-2 border-dashed border-white/30" />
              </div>
            )}
            {!cameraReady && !cameraError && (
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="text-center text-white">
                  <Spinner size="lg" />
                  <p className="mt-3 text-sm opacity-70">{t("scanner.openingCamera")}</p>
                </div>
              </div>
            )}
          </div>

          <div className="safe-bottom flex items-center justify-between bg-black px-6 py-4">
            <button type="button" onClick={() => { stopCamera(); setView(pages.length > 0 ? "pages" : "idle"); }} className="rounded-full bg-white/10 p-3 text-white hover:bg-white/20 transition-colors">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>

            <button
              type="button"
              onClick={captureFrame}
              disabled={!cameraReady}
              className="h-16 w-16 rounded-full border-4 border-white bg-white/20 transition-all hover:bg-white/30 active:scale-95 disabled:opacity-30"
            />

            <div className="flex gap-2">
              {torchSupported && (
                <button type="button" onClick={toggleTorch} className={`rounded-full p-3 transition-colors ${torchOn ? "bg-yellow-500 text-black" : "bg-white/10 text-white hover:bg-white/20"}`}>
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z" />
                  </svg>
                </button>
              )}
              {hasMultipleCameras && (
                <button type="button" onClick={switchCamera} className="rounded-full bg-white/10 p-3 text-white hover:bg-white/20 transition-colors">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182" />
                  </svg>
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {processing && (
        <div className="flex flex-col items-center justify-center rounded-xl border border-gray-200 bg-gray-50 py-10 dark:border-gray-700 dark:bg-gray-900">
          <Spinner size="lg" />
          <p className="mt-4 text-sm font-medium text-gray-700 dark:text-gray-300">{processingMsg}</p>
        </div>
      )}

      {view === "preview" && capturedImageUrl && !processing && (
        <div className="space-y-4">
          <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">{t("scanner.preview")}</h3>
          <div className="relative overflow-hidden rounded-xl border border-gray-200 bg-gray-100 dark:border-gray-700 dark:bg-gray-800">
            <img src={capturedImageUrl} alt="" className="w-full rounded-lg object-contain" />
          </div>
          <div className="flex gap-3">
            <Button variant="secondary" size="lg" onClick={handleRetake} className="flex-1">{t("scanner.retake")}</Button>
            <Button variant="primary" size="lg" onClick={handleUseImage} className="flex-1">{t("scanner.useImage")}</Button>
          </div>
        </div>
      )}

      {view === "crop" && selectedPage && !processing && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">{t("scanner.adjustBorders")}</h3>
            <div className="flex gap-2">
              <button type="button" onClick={handleResetPage} className="rounded-lg bg-gray-100 p-2 text-gray-600 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600" title={t("scanner.reset")}>
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182" />
                </svg>
              </button>
            </div>
          </div>
          <CropEditor page={selectedPage} onUpdate={(s) => updatePageSettings(selectedPage.id, s)} t={t} />
          <Button variant="primary" size="lg" onClick={() => setView("enhance")} className="w-full">{t("common.done")}</Button>
        </div>
      )}

      {view === "enhance" && selectedPage && !processing && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">
              {t("scanner.page")} {pages.indexOf(selectedPage) + 1} / {pages.length}
            </h3>
            <button type="button" onClick={() => setView("crop")} className="rounded-lg bg-blue-50 px-3 py-1.5 text-xs font-medium text-blue-600 hover:bg-blue-100 dark:bg-blue-900 dark:text-blue-300 dark:hover:bg-blue-800">
              {t("scanner.editBorders")}
            </button>
          </div>

          <div className="relative overflow-hidden rounded-xl border border-gray-200 bg-gray-100 dark:border-gray-700 dark:bg-gray-800">
            <ProcessedPreview page={selectedPage} />
          </div>

          <div className="space-y-4 rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
            <FilterBar
              selected={selectedPage.settings.filter}
              onChange={(f) => updatePageSettings(selectedPage.id, { ...selectedPage.settings, filter: f })}
              previewUrls={filterPreviews[selectedPage.id] || []}
              t={t}
            />
            <Adjustments settings={selectedPage.settings} onChange={(s) => updatePageSettings(selectedPage.id, s)} t={t} />
          </div>

          <div className="flex gap-3">
            <Button variant="primary" size="lg" onClick={() => setView("pages")} className="flex-1">{t("common.done")}</Button>
          </div>
        </div>
      )}

      {(view === "pages" || (view === "enhance" && selectedPage && !processing)) && pages.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-medium text-gray-500 dark:text-gray-400">
            {t("scanner.pages")} ({pages.length})
          </p>
          <div className="flex gap-2 overflow-x-auto pb-1">
            {pages.map((page, i) => (
              <div
                key={page.id}
                onClick={() => {
                  setSelectedPageId(page.id);
                  setView("enhance");
                }}
                className={`group relative shrink-0 cursor-pointer overflow-hidden rounded-lg border-2 transition-colors ${
                  selectedPageId === page.id
                    ? "border-blue-500 ring-2 ring-blue-200 dark:ring-blue-800"
                    : "border-gray-200 hover:border-gray-300 dark:border-gray-700"
                }`}
                style={{ width: 64, height: 80 }}
              >
                <img src={page.originalUrl} alt={`${t("scanner.page")} ${i + 1}`} className="h-full w-full object-cover" />
                <div className="absolute bottom-0 inset-x-0 bg-black/50 px-1 py-0.5 text-center text-[10px] text-white">{i + 1}</div>
                <div className="absolute top-0.5 right-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button type="button" onClick={(e) => { e.stopPropagation(); deletePage(page.id); }} className="rounded-full bg-red-500 p-0.5 text-white">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-2.5 w-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
                {pages.length > 1 && (
                  <div className="absolute top-0.5 left-0.5 flex flex-col gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button type="button" onClick={(e) => { e.stopPropagation(); movePage(page.id, -1); }} disabled={i === 0} className="rounded-full bg-black/50 p-0.5 text-white disabled:opacity-30">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-2.5 w-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 15.75l7.5-7.5 7.5 7.5" />
                      </svg>
                    </button>
                    <button type="button" onClick={(e) => { e.stopPropagation(); movePage(page.id, 1); }} disabled={i === pages.length - 1} className="rounded-full bg-black/50 p-0.5 text-white disabled:opacity-30">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-2.5 w-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
                      </svg>
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {view === "pages" && pages.length > 0 && (
        <div className="space-y-3">
          <div className="flex gap-3">
            <Button variant="secondary" size="lg" onClick={() => startCamera()} className="flex-1">{t("scanner.addPage")}</Button>
            <Button variant="secondary" size="lg" onClick={() => fileInputRef.current?.click()} className="flex-1">{t("scanner.chooseImage")}</Button>
            <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleFileUpload} />
          </div>

          <div>
            <label className="text-xs font-medium text-gray-500 dark:text-gray-400">{t("scanner.fileName")}</label>
            <input
              type="text"
              value={fileName}
              onChange={(e) => setFileName(e.target.value)}
              className="mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 dark:border-gray-600 dark:bg-gray-800 dark:text-white"
              placeholder="scanned-document"
            />
          </div>

          <Button variant="primary" size="lg" onClick={createPdf} disabled={generating} className="w-full">
            {generating ? t("scanner.creatingPdf") : t("toolPages.createPdf")}
          </Button>
        </div>
      )}

      {view === "done" && pdfResult && (
        <div className="space-y-4">
          <iframe src={pdfResult.url} className="w-full rounded-lg border border-gray-200 dark:border-gray-700" style={{ height: "60vh" }} title={t("scanner.pdfPreview")} />
          <div className="space-y-3">
            <div>
              <label className="text-xs font-medium text-gray-500 dark:text-gray-400">{t("scanner.fileName")}</label>
              <input type="text" value={fileName} onChange={(e) => setFileName(e.target.value)} className="mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 dark:border-gray-600 dark:bg-gray-800 dark:text-white" />
            </div>
            <div className="flex gap-3">
              <Button variant="primary" size="lg" onClick={handleDownload} className="flex-1">{t("scanner.downloadPdf")}</Button>
              <Button variant="secondary" size="lg" onClick={() => setView("pages")} className="flex-1">{t("scanner.editPages")}</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function ScanToPdfPage() {
  return (
    <ToolPage toolId="scan-to-pdf">
      <ScanToPdfContent />
    </ToolPage>
  );
}
