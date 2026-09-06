import path from "path";
import crypto from "crypto";

export const ALLOWED_MIME_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "application/pdf",
];

export const ALLOWED_EXTENSIONS = [".jpg", ".jpeg", ".png", ".webp", ".pdf"];

export const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024; // 5,242,880 bytes (5 MB)
export const MAX_ACTIVE_ATTACHMENTS = 5;

export interface AttachmentValidationResult {
  isValid: boolean;
  errorCode?: "UNSUPPORTED_FILE_TYPE" | "FILE_TOO_LARGE" | "MAX_ATTACHMENTS_EXCEEDED" | "INVALID_FILE";
  errorMessage?: string;
  statusCode?: number;
}

export function validateAttachmentFile(
  file: { mimetype?: string; originalname?: string; size?: number } | undefined | null
): AttachmentValidationResult {
  if (!file) {
    return {
      isValid: false,
      errorCode: "INVALID_FILE",
      errorMessage: "No file provided",
      statusCode: 400,
    };
  }

  const mimeType = file.mimetype?.toLowerCase() || "";
  const ext = path.extname(file.originalname || "").toLowerCase();

  // Check MIME type and Extension
  const isValidMime = ALLOWED_MIME_TYPES.includes(mimeType);
  const isValidExt = ALLOWED_EXTENSIONS.includes(ext);

  if (!isValidMime || !isValidExt) {
    return {
      isValid: false,
      errorCode: "UNSUPPORTED_FILE_TYPE",
      errorMessage: "Unsupported file format. Allowed formats: JPG, PNG, WEBP, PDF",
      statusCode: 415,
    };
  }

  // Check size limit (5MB)
  const size = file.size ?? 0;
  if (size > MAX_FILE_SIZE_BYTES) {
    return {
      isValid: false,
      errorCode: "FILE_TOO_LARGE",
      errorMessage: "File size exceeds the 5 MB limit",
      statusCode: 413,
    };
  }

  return { isValid: true };
}

export function generateStoredFileName(originalFileName: string): { storedFileName: string; ext: string } {
  const ext = path.extname(originalFileName || "").toLowerCase() || ".bin";
  const uuid = crypto.randomUUID();
  return {
    storedFileName: `${uuid}${ext}`,
    ext,
  };
}
