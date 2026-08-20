import { NextRequest, NextResponse } from "next/server";
import { getPdfProcessor } from "@/lib/pdf/processor";

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const formData = await request.formData();
    const files: File[] = [];

    for (const [key, value] of formData.entries()) {
      if (key === "files" && value instanceof File) {
        files.push(value);
      }
    }

    if (files.length === 0) {
      return NextResponse.json(
        { success: false, error: { code: "NO_FILES", message: "No image files provided" } },
        { status: 400 }
      );
    }

    const buffers: ArrayBuffer[] = [];
    for (const file of files) {
      buffers.push(await file.arrayBuffer());
    }

    const processor = getPdfProcessor();
    const result = await processor.imageToPdf(buffers);
    const resultBuffer = Buffer.from(result);

    return new NextResponse(resultBuffer, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": 'attachment; filename="converted.pdf"',
      },
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: { code: "IMAGE_TO_PDF_FAILED", message: "Failed to convert images to PDF" } },
      { status: 500 }
    );
  }
}
