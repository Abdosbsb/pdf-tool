import { NextRequest, NextResponse } from "next/server";
import { getPdfProcessor } from "@/lib/pdf/processor";

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const formData = await request.formData();
    const files: File[] = [];

    for (const [key, value] of formData.entries()) {
      if (key === "file" && value instanceof File) {
        files.push(value);
      }
    }

    if (files.length < 2) {
      return NextResponse.json(
        { success: false, error: { code: "INVALID_INPUT", message: "At least 2 files are required" } },
        { status: 400 }
      );
    }

    const buffers: ArrayBuffer[] = [];
    for (const file of files) {
      buffers.push(await file.arrayBuffer());
    }

    const processor = getPdfProcessor();
    const result = await processor.merge(buffers);
    const resultBuffer = Buffer.from(result);

    return new NextResponse(resultBuffer, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": 'attachment; filename="merged.pdf"',
      },
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: { code: "MERGE_FAILED", message: "Failed to merge PDFs" } },
      { status: 500 }
    );
  }
}
