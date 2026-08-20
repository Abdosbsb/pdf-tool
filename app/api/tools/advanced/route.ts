import { NextRequest, NextResponse } from "next/server";
import { getStorageProvider } from "@/lib/storage";
import { getAdvancedConversionProvider } from "@/lib/providers/advanced-conversion";
import { createJob, updateJobStatus } from "@/lib/jobs";
import { createFileMeta } from "@/lib/file-utils";
import { ApiResponse } from "@/types";

type ConversionType = "pdfToWord" | "wordToPdf" | "pdfToExcel" | "excelToPdf" | "pdfToText" | "watermark" | "pageNumbers" | "crop";

const EXTENSION_MAP: Record<string, { output: string; mime: string }> = {
  pdfToWord: { output: "docx", mime: "application/vnd.openxmlformats-officedocument.wordprocessingml.document" },
  wordToPdf: { output: "pdf", mime: "application/pdf" },
  pdfToExcel: { output: "xlsx", mime: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" },
  excelToPdf: { output: "pdf", mime: "application/pdf" },
  pdfToText: { output: "txt", mime: "text/plain" },
  watermark: { output: "pdf", mime: "application/pdf" },
  pageNumbers: { output: "pdf", mime: "application/pdf" },
  crop: { output: "pdf", mime: "application/pdf" },
};

const TOOL_ID_MAP: Record<string, string> = {
  pdfToWord: "pdf-to-word",
  wordToPdf: "word-to-pdf",
  pdfToExcel: "pdf-to-excel",
  excelToPdf: "excel-to-pdf",
  pdfToText: "pdf-to-text",
  watermark: "watermark",
  pageNumbers: "page-numbers",
  crop: "crop-pdf",
};

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const contentType = request.headers.get("content-type") || "";
    let fileId: string | undefined;
    let conversion: ConversionType | undefined;
    let file: File | null = null;

    if (contentType.includes("multipart/form-data")) {
      const formData = await request.formData();
      conversion = (formData.get("conversion") as string) as ConversionType;
      file = formData.get("file") as File | null;
    } else {
      const body = await request.json();
      fileId = body.fileId;
      conversion = body.conversion;
    }

    const storage = getStorageProvider();
    let buffer: Buffer;

    if (file) {
      const arrayBuffer = await file.arrayBuffer();
      buffer = Buffer.from(arrayBuffer);
    } else if (fileId) {
      buffer = await storage.download(fileId);
    } else {
      return NextResponse.json(
        { success: false, error: { code: "MISSING_FILE", message: "file is required" } },
        { status: 400 }
      );
    }

    if (!conversion || !EXTENSION_MAP[conversion]) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "INVALID_CONVERSION",
            message: "conversion must be one of: pdfToWord, wordToPdf, pdfToExcel, excelToPdf, pdfToText, watermark, pageNumbers, crop",
          },
        },
        { status: 400 }
      );
    }

    const job = createJob(TOOL_ID_MAP[conversion] as Parameters<typeof createJob>[0], [fileId || "direct"], buffer.length, { conversion });
    updateJobStatus(job.id, "PROCESSING");

    const provider = getAdvancedConversionProvider();

    let outputBuffer: Buffer;

    switch (conversion) {
      case "pdfToWord":
        outputBuffer = await provider.pdfToWord(buffer);
        break;
      case "wordToPdf":
        outputBuffer = await provider.wordToPdf(buffer);
        break;
      case "pdfToExcel":
        outputBuffer = await provider.pdfToExcel(buffer);
        break;
      case "excelToPdf":
        outputBuffer = await provider.excelToPdf(buffer);
        break;
      case "pdfToText": {
        const text = await provider.pdfToText(buffer);
        outputBuffer = Buffer.from(text, "utf-8");
        break;
      }
      default:
        throw new Error(`Conversion ${conversion} is not supported via external provider`);
    }

    const ext = EXTENSION_MAP[conversion].output;
    const mime = EXTENSION_MAP[conversion].mime;
    const outputMeta = createFileMeta(`converted.${ext}`, outputBuffer.length, mime);
    await storage.upload(outputMeta.id, outputBuffer, mime);

    updateJobStatus(job.id, "COMPLETED", {
      outputFile: outputMeta.id,
      outputSize: outputBuffer.length,
    });

    return NextResponse.json({
      success: true,
      data: {
        jobId: job.id,
        status: "COMPLETED",
        downloadUrl: `/api/files/${outputMeta.id}`,
        outputSize: outputBuffer.length,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Advanced conversion failed";
    const needsProvider = message.includes("provider") || message.includes("API_KEY");
    return NextResponse.json(
      {
        success: false,
        error: {
          code: needsProvider ? "PROVIDER_REQUIRED" : "CONVERSION_FAILED",
          message: needsProvider
            ? "This conversion requires an external provider. Set PDF_PROVIDER_API_KEY to enable this feature."
            : "Failed to convert file",
        },
      },
      { status: needsProvider ? 501 : 500 }
    );
  }
}
