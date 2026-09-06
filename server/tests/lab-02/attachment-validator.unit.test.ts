import { describe, it, expect } from "vitest";
import {
  validateAttachmentFile,
  generateStoredFileName,
  ALLOWED_MIME_TYPES,
  MAX_FILE_SIZE_BYTES,
} from "../../src/utils/attachment-validator.js";

describe("UT-03: Attachment Validator Unit Tests", () => {
  it("accepts valid JPG file under 5MB", () => {
    const file = {
      mimetype: "image/jpeg",
      originalname: "photo.jpg",
      size: 2 * 1024 * 1024,
    };
    const res = validateAttachmentFile(file);
    expect(res.isValid).toBe(true);
  });

  it("accepts valid PNG file under 5MB", () => {
    const file = {
      mimetype: "image/png",
      originalname: "screenshot.png",
      size: 1 * 1024 * 1024,
    };
    const res = validateAttachmentFile(file);
    expect(res.isValid).toBe(true);
  });

  it("accepts valid WEBP file under 5MB", () => {
    const file = {
      mimetype: "image/webp",
      originalname: "banner.webp",
      size: 500 * 1024,
    };
    const res = validateAttachmentFile(file);
    expect(res.isValid).toBe(true);
  });

  it("accepts valid PDF file under 5MB", () => {
    const file = {
      mimetype: "application/pdf",
      originalname: "report.pdf",
      size: 4.9 * 1024 * 1024,
    };
    const res = validateAttachmentFile(file);
    expect(res.isValid).toBe(true);
  });

  it("accepts file of exactly 5MB (5,242,880 bytes)", () => {
    const file = {
      mimetype: "application/pdf",
      originalname: "exact_5mb.pdf",
      size: MAX_FILE_SIZE_BYTES,
    };
    const res = validateAttachmentFile(file);
    expect(res.isValid).toBe(true);
  });

  it("rejects file larger than 5MB", () => {
    const file = {
      mimetype: "application/pdf",
      originalname: "large.pdf",
      size: MAX_FILE_SIZE_BYTES + 1,
    };
    const res = validateAttachmentFile(file);
    expect(res.isValid).toBe(false);
    expect(res.errorCode).toBe("FILE_TOO_LARGE");
    expect(res.statusCode).toBe(413);
  });

  it("rejects invalid MIME type e.g. .exe file", () => {
    const file = {
      mimetype: "application/x-msdownload",
      originalname: "setup.exe",
      size: 1024 * 1024,
    };
    const res = validateAttachmentFile(file);
    expect(res.isValid).toBe(false);
    expect(res.errorCode).toBe("UNSUPPORTED_FILE_TYPE");
    expect(res.statusCode).toBe(415);
  });

  it("rejects invalid extension even if MIME type is spoofed", () => {
    const file = {
      mimetype: "image/png",
      originalname: "script.sh",
      size: 1024,
    };
    const res = validateAttachmentFile(file);
    expect(res.isValid).toBe(false);
    expect(res.errorCode).toBe("UNSUPPORTED_FILE_TYPE");
  });

  it("rejects missing file input", () => {
    const res = validateAttachmentFile(null);
    expect(res.isValid).toBe(false);
    expect(res.errorCode).toBe("INVALID_FILE");
  });

  it("generates safe UUID stored filename preserving file extension", () => {
    const { storedFileName, ext } = generateStoredFileName("my_document.pdf");
    expect(ext).toBe(".pdf");
    expect(storedFileName).toMatch(/^[0-9a-f-]{36}\.pdf$/i);
  });
});
