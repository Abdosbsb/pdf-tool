import { NextRequest, NextResponse } from "next/server";
import { getStorageProvider } from "@/lib/storage";
import { getAdvancedConversionProvider } from "@/lib/providers/advanced-conversion";
import { createJob, updateJobStatus } from "@/lib/jobs";
import { createFileMeta } from "@/lib/file-utils";
import { ApiResponse } from "@/types";

type ConversionType =
  | "pdfToWord"
  | "wordToPdf"
  | "pdfToExcel"
  | "excelToPdf"
  | "pdfToText"
  | "pdfToJpg"
  | "pdfToPng"
  | "watermark"
  | "pageNumbers"
  | "crop";

const EXTENSION_MAP: Record<string, { output: string; mime: string }> = {
  pdfToWord: {
    output: "docx",
    mime: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  },
  wordToPdf: { output: "pdf", mime: "application/pdf" },
  pdfToExcel: {
    output: "xlsx",
    mime: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  },
  excelToPdf: { output: "pdf", mime: "application/pdf" },
  pdfToText: { output: "txt", mime: "text/plain" },
  pdfToJpg: { output: "jpg", mime: "image/jpeg" },
  pdfToPng: { output: "png", mime: "image/png" },
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
  pdfToJpg: "pdf-to-jpg",
  pdfToPng: "pdf-to-png",
  watermark: "watermark",
  pageNumbers: "page-numbers",
  crop: "crop-pdf",
};

export async function POST(request: NextRequest): Promise<NextResponse> {
  console.log(
    "[advanced-conversion] PDF_PROVIDER_API_KEY configured:",
    !!process.env.PDF_PROVIDER_API_KEY
  );

  try {
    const contentType = request.headers.get("content-type") || "";
    let fileId: string | undefined;
    let conversion: ConversionType | undefined;
    let file: File | null = null;
    let inputFileName = "input";

    if (contentType.includes("multipart/form-data")) {
      const formData = await request.formData();
      conversion = (formData.get("conversion") as string) as ConversionType;
      file = formData.get("file") as File | null;
      if (file) {
        inputFileName = file.name;
      }
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
        {
          success: false,
          error: { code: "MISSING_FILE", message: "file is required" },
        },
        { status: 400 }
      );
    }

    if (!conversion || !EXTENSION_MAP[conversion]) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "INVALID_CONVERSION",
            message:
              "conversion must be one of: pdfToWord, wordToPdf, pdfToExcel, excelToPdf, pdfToText, pdfToJpg, pdfToPng",
          },
        },
        { status: 400 }
      );
    }

    const ext = EXTENSION_MAP[conversion].output;
    const mime = EXTENSION_MAP[conversion].mime;

    const job = createJob(
      TOOL_ID_MAP[conversion] as Parameters<typeof createJob>[0],
      [fileId || "direct"],
      buffer.length,
      { conversion }
    );
    updateJobStatus(job.id, "PROCESSING");

    const provider = getAdvancedConversionProvider();

    let outputBuffer: Buffer;

    switch (conversion) {
      case "pdfToWord":
        outputBuffer = await provider.pdfToWord(buffer, inputFileName);
        break;
      case "wordToPdf":
        outputBuffer = await provider.wordToPdf(buffer, inputFileName);
        break;
      case "pdfToExcel":
        outputBuffer = await provider.pdfToExcel(buffer, inputFileName);
        break;
      case "excelToPdf":
        outputBuffer = await provider.excelToPdf(buffer, inputFileName);
        break;
      case "pdfToText": {
        const text = await provider.pdfToText(buffer, inputFileName);
        outputBuffer = Buffer.from(text, "utf-8");
        break;
      }
      case "pdfToJpg":
        outputBuffer = await provider.pdfToJpg(buffer, inputFileName);
        break;
      case "pdfToPng":
        outputBuffer = await provider.pdfToPng(buffer, inputFileName);
        break;
      default:
        throw new Error(
          `Conversion ${conversion} is not supported via external provider`
        );
    }

    const outputMeta = createFileMeta(
      `converted.${ext}`,
      outputBuffer.length,
      mime
    );
    await storage.upload(outputMeta.id, outputBuffer, mime);

    updateJobStatus(job.id, "COMPLETED", {
      outputFile: outputMeta.id,
      outputSize: outputBuffer.length,
    });

    const isZip =
      (conversion === "pdfToJpg" || conversion === "pdfToPng") &&
      outputBuffer.length > 4 &&
      outputBuffer[0] === 0x50 &&
      outputBuffer[1] === 0x4b &&
      outputBuffer[2] === 0x03 &&
      outputBuffer[3] === 0x04;

    const responseContentType = isZip ? "application/zip" : mime;
    const responseFilename = isZip
      ? `converted.zip`
      : `converted.${ext}`;

    return new NextResponse(new Uint8Array(outputBuffer), {
      status: 200,
      headers: {
        "Content-Type": responseContentType,
        "Content-Disposition": `attachment; filename="${responseFilename}"`,
        "Content-Length": outputBuffer.length.toString(),
      },
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Advanced conversion failed";

    console.error("[advanced-conversion]", message);

    const isAuthError =
      message.includes("401") ||
      message.includes("403") ||
      message.includes("Invalid or unauthorized API key");
    const isMissingKey =
      message.includes("PDF_PROVIDER_API_KEY is not configured");
    const isProviderError =
      isAuthError ||
      isMissingKey ||
      message.includes("requires an external provider");

    if (isProviderError) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "PROVIDER_REQUIRED",
            message: isMissingKey
              ? "PDF conversion service is not configured. Please set PDF_PROVIDER_API_KEY."
              : isAuthError
                ? "PDF conversion service authentication failed. Please check your API key."
                : "This conversion requires an external provider. Set PDF_PROVIDER_API_KEY to enable this feature.",
          },
        },
        { status: 501 }
      );
    }

    return NextResponse.json(
      {
        success: false,
        error: {
          code: "CONVERSION_FAILED",
          message: "Failed to convert file. Please try again.",
        },
      },
      { status: 500 }
    );
  }
}
