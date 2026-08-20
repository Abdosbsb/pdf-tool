import { NextRequest, NextResponse } from "next/server";
import { getStorageProvider } from "@/lib/storage";
import { getPdfProcessor } from "@/lib/pdf/processor";
import { createJob, updateJobStatus } from "@/lib/jobs";
import { createFileMeta } from "@/lib/file-utils";
import { ApiResponse } from "@/types";

export async function POST(request: NextRequest): Promise<NextResponse<ApiResponse>> {
  try {
    const body = await request.json();
    const { fileId, options } = body;

    if (!fileId) {
      return NextResponse.json(
        { success: false, error: { code: "MISSING_FILE", message: "fileId is required" } },
        { status: 400 }
      );
    }

    if (!options?.pageRange) {
      return NextResponse.json(
        { success: false, error: { code: "MISSING_OPTIONS", message: "options.pageRange is required" } },
        { status: 400 }
      );
    }

    const storage = getStorageProvider();
    const buffer = await storage.download(fileId);

    const job = createJob("split-pdf", [fileId], buffer.length, options);
    updateJobStatus(job.id, "PROCESSING");

    const processor = getPdfProcessor();
    const buf = buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength) as ArrayBuffer;
    const results = await processor.split(buf, options);

    const outputIds: string[] = [];
    let totalOutputSize = 0;

    for (let i = 0; i < results.length; i++) {
      const resultBuffer = Buffer.from(results[i]);
      totalOutputSize += resultBuffer.length;
      const outputMeta = createFileMeta(`split_${i + 1}.pdf`, resultBuffer.length, "application/pdf");
      await storage.upload(outputMeta.id, resultBuffer, "application/pdf");
      outputIds.push(outputMeta.id);
    }

    updateJobStatus(job.id, "COMPLETED", {
      outputFile: outputIds[0],
      outputSize: totalOutputSize,
    });

    return NextResponse.json({
      success: true,
      data: {
        jobId: job.id,
        status: "COMPLETED",
        outputs: outputIds.map((id) => ({
          downloadUrl: `/api/files/${id}`,
        })),
        outputSize: totalOutputSize,
      },
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: { code: "SPLIT_FAILED", message: "Failed to split PDF" } },
      { status: 500 }
    );
  }
}
