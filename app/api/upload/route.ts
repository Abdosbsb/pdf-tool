import { NextRequest, NextResponse } from "next/server";
import { getStorageProvider } from "@/lib/storage";
import { createFileMeta, isValidFileType, MAX_FILE_SIZE } from "@/lib/file-utils";
import { ApiResponse } from "@/types";

export async function POST(request: NextRequest): Promise<NextResponse<ApiResponse>> {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json(
        { success: false, error: { code: "NO_FILE", message: "No file provided" } },
        { status: 400 }
      );
    }

    if (!isValidFileType(file, ["pdf", "image"])) {
      return NextResponse.json(
        { success: false, error: { code: "INVALID_TYPE", message: "File type not allowed. Accepted: PDF, JPG, PNG" } },
        { status: 400 }
      );
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { success: false, error: { code: "FILE_TOO_LARGE", message: "File exceeds 50MB limit" } },
        { status: 400 }
      );
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const meta = createFileMeta(file.name, file.size, file.type);
    const storage = getStorageProvider();

    await storage.upload(meta.id, buffer, file.type);

    return NextResponse.json(
      {
        success: true,
        data: {
          id: meta.id,
          name: meta.name,
          size: meta.size,
          type: meta.type,
          url: `/api/files/${meta.id}`,
          createdAt: meta.createdAt,
          expiresAt: meta.expiresAt,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    return NextResponse.json(
      { success: false, error: { code: "UPLOAD_FAILED", message: "Failed to upload file" } },
      { status: 500 }
    );
  }
}
