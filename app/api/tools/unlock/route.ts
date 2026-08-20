import { NextRequest, NextResponse } from "next/server";
import { getStorageProvider } from "@/lib/storage";
import { getPdfProcessor } from "@/lib/pdf/processor";
import { createJob, updateJobStatus } from "@/lib/jobs";
import { createFileMeta } from "@/lib/file-utils";
import { ApiResponse } from "@/types";

export async function POST(request: NextRequest): Promise<NextResponse<ApiResponse>> {
  try {
    const body = await request.json();
    const { fileId, password } = body;

    if (!fileId) {
      return NextResponse.json(
        { success: false, error: { code: "MISSING_FILE", message: "fileId is required" } },
        { status: 400 }
      );
    }

    if (!password || typeof password !== "string") {
      return NextResponse.json(
        { success: false, error: { code: "MISSING_PASSWORD", message: "password is required" } },
        { status: 400 }
      );
    }

    const storage = getStorageProvider();
    const buffer = await storage.download(fileId);

    const job = createJob("unlock-pdf", [fileId], buffer.length);
    updateJobStatus(job.id, "PROCESSING");

    const processor = getPdfProcessor();
    const buf = buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength) as ArrayBuffer;
    const result = await processor.removePassword(buf, password);
    const resultBuffer = Buffer.from(result);

    const outputMeta = createFileMeta("unlocked.pdf", resultBuffer.length, "application/pdf");
    await storage.upload(outputMeta.id, resultBuffer, "application/pdf");

    updateJobStatus(job.id, "COMPLETED", {
      outputFile: outputMeta.id,
      outputSize: resultBuffer.length,
    });

    return NextResponse.json({
      success: true,
      data: {
        jobId: job.id,
        status: "COMPLETED",
        downloadUrl: `/api/files/${outputMeta.id}`,
        outputSize: resultBuffer.length,
      },
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: { code: "UNLOCK_FAILED", message: "Failed to unlock PDF" } },
      { status: 500 }
    );
  }
}
