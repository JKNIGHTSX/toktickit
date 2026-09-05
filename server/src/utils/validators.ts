export interface ValidationErrorDetail {
  field: string;
  message: string;
}

export interface ValidationResult {
  isValid: boolean;
  errors: ValidationErrorDetail[];
  sanitized: {
    summary: string;
    description: string;
    requestedPriority: "LOW" | "MEDIUM" | "HIGH" | "URGENT";
  };
}

const ALLOWED_PRIORITIES = ["LOW", "MEDIUM", "HIGH", "URGENT"] as const;

export function validateTicketInput(input: any): ValidationResult {
  const errors: ValidationErrorDetail[] = [];

  const rawSummary = typeof input.summary === "string" ? input.summary : "";
  const trimmedSummary = rawSummary.trim();

  if (!input.summary || typeof input.summary !== "string" || trimmedSummary.length === 0) {
    errors.push({
      field: "summary",
      message: "Summary is required",
    });
  } else if (trimmedSummary.length < 5 || trimmedSummary.length > 150) {
    errors.push({
      field: "summary",
      message: "Summary must be between 5 and 150 characters",
    });
  }

  const rawDescription = typeof input.description === "string" ? input.description : "";
  const trimmedDescription = rawDescription.trim();

  if (!input.description || typeof input.description !== "string" || trimmedDescription.length === 0) {
    errors.push({
      field: "description",
      message: "Description is required",
    });
  } else if (trimmedDescription.length < 10 || trimmedDescription.length > 2000) {
    errors.push({
      field: "description",
      message: "Description must be between 10 and 2000 characters",
    });
  }

  const priority = input.requestedPriority || "MEDIUM";
  if (!ALLOWED_PRIORITIES.includes(priority)) {
    errors.push({
      field: "requestedPriority",
      message: "Requested Priority must be LOW, MEDIUM, HIGH, or URGENT",
    });
  }

  return {
    isValid: errors.length === 0,
    errors,
    sanitized: {
      summary: trimmedSummary,
      description: trimmedDescription,
      requestedPriority: priority,
    },
  };
}
