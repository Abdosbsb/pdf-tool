"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { PDFDocument } from "pdf-lib";
import { useLanguage } from "@/context/LanguageContext";
import ToolPage, { useToolPage } from "@/components/tools/ToolPage";
import Button from "@/components/ui/Button";
import Spinner from "@/components/ui/Spinner";

interface CapturedImage {
  blob: Blob;
  previewUrl: string;
  timestamp: number;
}

function ScanToPdfContent() {
  const { t } = useLanguage();
  const { state, startProcessing, complete, fail, reset } = useToolPage();
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [capturedImages, setCapturedImages] = useState<CapturedImage[]>([]);

  useEffect(() => {
    document.title = `${t("toolPages.scanToPdf")} - PDFCraft`;
  }, [t]);

  useEffect(() => {
    return () => {
      if (cameraStream) {
        cameraStream.getTracks().forEach((track) => track.stop());
      }
      capturedImages.forEach((img) => URL.revokeObjectURL(img.previewUrl));
    };
  }, []);

  const startCamera = useCallback(async () => {
    setCameraError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment", width: { ideal: 1920 }, height: { ideal: 1080 } },
      });
      setCameraStream(stream);
      setCameraActive(true);
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (err) {
      if (err instanceof DOMException && err.name === "NotAllowedError") {
        setCameraError(t("toolPages.cameraPermissionDenied"));
      } else if (err instanceof DOMException && err.name === "NotFoundError") {
        setCameraError(t("toolPages.cameraUnavailable"));
      } else {
        setCameraError(t("toolPages.cameraError"));
      }
    }
  }, [t]);

  const stopCamera = useCallback(() => {
    if (cameraStream) {
      cameraStream.getTracks().forEach((track) => track.stop());
      setCameraStream(null);
    }
    setCameraActive(false);
  }, [cameraStream]);

  const captureImage = useCallback(() => {
    if (!videoRef.current || !canvasRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.drawImage(video, 0, 0);

    canvas.toBlob(
      (blob) => {
        if (blob) {
          const previewUrl = URL.createObjectURL(blob);
          setCapturedImages((prev) => [
            ...prev,
            { blob, previewUrl, timestamp: Date.now() },
          ]);
        }
      },
      "image/jpeg",
      0.9
    );
  }, []);

  const removeImage = useCallback((index: number) => {
    setCapturedImages((prev) => {
      const img = prev[index];
      if (img) URL.revokeObjectURL(img.previewUrl);
      return prev.filter((_, i) => i !== index);
    });
  }, []);

  const moveImage = useCallback((index: number, direction: -1 | 1) => {
    setCapturedImages((prev) => {
      const newIndex = index + direction;
      if (newIndex < 0 || newIndex >= prev.length) return prev;
      const next = [...prev];
      [next[index], next[newIndex]] = [next[newIndex], next[index]];
      return next;
    });
  }, []);

  const handleCreatePdf = useCallback(async () => {
    if (capturedImages.length === 0) return;
    startProcessing();

    try {
      const pdfDoc = await PDFDocument.create();

      for (const img of capturedImages) {
        const arrayBuffer = await img.blob.arrayBuffer();
        const image = await pdfDoc.embedJpg(arrayBuffer);
        const page = pdfDoc.addPage([image.width, image.height]);
        page.drawImage(image, {
          x: 0,
          y: 0,
          width: image.width,
          height: image.height,
        });
      }

      const pdfBytes = await pdfDoc.save();
      const blob = new Blob([new Uint8Array(pdfBytes)], { type: "application/pdf" });
      const url = URL.createObjectURL(blob);
      complete(url, "scanned.pdf");
    } catch (err) {
      fail(err instanceof Error ? err.message : t("processing.failed"));
    }
  }, [capturedImages, startProcessing, complete, fail, t]);

  const handleReset = useCallback(() => {
    stopCamera();
    capturedImages.forEach((img) => URL.revokeObjectURL(img.previewUrl));
    setCapturedImages([]);
    setCameraError(null);
    reset();
  }, [capturedImages, stopCamera, reset]);

  return (
    <div className="space-y-6">
      {!cameraActive && !cameraError && (
        <div className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-gray-300 bg-gray-50 p-8 dark:border-gray-600 dark:bg-gray-900">
          <svg xmlns="http://www.w3.org/2000/svg" className="mb-3 h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6.827 6.175A2.31 2.31 0 015.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 00-1.134-.175 2.31 2.31 0 01-1.64-1.055l-.822-1.316a2.192 2.192 0 00-1.736-1.039 48.774 48.774 0 00-5.232 0 2.192 2.192 0 00-1.736 1.039l-.821 1.316z" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 12.75a4.5 4.5 0 11-9 0 4.5 4.5 0 019 0zM18.75 10.5h.008v.008h-.008V10.5z" />
          </svg>
          <Button variant="primary" size="lg" onClick={startCamera}>
            {t("toolPages.startCamera")}
          </Button>
        </div>
      )}

      {cameraError && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-center dark:border-red-800 dark:bg-red-950">
          <svg xmlns="http://www.w3.org/2000/svg" className="mx-auto mb-3 h-8 w-8 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
          </svg>
          <p className="text-sm font-medium text-red-700 dark:text-red-300">{cameraError}</p>
          <Button variant="secondary" size="sm" onClick={startCamera} className="mt-4">
            {t("toolPages.tryAgain")}
          </Button>
        </div>
      )}

      {cameraActive && (
        <div className="space-y-4">
          <div className="relative overflow-hidden rounded-xl border border-gray-200 bg-black dark:border-gray-700">
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="w-full"
            />
            <canvas ref={canvasRef} className="hidden" />
          </div>
          <div className="flex gap-3">
            <Button variant="primary" onClick={captureImage} className="flex-1">
              {t("toolPages.capture")}
            </Button>
            <Button variant="secondary" onClick={stopCamera}>
              {t("toolPages.stopCamera")}
            </Button>
          </div>
        </div>
      )}

      {capturedImages.length > 0 && state === "idle" && (
        <div className="space-y-4">
          <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
            {capturedImages.length} {capturedImages.length === 1 ? "page" : "pages"} captured
          </p>
          <ul className="space-y-2">
            {capturedImages.map((img, i) => (
              <li
                key={img.timestamp}
                className="flex items-center justify-between rounded-lg border border-gray-200 bg-white px-4 py-3 dark:border-gray-700 dark:bg-gray-800"
              >
                <div className="flex items-center gap-3 overflow-hidden">
                  <img
                    src={img.previewUrl}
                    alt={`Page ${i + 1}`}
                    className="h-10 w-10 shrink-0 rounded object-cover"
                  />
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      Page {i + 1}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => moveImage(i, -1)}
                    disabled={i === 0}
                    className="rounded p-1.5 text-gray-400 hover:bg-gray-100 disabled:opacity-30 dark:hover:bg-gray-700"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 15.75l7.5-7.5 7.5 7.5" />
                    </svg>
                  </button>
                  <button
                    type="button"
                    onClick={() => moveImage(i, 1)}
                    disabled={i === capturedImages.length - 1}
                    className="rounded p-1.5 text-gray-400 hover:bg-gray-100 disabled:opacity-30 dark:hover:bg-gray-700"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
                    </svg>
                  </button>
                  <button
                    type="button"
                    onClick={() => removeImage(i)}
                    className="rounded p-1.5 text-gray-400 hover:bg-red-100 hover:text-red-600 dark:hover:bg-red-900"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              </li>
            ))}
          </ul>

          <Button
            variant="primary"
            size="lg"
            onClick={handleCreatePdf}
            className="w-full"
          >
            {t("toolPages.createPdf")}
          </Button>
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
