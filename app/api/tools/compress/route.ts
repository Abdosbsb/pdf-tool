import { NextRequest, NextResponse } from "next/server";
import { getPdfProcessor } from "@/lib/pdf/processor";

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const quality = Number(formData.get("quality"));

    if (!file) {
      return NextResponse.json(
        { success: false, error: { code: "MISSING_FILE", message: "file is required" } },
        { status: 400 }
      );
    }

    const arrayBuffer = await file.arrayBuffer();
    const inputSize = arrayBuffer.byteLength;

    const processor = getPdfProcessor();
    const result = await processor.compress(arrayBuffer, isNaN(quality) ? undefined : quality);
    const resultBuffer = Buffer.from(result);

    return new NextResponse(resultBuffer, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": 'attachment; filename="compressed.pdf"',
        "X-Input-Size": String(inputSize),
        "X-Output-Size": String(resultBuffer.length),
      },
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: { code: "COMPRESS_FAILED", message: "Failed to compress PDF" } },
      { status: 500 }
    );
  }
}
