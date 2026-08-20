import { NextRequest, NextResponse } from "next/server";
import { getStorageProvider } from "@/lib/storage";
import { getAdvancedConversionProvider } from "@/lib/providers/advanced-conversion";

type ConversionType =
  | "pdfToWord"
  | "wordToPdf"
  | "pdfToExcel"
  | "excelToPdf"
  | "pdfToText"
  | "pdfToJpg"
  | "pdfToPng";

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
};

const FORMAT_MAP: Record<string, { inputFormat: string; outputFormat: string }> = {
  pdfToWord: { inputFormat: "pdf", outputFormat: "docx" },
  wordToPdf: { inputFormat: "docx", outputFormat: "pdf" },
  pdfToExcel: { inputFormat: "pdf", outputFormat: "xlsx" },
  excelToPdf: { inputFormat: "xlsx", outputFormat: "pdf" },
  pdfToText: { inputFormat: "pdf", outputFormat: "txt" },
  pdfToJpg: { inputFormat: "pdf", outputFormat: "jpg" },
  pdfToPng: { inputFormat: "pdf", outputFormat: "png" },
};

function detectInputFormat(fileName: string, conversion: string): string {
  const ext = fileName.split(".").pop()?.toLowerCase() || "";
  if (conversion === "wordToPdf") {
    if (ext === "doc") return "doc";
    return "docx";
  }
  if (conversion === "excelToPdf") {
    if (ext === "xls") return "xls";
    return "xlsx";
  }
  return FORMAT_MAP[conversion]?.inputFormat || "pdf";
}

function crc32(buf: Buffer): number {
  let c = 0xffffffff;
  const table = crc32.table;
  for (let i = 0; i < buf.length; i++) {
    c = table[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  }
  return (c ^ 0xffffffff) >>> 0;
}

crc32.table = (() => {
  const t = new Uint32Array(256);
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let j = 0; j < 8; j++) {
      c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    }
    t[i] = c;
  }
  return t;
})();

