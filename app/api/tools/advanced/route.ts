import { NextRequest, NextResponse } from "next/server";
import { getAdvancedConversionProvider } from "@/lib/providers/advanced-conversion";

type ConversionType =
  | "pdfToWord"
  | "wordToPdf"
  | "pdfToExcel"
  | "excelToPdf"
  | "pdfToText"
  | "pdfToJpg"
  | "pdfToPng";

const EXTENSION_MAP: Record<ConversionType, { output: string; mime: string }> = {
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
  pdfToText: { output: "txt", mime: "text/plain; charset=utf-8" },
  pdfToJpg: { output: "jpg", mime: "image/jpeg" },
  pdfToPng: { output: "png", mime: "image/png" },
};

const FORMAT_MAP: Record<ConversionType, { inputFormat: string; outputFormat: string }> = {
  pdfToWord: { inputFormat: "pdf", outputFormat: "docx" },
  wordToPdf: { inputFormat: "docx", outputFormat: "pdf" },
  pdfToExcel: { inputFormat: "pdf", outputFormat: "xlsx" },
  excelToPdf: { inputFormat: "xlsx", outputFormat: "pdf" },
  pdfToText: { inputFormat: "pdf", outputFormat: "txt" },
  pdfToJpg: { inputFormat: "pdf", outputFormat: "jpg" },
  pdfToPng: { inputFormat: "pdf", outputFormat: "png" },
};

function detectInputFormat(fileName: string, conversion: ConversionType): string {
  const ext = fileName.split(".").pop()?.toLowerCase() || "";
  if (conversion === "wordToPdf") {
    return ext === "doc" ? "doc" : "docx";
  }
  if (conversion === "excelToPdf") {
    return ext === "xls" ? "xls" : "xlsx";
  }
  return FORMAT_MAP[conversion].inputFormat;
}

function buildOutputFilename(originalName: string, conversion: ConversionType): string {
  const dotIndex = originalName.lastIndexOf(".");
  const baseName = dotIndex > 0 ? originalName.substring(0, dotIndex) : originalName;
  return `${baseName}.${EXTENSION_MAP[conversion].output}`;
}



export async function POST(request: NextRequest): Promise<NextResponse> {
  console.log(
    "[advanced-conversion] POST - PDF_PROVIDER_API_KEY configured:",
    !!process.env.PDF_PROVIDER_API_KEY
  );

  try {
    if (!process.env.PDF_PROVIDER_API_KEY) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "PROVIDER_REQUIRED",
            message: "CloudConvert API key is not configured. Set PDF_PROVIDER_API_KEY.",
          },
        },
        { status: 501 }
      );
    }

    const body = await request.json();
    const conversion = body.conversion as ConversionType | undefined;
    const inputFileName = body.fileName as string | undefined;

    if (!conversion || !EXTENSION_MAP[conversion]) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "INVALID_CONVERSION",
            message: "conversion must be one of: pdfToWord, wordToPdf, pdfToExcel, excelToPdf, pdfToText, pdfToJpg, pdfToPng",
          },
        },
        { status: 400 }
      );
    }

    if (!inputFileName || typeof inputFileName !== "string") {
      return NextResponse.json(
        {
          success: false,
          error: { code: "MISSING_FILE_NAME", message: "fileName is required" },
        },
        { status: 400 }
      );
    }

    const inputFormat = detectInputFormat(inputFileName, conversion);
    const outputFilename = buildOutputFilename(inputFileName, conversion);

    console.log(
      `[advanced-conversion] Creating job: ${inputFileName} (${inputFormat} → ${FORMAT_MAP[conversion].outputFormat})`
    );

    const provider = getAdvancedConversionProvider();
    const { jobId, upload } = await provider.createConversionJob(
      inputFormat,
      FORMAT_MAP[conversion].outputFormat,
      inputFileName
    );

    console.log(
      `[advanced-conversion] Job created: ${conversion}, job: ${jobId}`
    );

    return NextResponse.json({
      success: true,
      data: {
        jobId,
        conversion,
        outputFilename,
        upload: {
          url: upload.url,
          parameters: upload.parameters,
        },
      },
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to start conversion";

    console.error("[advanced-conversion] POST error:", message);
    if (error instanceof Error && error.stack) {
      console.error("[advanced-conversion] Stack:", error.stack);
    }

    const isAuthError =
      message.includes("Invalid API configuration") ||
      message.includes("401") ||
      message.includes("403");
    const isMissingKey =
      message.includes("CloudConvert API key is not configured") ||
      message.includes("PDF_PROVIDER_API_KEY");
    const isRateLimit = message.includes("rate limit");

    if (isAuthError || isMissingKey) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "PROVIDER_REQUIRED",
            message: isMissingKey
              ? "CloudConvert API key is not configured. Set PDF_PROVIDER_API_KEY."
              : "Invalid API configuration. Please check your PDF_PROVIDER_API_KEY.",
          },
        },
        { status: 501 }
      );
    }

    if (isRateLimit) {
      return NextResponse.json(
        {
          success: false,
          error: { code: "RATE_LIMITED", message: "CloudConvert rate limit reached. Please try again later." },
        },
        { status: 429 }
      );
    }

    return NextResponse.json(
      {
        success: false,
        error: { code: "CONVERSION_FAILED", message },
      },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const { searchParams } = new URL(request.url);
    const jobId = searchParams.get("jobId");
    const conversion = searchParams.get("conversion") as ConversionType | null;
    const outputFilename = searchParams.get("outputFilename") || "converted";

    if (!jobId) {
      return NextResponse.json(
        {
          success: false,
          error: { code: "MISSING_JOB_ID", message: "jobId query parameter is required" },
        },
        { status: 400 }
      );
    }

    const provider = getAdvancedConversionProvider();
    const result = await provider.pollConversion(jobId);

    if (result.status === "processing") {
      return NextResponse.json({
        success: true,
        data: { status: "processing" },
      });
    }

    if (result.status === "error") {
      return NextResponse.json(
        {
          success: false,
          error: { code: "CONVERSION_FAILED", message: result.error || "Conversion failed" },
        },
        { status: 500 }
      );
    }

    if (!result.files || result.files.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: { code: "NO_OUTPUT", message: "CloudConvert produced no output files" },
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        status: "finished",
        files: result.files.map((f) => ({
          url: f.url,
          filename: f.filename,
          size: f.size,
        })),
      },
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to check conversion status";

    console.error("[advanced-conversion] GET error:", message);
    if (error instanceof Error && error.stack) {
      console.error("[advanced-conversion] Stack:", error.stack);
    }

    return NextResponse.json(
      {
        success: false,
        error: { code: "CONVERSION_FAILED", message },
      },
      { status: 500 }
    );
  }
}
