import React, { useState, useEffect } from 'react';
import { useRequester } from '../context/RequesterContext';
import { 
  fetchCategories, 
  fetchRelatedSystems, 
  createTicket, 
  uploadAttachment,
  Category, 
  RelatedSystem, 
  PriorityLevel 
} from '../api';

interface CreateTicketProps {
  onCancel?: () => void;
  onSuccess?: (ticketNumber: string) => void;
}

interface AttachedFile {
  id: string;
  file: File;
  name: string;
  size: number;
}

const ALLOWED_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.webp', '.pdf'];
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const MAX_FILE_COUNT = 5;

export const CreateTicket: React.FC<CreateTicketProps> = ({ onCancel, onSuccess }) => {
  const { currentRequester } = useRequester();

  // Reference Data State
  const [categories, setCategories] = useState<Category[]>([]);
  const [relatedSystems, setRelatedSystems] = useState<RelatedSystem[]>([]);
  const [loadingRefData, setLoadingRefData] = useState<boolean>(true);
  const [refDataError, setRefDataError] = useState<string | null>(null);

  // Form Fields State
  const [categoryId, setCategoryId] = useState<string>('');
  const [relatedSystemId, setRelatedSystemId] = useState<string>('');
  const [requestedPriority, setRequestedPriority] = useState<PriorityLevel>('MEDIUM');
  const [summary, setSummary] = useState<string>('');
  const [description, setDescription] = useState<string>('');
  const [attachments, setAttachments] = useState<AttachedFile[]>([]);

  // Validation Errors State
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [attachmentError, setAttachmentError] = useState<string | null>(null);

  // Submission State
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [submitSuccess, setSubmitSuccess] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Load Reference Data on Mount
  const loadReferenceData = async () => {
    setLoadingRefData(true);
    setRefDataError(null);
    try {
      const [cats, systems] = await Promise.all([
        fetchCategories(),
        fetchRelatedSystems()
      ]);
      setCategories(cats);
      setRelatedSystems(systems);
    } catch (err: any) {
      setRefDataError(err.message || 'Failed to load reference data. Please try again.');
    } finally {
      setLoadingRefData(false);
    }
  };

  useEffect(() => {
    loadReferenceData();
  }, []);

  // Form Validation Logic
  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!categoryId) {
      newErrors.categoryId = 'Category is required';
    }

    if (!relatedSystemId) {
      newErrors.relatedSystemId = 'Related System is required';
    }

    const trimmedSummary = summary.trim();
    if (!trimmedSummary) {
      newErrors.summary = 'Summary is required';
    } else if (trimmedSummary.length < 5) {
      newErrors.summary = 'Summary must be at least 5 characters';
    } else if (trimmedSummary.length > 150) {
      newErrors.summary = 'Summary cannot exceed 150 characters';
    }

    const trimmedDescription = description.trim();
    if (!trimmedDescription) {
      newErrors.description = 'Description is required';
    } else if (trimmedDescription.length < 10) {
      newErrors.description = 'Description must be at least 10 characters';
    } else if (trimmedDescription.length > 2000) {
      newErrors.description = 'Description cannot exceed 2000 characters';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Handle File Selection / Validation
  const handleFiles = (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setAttachmentError(null);

    const newAttachments: AttachedFile[] = [...attachments];
    let errMessage = null;

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const ext = '.' + file.name.split('.').pop()?.toLowerCase();

      if (newAttachments.length >= MAX_FILE_COUNT) {
        errMessage = `Maximum limit of ${MAX_FILE_COUNT} files reached.`;
        break;
      }

      if (!ALLOWED_EXTENSIONS.includes(ext)) {
        errMessage = `Invalid file type "${file.name}". Allowed types: JPG, PNG, WEBP, PDF.`;
        continue;
      }

      if (file.size > MAX_FILE_SIZE) {
        errMessage = `File "${file.name}" exceeds maximum allowed size of 5MB.`;
        continue;
      }

      newAttachments.push({
        id: Math.random().toString(36).substring(2, 9),
        file,
        name: file.name,
        size: file.size
      });
    }

    if (errMessage) {
      setAttachmentError(errMessage);
    }
    setAttachments(newAttachments);
  };

  const removeAttachment = (id: string) => {
    setAttachments(attachments.filter(a => a.id !== id));
    setAttachmentError(null);
  };

  // Form Reset
  const resetForm = () => {
    setCategoryId('');
    setRelatedSystemId('');
    setRequestedPriority('MEDIUM');
    setSummary('');
    setDescription('');
    setAttachments([]);
    setErrors({});
    setAttachmentError(null);
  };

  // Form Submit Handler
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitSuccess(null);
    setSubmitError(null);

    if (!currentRequester) {
      setSubmitError('Please select a requester identity before submitting a ticket.');
      return;
    }

    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);

    try {
      const ticket = await createTicket({
        summary: summary.trim(),
        description: description.trim(),
        requestedPriority,
        categoryId: parseInt(categoryId, 10),
        relatedSystemId: parseInt(relatedSystemId, 10),
        requesterId: currentRequester.id
      }, currentRequester.id);

      // Upload queued attachments sequentially if any
      if (attachments.length > 0) {
        for (const att of attachments) {
          try {
            await uploadAttachment(ticket.id, att.file, currentRequester.id);
          } catch (uploadErr: any) {
            console.error(`Failed to upload attachment ${att.name}:`, uploadErr);
          }
        }
      }

      setSubmitSuccess(ticket.ticketNumber);
      resetForm();
      if (onSuccess) {
        onSuccess(ticket.ticketNumber);
      }
    } catch (err: any) {
      setSubmitError(err.message || 'An error occurred while creating the ticket. Please try again.');
      // Retain form input data on failure as required by spec BR-16
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  if (loadingRefData) {
    return (
      <div className="card shadow-sm p-4 text-center my-4" style={{ backgroundColor: '#FFFFFF', borderColor: '#D1D9D4' }}>
        <div className="spinner-border text-success mx-auto my-3" role="status" style={{ color: '#006B3C' }}>
          <span className="visually-hidden">Loading...</span>
        </div>
        <p style={{ color: '#556B60' }}>Loading categories and systems...</p>
      </div>
    );
  }

  if (refDataError) {
    return (
      <div className="card shadow-sm p-4 my-4" style={{ backgroundColor: '#FFFFFF', borderColor: '#D1D9D4' }}>
        <div className="alert alert-danger mb-3" role="alert" style={{ backgroundColor: '#FDF2F2', borderColor: '#F8B4B4', color: '#B3261E' }}>
          {refDataError}
        </div>
        <div>
          <button className="btn btn-outline-success" onClick={loadReferenceData} style={{ color: '#006B3C', borderColor: '#006B3C' }}>
            Retry Loading Reference Data
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="card shadow-sm border-0 my-4" style={{ backgroundColor: '#FFFFFF', borderRadius: '8px', overflow: 'hidden' }}>
      {/* Header */}
      <div className="card-header border-0 py-3 px-4" style={{ backgroundColor: '#EAF6EF' }}>
        <h2 className="h4 mb-0 fw-bold" style={{ color: '#1E2B24' }}>Create Support Ticket</h2>
        <p className="mb-0 small" style={{ color: '#556B60' }}>Fill out the details below to submit an IT support request</p>
      </div>

      <div className="card-body p-4">
        {/* Success Banner */}
        {submitSuccess && (
          <div className="alert alert-success alert-dismissible fade show mb-4" role="alert" style={{ backgroundColor: '#EAF6EF', borderColor: '#006B3C', color: '#006B3C' }}>
            <h5 className="alert-heading fw-bold mb-1">Ticket Created Successfully!</h5>
            <p className="mb-0">Your ticket number is <strong>{submitSuccess}</strong>. Status is set to <strong>NEW</strong>.</p>
            <button type="button" className="btn-close" onClick={() => setSubmitSuccess(null)} aria-label="Close"></button>
          </div>
        )}

        {/* Global Error Banner */}
        {submitError && (
          <div className="alert alert-danger alert-dismissible fade show mb-4" role="alert" style={{ backgroundColor: '#FDF2F2', borderColor: '#B3261E', color: '#B3261E' }}>
            <h5 className="alert-heading fw-bold mb-1">Submission Failed</h5>
            <p className="mb-0">{submitError}</p>
            <button type="button" className="btn-close" onClick={() => setSubmitError(null)} aria-label="Close"></button>
          </div>
        )}

        <form onSubmit={handleSubmit} noValidate>
          {/* Read-only Information Row */}
          <div className="p-3 mb-4 rounded" style={{ backgroundColor: '#F0F4F1', border: '1px solid #D1D9D4' }}>
            <div className="row g-3">
              <div className="col-12 col-md-4">
                <label className="form-label small fw-semibold text-uppercase" style={{ color: '#556B60' }}>Ticket Number</label>
                <input 
                  type="text" 
                  className="form-control form-control-sm bg-white" 
                  value="Pending Generation" 
                  disabled 
                  readOnly 
                  style={{ color: '#556B60' }}
                />
              </div>
              <div className="col-12 col-md-4">
                <label className="form-label small fw-semibold text-uppercase" style={{ color: '#556B60' }}>Date</label>
                <input 
                  type="text" 
                  className="form-control form-control-sm bg-white" 
                  value={new Date().toLocaleDateString()} 
                  disabled 
                  readOnly 
                  style={{ color: '#556B60' }}
                />
              </div>
              <div className="col-12 col-md-4">
                <label className="form-label small fw-semibold text-uppercase" style={{ color: '#556B60' }}>Requester</label>
                <input 
                  type="text" 
                  className="form-control form-control-sm bg-white" 
                  value={currentRequester ? `${currentRequester.name} (${currentRequester.email})` : 'Not Selected'} 
                  disabled 
                  readOnly 
                  style={{ color: '#556B60' }}
                />
              </div>
            </div>
          </div>

          {/* Ticket Classification Row */}
          <div className="row g-3 mb-3">
            {/* Category Select */}
            <div className="col-12 col-md-4">
              <label htmlFor="categoryId" className="form-label fw-semibold" style={{ color: '#1E2B24' }}>
                Category <span style={{ color: '#B3261E' }}>*</span>
              </label>
              <select
                id="categoryId"
                className={`form-select ${errors.categoryId ? 'is-invalid' : ''}`}
                value={categoryId}
                onChange={(e) => {
                  setCategoryId(e.target.value);
                  if (errors.categoryId) setErrors({ ...errors, categoryId: '' });
                }}
                style={{ borderColor: errors.categoryId ? '#B3261E' : '#D1D9D4' }}
              >
                <option value="">-- Select Category --</option>
                {categories.map((cat) => (
                  <option key={cat.id} value={cat.id}>{cat.name}</option>
                ))}
              </select>
              {errors.categoryId && (
                <div className="invalid-feedback d-block" style={{ color: '#B3261E' }}>
                  {errors.categoryId}
                </div>
              )}
            </div>

            {/* Related System Select */}
            <div className="col-12 col-md-4">
              <label htmlFor="relatedSystemId" className="form-label fw-semibold" style={{ color: '#1E2B24' }}>
                Related System <span style={{ color: '#B3261E' }}>*</span>
              </label>
              <select
                id="relatedSystemId"
                className={`form-select ${errors.relatedSystemId ? 'is-invalid' : ''}`}
                value={relatedSystemId}
                onChange={(e) => {
                  setRelatedSystemId(e.target.value);
                  if (errors.relatedSystemId) setErrors({ ...errors, relatedSystemId: '' });
                }}
                style={{ borderColor: errors.relatedSystemId ? '#B3261E' : '#D1D9D4' }}
              >
                <option value="">-- Select Related System --</option>
                {relatedSystems.map((sys) => (
                  <option key={sys.id} value={sys.id}>{sys.name}</option>
                ))}
              </select>
              {errors.relatedSystemId && (
                <div className="invalid-feedback d-block" style={{ color: '#B3261E' }}>
                  {errors.relatedSystemId}
                </div>
              )}
            </div>

            {/* Requested Priority */}
            <div className="col-12 col-md-4">
              <label htmlFor="requestedPriority" className="form-label fw-semibold" style={{ color: '#1E2B24' }}>
                Requested Priority <span style={{ color: '#B3261E' }}>*</span>
              </label>
              <select
                id="requestedPriority"
                className="form-select"
                value={requestedPriority}
                onChange={(e) => setRequestedPriority(e.target.value as PriorityLevel)}
                style={{ borderColor: '#D1D9D4' }}
              >
                <option value="LOW">LOW</option>
                <option value="MEDIUM">MEDIUM</option>
                <option value="HIGH">HIGH</option>
                <option value="URGENT">URGENT</option>
              </select>
            </div>
          </div>

          {/* Summary Input */}
          <div className="mb-3">
            <div className="d-flex justify-content-between align-items-center mb-1">
              <label htmlFor="summary" className="form-label fw-semibold mb-0" style={{ color: '#1E2B24' }}>
                Summary <span style={{ color: '#B3261E' }}>*</span>
              </label>
              <span className="small text-muted">{summary.length}/150</span>
            </div>
            <input
              type="text"
              id="summary"
              className={`form-control ${errors.summary ? 'is-invalid' : ''}`}
              placeholder="Brief summary of the issue (5–150 characters)"
              value={summary}
              maxLength={150}
              onChange={(e) => {
                setSummary(e.target.value);
                if (errors.summary) setErrors({ ...errors, summary: '' });
              }}
              style={{ borderColor: errors.summary ? '#B3261E' : '#D1D9D4' }}
            />
            {errors.summary && (
              <div className="invalid-feedback d-block" style={{ color: '#B3261E' }}>
                {errors.summary}
              </div>
            )}
          </div>

          {/* Description Input */}
          <div className="mb-4">
            <div className="d-flex justify-content-between align-items-center mb-1">
              <label htmlFor="description" className="form-label fw-semibold mb-0" style={{ color: '#1E2B24' }}>
                Description <span style={{ color: '#B3261E' }}>*</span>
              </label>
              <span className="small text-muted">{description.length}/2000</span>
            </div>
            <textarea
              id="description"
              className={`form-control ${errors.description ? 'is-invalid' : ''}`}
              placeholder="Detailed description of the issue or request (10–2000 characters)"
              rows={5}
              style={{ minHeight: '130px', borderColor: errors.description ? '#B3261E' : '#D1D9D4' }}
              value={description}
              maxLength={2000}
              onChange={(e) => {
                setDescription(e.target.value);
                if (errors.description) setErrors({ ...errors, description: '' });
              }}
            />
            {errors.description && (
              <div className="invalid-feedback d-block" style={{ color: '#B3261E' }}>
                {errors.description}
              </div>
            )}
          </div>

          {/* Attachments Section */}
          <div className="mb-4">
            <label className="form-label fw-semibold" style={{ color: '#1E2B24' }}>
              Attachments <span className="text-muted font-normal">(Optional)</span>
            </label>
            <div 
              className="border-2 border-dashed rounded p-4 text-center"
              style={{ 
                borderStyle: 'dashed', 
                borderColor: '#D1D9D4', 
                backgroundColor: '#F5F7F6',
                cursor: 'pointer' 
              }}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                handleFiles(e.dataTransfer.files);
              }}
              onClick={() => {
                const input = document.getElementById('attachment-input') as HTMLInputElement;
                if (input) input.click();
              }}
            >
              <input
                type="file"
                id="attachment-input"
                className="d-none"
                multiple
                accept=".jpg,.jpeg,.png,.webp,.pdf"
                onChange={(e) => handleFiles(e.target.files)}
              />
              <p className="mb-1 fw-semibold" style={{ color: '#1E2B24' }}>
                Drag and drop files here, or <span style={{ color: '#006B3C', textDecoration: 'underline' }}>browse</span>
              </p>
              <p className="small text-muted mb-0">
                Allowed formats: JPG, PNG, WEBP, PDF (Max file size: 5MB, Max count: 5)
              </p>
            </div>

            {attachmentError && (
              <div className="alert alert-warning py-2 px-3 mt-2 mb-0 small" role="alert" style={{ color: '#B3261E', backgroundColor: '#FDF2F2', borderColor: '#F8B4B4' }}>
                {attachmentError}
              </div>
            )}

            {/* Attached Files List */}
            {attachments.length > 0 && (
              <ul className="list-group mt-3">
                {attachments.map((att) => (
                  <li key={att.id} className="list-group-item d-flex justify-content-between align-items-center py-2 px-3" style={{ borderColor: '#D1D9D4' }}>
                    <div className="d-flex align-items-center me-2 overflow-hidden">
                      <span className="me-2 flex-shrink-0" style={{ color: '#006B3C' }}>📄</span>
                      <span className="fw-medium text-truncate me-2" style={{ maxWidth: '140px', color: '#1E2B24' }}>{att.name}</span>
                      <span className="badge bg-secondary text-white small flex-shrink-0">{formatFileSize(att.size)}</span>
                    </div>
                    <button
                      type="button"
                      className="btn btn-sm btn-link text-danger p-0"
                      onClick={(e) => {
                        e.stopPropagation();
                        removeAttachment(att.id);
                      }}
                      style={{ color: '#B3261E', textDecoration: 'none' }}
                    >
                      Remove
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Form Actions */}
          <div className="d-flex justify-content-end align-items-center gap-2 pt-3 border-top" style={{ borderColor: '#D1D9D4' }}>
            {onCancel && (
              <button
                type="button"
                className="btn btn-outline-secondary px-4"
                onClick={onCancel}
                disabled={isSubmitting}
              >
                Cancel
              </button>
            )}
            <button
              type="submit"
              className="btn text-white px-4 fw-semibold d-flex align-items-center justify-content-center"
              disabled={isSubmitting}
              style={{ backgroundColor: '#006B3C', borderColor: '#006B3C', minWidth: '150px' }}
            >
              {isSubmitting ? (
                <>
                  <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                  Submitting Ticket...
                </>
              ) : (
                'Submit Ticket'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