function packAsZip(files: Array<{ filename: string; buffer: Buffer }>): Buffer {
  const localHeaders: Buffer[] = [];
  const centralHeaders: Buffer[] = [];
  let offset = 0;

  for (const file of files) {
    const name = Buffer.from(file.filename, "utf-8");
    const crc = crc32(file.buffer);

    const localHeader = Buffer.alloc(30 + name.length);
    localHeader.writeUInt32LE(0x04034b50, 0);
    localHeader.writeUInt16LE(20, 4);
    localHeader.writeUInt16LE(0, 6);
    localHeader.writeUInt16LE(0, 8);
    localHeader.writeUInt16LE(0, 10);
    localHeader.writeUInt16LE(0, 12);
    localHeader.writeUInt32LE(crc, 14);
    localHeader.writeUInt32LE(file.buffer.length, 18);
    localHeader.writeUInt32LE(file.buffer.length, 22);
    localHeader.writeUInt16LE(name.length, 26);
    localHeader.writeUInt16LE(0, 28);
    name.copy(localHeader, 30);

    const centralHeader = Buffer.alloc(46 + name.length);
    centralHeader.writeUInt32LE(0x02014b50, 0);
    centralHeader.writeUInt16LE(20, 4);
    centralHeader.writeUInt16LE(20, 6);
    centralHeader.writeUInt16LE(0, 8);
    centralHeader.writeUInt16LE(0, 10);
    centralHeader.writeUInt16LE(0, 12);
    centralHeader.writeUInt16LE(0, 14);
    centralHeader.writeUInt32LE(crc, 16);
    centralHeader.writeUInt32LE(file.buffer.length, 20);
    centralHeader.writeUInt32LE(file.buffer.length, 24);
    centralHeader.writeUInt16LE(name.length, 28);
    centralHeader.writeUInt16LE(0, 30);
    centralHeader.writeUInt16LE(0, 32);
    centralHeader.writeUInt16LE(0, 34);
    centralHeader.writeUInt16LE(0, 36);
    centralHeader.writeUInt32LE(0, 38);
    centralHeader.writeUInt32LE(offset, 42);
    name.copy(centralHeader, 46);

    localHeaders.push(localHeader, file.buffer);
    centralHeaders.push(centralHeader);
    offset += localHeader.length + file.buffer.length;
  }

  const centralDirOffset = offset;
  let centralDirSize = 0;
  for (const ch of centralHeaders) {
    centralDirSize += ch.length;
  }

  const endRecord = Buffer.alloc(22);
  endRecord.writeUInt32LE(0x06054b50, 0);
  endRecord.writeUInt16LE(0, 4);
  endRecord.writeUInt16LE(0, 6);
  endRecord.writeUInt16LE(files.length, 8);
  endRecord.writeUInt16LE(files.length, 10);
  endRecord.writeUInt32LE(centralDirSize, 12);
  endRecord.writeUInt32LE(centralDirOffset, 16);
  endRecord.writeUInt16LE(0, 20);

  return Buffer.concat([...localHeaders, ...centralHeaders, endRecord]);
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  console.log(
    "[advanced-conversion] POST - PDF_PROVIDER_API_KEY configured:",
    !!process.env.PDF_PROVIDER_API_KEY
  );

  try {
    const contentType = request.headers.get("content-type") || "";
    let file: File | null = null;
    let conversion: ConversionType | undefined;

    if (contentType.includes("multipart/form-data")) {
      const formData = await request.formData();
      conversion = (formData.get("conversion") as string) as ConversionType;
      file = formData.get("file") as File | null;
    } else {
      return NextResponse.json(
        {
          success: false,
          error: { code: "INVALID_REQUEST", message: "multipart/form-data required" },
        },
        { status: 400 }
      );
    }

    if (!file) {
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
            message: "conversion must be one of: pdfToWord, wordToPdf, pdfToExcel, excelToPdf, pdfToText, pdfToJpg, pdfToPng",
          },
        },
        { status: 400 }
      );
    }

    const inputFileName = file.name || "input";
    const inputFormat = detectInputFormat(inputFileName, conversion);
    const outputFormat = FORMAT_MAP[conversion].outputFormat;

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const provider = getAdvancedConversionProvider();
    const { jobId } = await provider.startConversion(
      buffer,
      inputFormat,
      outputFormat,
      inputFileName
    );

    console.log(
      `[advanced-conversion] Conversion started: ${conversion}, job: ${jobId}`
    );

    return NextResponse.json({
      success: true,
      data: { jobId, conversion },
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to start conversion";

    console.error("[advanced-conversion] POST error:", message);
    if (error instanceof Error && error.stack) {
      console.error("[advanced-conversion] Stack:", error.stack);
    }

    const isAuthError =
      message.includes("401") ||
      message.includes("403") ||
      message.includes("Invalid or unauthorized API key");
    const isMissingKey =
      message.includes("PDF_PROVIDER_API_KEY is not configured");

    if (isAuthError || isMissingKey) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "PROVIDER_REQUIRED",
            message: isMissingKey
              ? "PDF conversion service is not configured. Please set PDF_PROVIDER_API_KEY."
              : "PDF conversion service authentication failed. Please check your API key.",
          },
        },
        { status: 501 }
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

    const ext = conversion ? EXTENSION_MAP[conversion]?.output : "pdf";
    const mime = conversion ? EXTENSION_MAP[conversion]?.mime : "application/pdf";

    const isMultiFile = (conversion === "pdfToJpg" || conversion === "pdfToPng") && result.files.length > 1;

    if (isMultiFile) {
      const buffers: Array<{ filename: string; buffer: Buffer }> = [];
      for (const file of result.files) {
        const provider2 = getAdvancedConversionProvider();
        const buf = await provider2.downloadResultFile(file.url);
        buffers.push({ filename: file.filename, buffer: buf });
      }

      const zipBuffer = packAsZip(buffers);

      return new NextResponse(new Uint8Array(zipBuffer), {
        status: 200,
        headers: {
          "Content-Type": "application/zip",
          "Content-Disposition": 'attachment; filename="converted.zip"',
          "Content-Length": zipBuffer.length.toString(),
        },
      });
    }

    const provider3 = getAdvancedConversionProvider();
    const outputBuffer = await provider3.downloadResultFile(result.files[0].url);

    const isZip =
      (conversion === "pdfToJpg" || conversion === "pdfToPng") &&
      outputBuffer.length > 4 &&
      outputBuffer[0] === 0x50 &&
      outputBuffer[1] === 0x4b &&
      outputBuffer[2] === 0x03 &&
      outputBuffer[3] === 0x04;

    const responseContentType = isZip ? "application/zip" : mime;
    const responseFilename = isZip ? "converted.zip" : `converted.${ext}`;

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
