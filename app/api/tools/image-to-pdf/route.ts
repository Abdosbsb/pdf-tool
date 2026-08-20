import { NextRequest, NextResponse } from "next/server";
import { getStorageProvider } from "@/lib/storage";
import { getPdfProcessor } from "@/lib/pdf/processor";
import { createJob, updateJobStatus } from "@/lib/jobs";
import { createFileMeta, isValidFileType } from "@/lib/file-utils";
import { ApiResponse } from "@/types";

export async function POST(request: NextRequest): Promise<NextResponse<ApiResponse>> {
  try {
    const formData = await request.formData();
    const files: File[] = [];

    for (const [key, value] of formData.entries()) {
      if (value instanceof File) {
        files.push(value);
      }
    }

    if (files.length === 0) {
      return NextResponse.json(
        { success: false, error: { code: "NO_FILES", message: "No image files provided" } },
        { status: 400 }
      );
    }

    for (const file of files) {
      if (!isValidFileType(file, ["image"])) {
        return NextResponse.json(
          { success: false, error: { code: "INVALID_TYPE", message: `File ${file.name} is not a valid image type` } },
          { status: 400 }
        );
      }
    }

    const storage = getStorageProvider();
    const inputIds: string[] = [];
    const buffers: ArrayBuffer[] = [];
    let totalInputSize = 0;

    for (const file of files) {
      const buffer = Buffer.from(await file.arrayBuffer());
      totalInputSize += buffer.length;
      const meta = createFileMeta(file.name, buffer.length, file.type);
      await storage.upload(meta.id, buffer, file.type);
      inputIds.push(meta.id);
      buffers.push(buffer.buffer);
    }

    const job = createJob("jpg-to-pdf", inputIds, totalInputSize);
    updateJobStatus(job.id, "PROCESSING");

    const processor = getPdfProcessor();
    const result = await processor.imageToPdf(buffers);
    const resultBuffer = Buffer.from(result);

    const outputMeta = createFileMeta("converted.pdf", resultBuffer.length, "application/pdf");
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
      { success: false, error: { code: "IMAGE_TO_PDF_FAILED", message: "Failed to convert images to PDF" } },
      { status: 500 }
    );
  }
}
