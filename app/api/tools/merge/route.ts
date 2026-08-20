import { NextRequest, NextResponse } from "next/server";
import { getStorageProvider } from "@/lib/storage";
import { getPdfProcessor } from "@/lib/pdf/processor";
import { createJob, updateJobStatus } from "@/lib/jobs";
import { createFileMeta } from "@/lib/file-utils";
import { ApiResponse } from "@/types";

export async function POST(request: NextRequest): Promise<NextResponse<ApiResponse>> {
  try {
    const body = await request.json();
    const { fileIds, options } = body;

    if (!fileIds || !Array.isArray(fileIds) || fileIds.length < 2) {
      return NextResponse.json(
        { success: false, error: { code: "INVALID_INPUT", message: "At least 2 fileIds are required" } },
        { status: 400 }
      );
    }

    const storage = getStorageProvider();
    const buffers: ArrayBuffer[] = [];

    for (const fileId of fileIds) {
      const buffer = await storage.download(fileId);
      buffers.push(buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength) as ArrayBuffer);
    }

    const inputSize = buffers.reduce((sum, b) => sum + b.byteLength, 0);
    const job = createJob("merge-pdf", fileIds, inputSize, options);

    updateJobStatus(job.id, "PROCESSING");

    const processor = getPdfProcessor();
    const result = await processor.merge(buffers, options);
    const resultBuffer = Buffer.from(result);

    const outputMeta = createFileMeta("merged.pdf", resultBuffer.length, "application/pdf");
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
      { success: false, error: { code: "MERGE_FAILED", message: "Failed to merge PDFs" } },
      { status: 500 }
    );
  }
}
