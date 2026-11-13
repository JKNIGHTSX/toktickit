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

export interface ActionTakenInput {
  actionDescription?: any;
  result?: any;
  isFollowUpRequired?: any;
  followUpNote?: any;
  attachmentNotes?: any;
  actionDateTime?: any;
}

export interface ActionTakenValidationResult {
  isValid: boolean;
  errors: ValidationErrorDetail[];
  code?: string;
  sanitized: {
    actionDescription: string;
    result: string;
    isFollowUpRequired: boolean;
    followUpNote: string | null;
    attachmentNotes: string | null;
    actionDateTime: Date;
  };
}

export function validateActionTakenInput(
  input: ActionTakenInput,
  options: { isUpdate?: boolean } = {}
): ActionTakenValidationResult {
  const errors: ValidationErrorDetail[] = [];
  let errorCode = "VALIDATION_ERROR";

  // actionDescription: Required string, 5 to 1000 characters
  const rawDesc = typeof input.actionDescription === "string" ? input.actionDescription : "";
  const trimmedDesc = rawDesc.trim();
  if (input.actionDescription === undefined || input.actionDescription === null || trimmedDesc.length === 0) {
    if (!options.isUpdate || input.actionDescription !== undefined) {
      errors.push({
        field: "actionDescription",
        message: "Action description is required",
      });
    }
  } else if (trimmedDesc.length < 5 || trimmedDesc.length > 1000) {
    errors.push({
      field: "actionDescription",
      message: "Action description must be between 5 and 1000 characters",
    });
  }

  // result: Required string, 2 to 1000 characters
  const rawResult = typeof input.result === "string" ? input.result : "";
  const trimmedResult = rawResult.trim();
  if (input.result === undefined || input.result === null || trimmedResult.length === 0) {
    if (!options.isUpdate || input.result !== undefined) {
      errors.push({
        field: "result",
        message: "Result is required",
      });
    }
  } else if (trimmedResult.length < 2 || trimmedResult.length > 1000) {
    errors.push({
      field: "result",
      message: "Result must be between 2 and 1000 characters",
    });
  }

  // isFollowUpRequired: boolean (defaults to false)
  const isFollowUpRequired = Boolean(input.isFollowUpRequired);

  // followUpNote: conditional
  let followUpNote: string | null = null;
  if (typeof input.followUpNote === "string") {
    followUpNote = input.followUpNote.trim();
  }

  if (isFollowUpRequired) {
    if (!followUpNote || followUpNote.length < 3 || followUpNote.length > 1000) {
      errorCode = "FOLLOW_UP_NOTE_REQUIRED";
      errors.push({
        field: "followUpNote",
        message: "Follow-up note is required (between 3 and 1000 characters) when follow-up is requested",
      });
    }
  } else {
    // If false, must be null or empty
    if (followUpNote && followUpNote.length > 0) {
      errors.push({
        field: "followUpNote",
        message: "Follow-up note must be empty or null when follow-up is not required",
      });
    }
    followUpNote = null;
  }

  // attachmentNotes: optional string, max 500 characters
  let attachmentNotes: string | null = null;
  if (typeof input.attachmentNotes === "string") {
    attachmentNotes = input.attachmentNotes.trim();
    if (attachmentNotes.length > 500) {
      errors.push({
        field: "attachmentNotes",
        message: "Attachment notes must not exceed 500 characters",
      });
    }
    if (attachmentNotes.length === 0) {
      attachmentNotes = null;
    }
  }

  // actionDateTime: optional ISO-8601 string (defaults to now). Cannot be in future (>5 mins)
  let actionDateTime = new Date();
  if (input.actionDateTime) {
    const parsed = new Date(input.actionDateTime);
    if (isNaN(parsed.getTime())) {
      errors.push({
        field: "actionDateTime",
        message: "Action date time must be a valid ISO-8601 date string",
      });
    } else {
      const nowPlus5Min = Date.now() + 5 * 60 * 1000;
      if (parsed.getTime() > nowPlus5Min) {
        errors.push({
          field: "actionDateTime",
          message: "Action date time cannot be in the future (more than 5 minutes ahead)",
        });
      } else {
        actionDateTime = parsed;
      }
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
    code: errors.length > 0 ? errorCode : undefined,
    sanitized: {
      actionDescription: trimmedDesc,
      result: trimmedResult,
      isFollowUpRequired,
      followUpNote,
      attachmentNotes,
      actionDateTime,
    },
  };
}

