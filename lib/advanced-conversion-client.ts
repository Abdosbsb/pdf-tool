interface StartConversionResponse {
  success: boolean;
  data?: { jobId: string; conversion: string };
  error?: { code: string; message: string };
}

interface PollConversionResponse {
  success: boolean;
  data?: { status: string };
  error?: { code: string; message: string };
}

export interface ConversionResult {
  blob: Blob;
  filename: string;
}

const POLL_INTERVAL_MS = 3000;
const MAX_POLL_ATTEMPTS = 120;

export async function runConversion(
  file: File,
  conversion: string,
  outputFilename: string,
  onProgress?: (message: string) => void
): Promise<ConversionResult> {
  onProgress?.("Uploading file...");

  const formData = new FormData();
  formData.append("file", file);
  formData.append("conversion", conversion);

  const startRes = await fetch("/api/tools/advanced", {
    method: "POST",
    body: formData,
  });

  if (!startRes.ok) {
    const contentType = startRes.headers.get("content-type") || "";
    if (contentType.includes("application/json")) {
      const err: StartConversionResponse = await startRes.json();
      if (err.error?.code === "PROVIDER_REQUIRED") {
        throw new Error("PROVIDER_REQUIRED");
      }
      throw new Error(err.error?.message || "Failed to start conversion");
    }
    throw new Error("Failed to start conversion");
  }

  const startData: StartConversionResponse = await startRes.json();
  if (!startData.success || !startData.data?.jobId) {
    throw new Error(startData.error?.message || "Failed to start conversion");
  }

  const { jobId } = startData.data;
  onProgress?.("Converting...");

  for (let attempt = 0; attempt < MAX_POLL_ATTEMPTS; attempt++) {
    await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS));

    const pollRes = await fetch(
      `/api/tools/advanced?jobId=${encodeURIComponent(jobId)}&conversion=${encodeURIComponent(conversion)}`
    );

    const contentType = pollRes.headers.get("content-type") || "";

    if (!contentType.includes("application/json")) {
      const blob = await pollRes.blob();
      return { blob, filename: outputFilename };
    }

    const pollData: PollConversionResponse = await pollRes.json();

    if (!pollData.success) {
      throw new Error(pollData.error?.message || "Conversion failed");
    }

    if (pollData.data?.status === "finished") {
      const pollRes2 = await fetch(
        `/api/tools/advanced?jobId=${encodeURIComponent(jobId)}&conversion=${encodeURIComponent(conversion)}`
      );
      const ct2 = pollRes2.headers.get("content-type") || "";
      if (!ct2.includes("application/json")) {
        const blob = await pollRes2.blob();
        return { blob, filename: outputFilename };
      }
      throw new Error("Conversion completed but no output was returned");
    }

    if (attempt % 5 === 0 && attempt > 0) {
      onProgress?.(`Converting... (${Math.round((attempt * POLL_INTERVAL_MS) / 1000)}s)`);
    }
  }

  throw new Error("Conversion timed out. The file may be too large or complex.");
}
