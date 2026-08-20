import { NextRequest, NextResponse } from "next/server";
import { getStorageProvider } from "@/lib/storage";
import { getAdvancedConversionProvider } from "@/lib/providers/advanced-conversion";
import { createJob, updateJobStatus } from "@/lib/jobs";
import { createFileMeta } from "@/lib/file-utils";
import { ApiResponse } from "@/types";

type ConversionType = "pdfToWord" | "wordToPdf" | "pdfToExcel" | "excelToPdf" | "pdfToText";

const EXTENSION_MAP: Record<ConversionType, { input: string; output: string; mime: string }> = {
  pdfToWord: { input: "pdf", output: "docx", mime: "application/vnd.openxmlformats-officedocument.wordprocessingml.document" },
  wordToPdf: { input: "docx", output: "pdf", mime: "application/pdf" },
  pdfToExcel: { input: "pdf", output: "xlsx", mime: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" },
  excelToPdf: { input: "xlsx", output: "pdf", mime: "application/pdf" },
  pdfToText: { input: "pdf", output: "txt", mime: "text/plain" },
};

const TOOL_ID_MAP: Record<ConversionType, string> = {
  pdfToWord: "pdf-to-word",
  wordToPdf: "word-to-pdf",
  pdfToExcel: "pdf-to-excel",
  excelToPdf: "excel-to-pdf",
  pdfToText: "pdf-to-text",
};

export async function POST(request: NextRequest): Promise<NextResponse<ApiResponse>> {
  try {
    const body = await request.json();
    const { fileId, conversion } = body as { fileId?: string; conversion?: ConversionType };

    if (!fileId) {
      return NextResponse.json(
        { success: false, error: { code: "MISSING_FILE", message: "fileId is required" } },
        { status: 400 }
      );
    }

    if (!conversion || !EXTENSION_MAP[conversion]) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "INVALID_CONVERSION",
            message: "conversion must be one of: pdfToWord, wordToPdf, pdfToExcel, excelToPdf, pdfToText",
          },
        },
        { status: 400 }
      );
    }

    const storage = getStorageProvider();
    const buffer = await storage.download(fileId);
    const job = createJob(TOOL_ID_MAP[conversion] as Parameters<typeof createJob>[0], [fileId], buffer.length, { conversion });
    updateJobStatus(job.id, "PROCESSING");

    const provider = getAdvancedConversionProvider();

    let outputBuffer: Buffer;
    let outputContent: string | Buffer;

    switch (conversion) {
      case "pdfToWord":
        outputContent = await provider.pdfToWord(buffer);
        outputBuffer = outputContent;
        break;
      case "wordToPdf":
        outputContent = await provider.wordToPdf(buffer);
        outputBuffer = outputContent;
        break;
      case "pdfToExcel":
        outputContent = await provider.pdfToExcel(buffer);
        outputBuffer = outputContent;
        break;
      case "excelToPdf":
        outputContent = await provider.excelToPdf(buffer);
        outputBuffer = outputContent;
        break;
      case "pdfToText":
        const text = await provider.pdfToText(buffer);
        outputBuffer = Buffer.from(text, "utf-8");
        break;
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
