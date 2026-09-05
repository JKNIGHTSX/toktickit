import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { CreateTicket } from '../../src/components/CreateTicket';
import * as RequesterModule from '../../src/context/RequesterContext';
import * as api from '../../src/api';

// Mock API functions
vi.mock('../../src/api', () => ({
  fetchCategories: vi.fn(),
  fetchRelatedSystems: vi.fn(),
  createTicket: vi.fn()
}));

// Mock useRequester hook
vi.mock('../../src/context/RequesterContext', () => ({
  useRequester: vi.fn()
}));

const mockRequester = {
  id: 123,
  name: 'Jane Doe',
  email: 'jane.doe@toktickit.local',
  department: 'Engineering',
  isActive: true
};

const mockCategories = [
  { id: 1, name: 'Hardware', code: 'HW', description: null, isActive: true },
  { id: 2, name: 'Software', code: 'SW', description: null, isActive: true }
];

const mockSystems = [
  { id: 1, name: 'Email System', code: 'MAIL', description: null, isActive: true },
  { id: 2, name: 'VPN Service', code: 'VPN', description: null, isActive: true }
];

function setupRequesterMock() {
  (RequesterModule.useRequester as any).mockReturnValue({
    currentRequester: mockRequester,
    requesters: [mockRequester],
    isLoading: false,
    error: null,
    selectRequester: vi.fn(),
    clearRequester: vi.fn(),
    refreshRequesters: vi.fn()
  });
}

describe('CreateTicket UI Component (Lab 2 — GitHub Issue #4)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (api.fetchCategories as any).mockResolvedValue(mockCategories);
    (api.fetchRelatedSystems as any).mockResolvedValue(mockSystems);
  });

  it('UI-03: loads and populates category and related system options', async () => {
    setupRequesterMock();
    render(<CreateTicket />);

    // Shows loading state initially
    expect(screen.getByText(/loading categories and systems/i)).toBeInTheDocument();

    // Wait for reference data to load
    await waitFor(() => {
      expect(screen.getByLabelText(/category/i)).toBeInTheDocument();
    });

    const categorySelect = screen.getByLabelText(/category/i) as HTMLSelectElement;
    const systemSelect = screen.getByLabelText(/related system/i) as HTMLSelectElement;

    // Checks that active items are present, inactive items are excluded
    expect(categorySelect.options).toHaveLength(3); // Default placeholder + 2 active
    expect(categorySelect.options[1].text).toBe('Hardware');
    expect(categorySelect.options[2].text).toBe('Software');

    expect(systemSelect.options).toHaveLength(3); // Default placeholder + 2 active
    expect(systemSelect.options[1].text).toBe('Email System');
  });

  it('UI-03: displays reference data load error with retry button', async () => {
    (api.fetchCategories as any).mockRejectedValueOnce(new Error('Network error loading reference data'));
    setupRequesterMock();

    render(<CreateTicket />);

    await waitFor(() => {
      expect(screen.getByText(/network error loading reference data/i)).toBeInTheDocument();
    });

    const retryButton = screen.getByRole('button', { name: /retry/i });
    expect(retryButton).toBeInTheDocument();

    (api.fetchCategories as any).mockResolvedValueOnce(mockCategories);
    fireEvent.click(retryButton);

    await waitFor(() => {
      expect(screen.getByLabelText(/category/i)).toBeInTheDocument();
    });
  });

  it('UI-03: validates required fields and length constraints on submit', async () => {
    setupRequesterMock();
    render(<CreateTicket />);

    await waitFor(() => {
      expect(screen.getByLabelText(/category/i)).toBeInTheDocument();
    });

    const submitBtn = screen.getByRole('button', { name: /submit ticket/i });
    fireEvent.click(submitBtn);

    // Verifies inline error messages
    await waitFor(() => {
      expect(screen.getByText(/category is required/i)).toBeInTheDocument();
      expect(screen.getByText(/related system is required/i)).toBeInTheDocument();
      expect(screen.getByText(/summary is required/i)).toBeInTheDocument();
      expect(screen.getByText(/description is required/i)).toBeInTheDocument();
    });

    expect(api.createTicket).not.toHaveBeenCalled();
  });

  it('UI-03: validates summary and description minimum length limits', async () => {
    setupRequesterMock();
    render(<CreateTicket />);

    await waitFor(() => {
      expect(screen.getByLabelText(/category/i)).toBeInTheDocument();
    });

    const summaryInput = screen.getByPlaceholderText(/brief summary/i);
    const descInput = screen.getByPlaceholderText(/detailed description/i);

    fireEvent.change(summaryInput, { target: { value: '1234' } }); // < 5 chars
    fireEvent.change(descInput, { target: { value: '123456789' } }); // < 10 chars

    const submitBtn = screen.getByRole('button', { name: /submit ticket/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(screen.getByText(/summary must be at least 5 characters/i)).toBeInTheDocument();
      expect(screen.getByText(/description must be at least 10 characters/i)).toBeInTheDocument();
    });

    expect(api.createTicket).not.toHaveBeenCalled();
  });

  it('UI-04: successfully submits ticket with correct payload and shows success feedback', async () => {
    (api.createTicket as any).mockResolvedValueOnce({
      id: 'ticket-999',
      ticketNumber: 'TKT-2026-000001',
      summary: 'Laptop screen flickering randomly',
      description: 'The display flickers when opening heavy IDE applications.',
      status: 'NEW',
      requestedPriority: 'HIGH',
      requesterId: mockRequester.id,
      categoryId: 'cat-1',
      relatedSystemId: 'sys-1'
    });

    setupRequesterMock();
    render(<CreateTicket />);

    await waitFor(() => {
      expect(screen.getByLabelText(/category/i)).toBeInTheDocument();
    });

    fireEvent.change(screen.getByLabelText(/category/i), { target: { value: '1' } });
    fireEvent.change(screen.getByLabelText(/related system/i), { target: { value: '1' } });
    fireEvent.change(screen.getByLabelText(/requested priority/i), { target: { value: 'HIGH' } });
    fireEvent.change(screen.getByPlaceholderText(/brief summary/i), { target: { value: 'Laptop screen flickering randomly' } });
    fireEvent.change(screen.getByPlaceholderText(/detailed description/i), { target: { value: 'The display flickers when opening heavy IDE applications.' } });

    const submitBtn = screen.getByRole('button', { name: /submit ticket/i });
    fireEvent.click(submitBtn);

    // Verify API call payload
    await waitFor(() => {
      expect(api.createTicket).toHaveBeenCalledWith(
        {
          summary: 'Laptop screen flickering randomly',
          description: 'The display flickers when opening heavy IDE applications.',
          requestedPriority: 'HIGH',
          categoryId: 1,
          relatedSystemId: 1,
          requesterId: mockRequester.id
        },
        mockRequester.id
      );
    });

    // Verify success banner with ticket number
    await waitFor(() => {
      expect(screen.getByText(/ticket created successfully!/i)).toBeInTheDocument();
      expect(screen.getByText(/TKT-2026-000001/i)).toBeInTheDocument();
    });

    // Verify form reset after success
    expect((screen.getByPlaceholderText(/brief summary/i) as HTMLInputElement).value).toBe('');
    expect((screen.getByPlaceholderText(/detailed description/i) as HTMLTextAreaElement).value).toBe('');
  });

  it('UI-05: handles API failure, shows error feedback, and retains form input data', async () => {
    (api.createTicket as any).mockRejectedValueOnce(new Error('Internal Database Error'));

    setupRequesterMock();
    render(<CreateTicket />);

    await waitFor(() => {
      expect(screen.getByLabelText(/category/i)).toBeInTheDocument();
    });

    const summaryText = 'Database connection error during query';
    const descText = 'Full stack error log observed when running batch update operations.';

    fireEvent.change(screen.getByLabelText(/category/i), { target: { value: '2' } });
    fireEvent.change(screen.getByLabelText(/related system/i), { target: { value: '2' } });
    fireEvent.change(screen.getByPlaceholderText(/brief summary/i), { target: { value: summaryText } });
    fireEvent.change(screen.getByPlaceholderText(/detailed description/i), { target: { value: descText } });

    const submitBtn = screen.getByRole('button', { name: /submit ticket/i });
    fireEvent.click(submitBtn);

    // Verify error banner
    await waitFor(() => {
      expect(screen.getByText(/submission failed/i)).toBeInTheDocument();
      expect(screen.getByText(/internal database error/i)).toBeInTheDocument();
    });

    // Verify input fields retain filled values (BR-16)
    expect((screen.getByPlaceholderText(/brief summary/i) as HTMLInputElement).value).toBe(summaryText);
    expect((screen.getByPlaceholderText(/detailed description/i) as HTMLTextAreaElement).value).toBe(descText);
    expect((screen.getByLabelText(/category/i) as HTMLSelectElement).value).toBe('2');
  });

  it('UI-04: prevents duplicate submissions by disabling submit button during request', async () => {
    let resolveApiCall: (val: any) => void;
    const slowPromise = new Promise((resolve) => {
      resolveApiCall = resolve;
    });
    (api.createTicket as any).mockReturnValueOnce(slowPromise);

    setupRequesterMock();
    render(<CreateTicket />);

    await waitFor(() => {
      expect(screen.getByLabelText(/category/i)).toBeInTheDocument();
    });

    fireEvent.change(screen.getByLabelText(/category/i), { target: { value: '1' } });
    fireEvent.change(screen.getByLabelText(/related system/i), { target: { value: '1' } });
    fireEvent.change(screen.getByPlaceholderText(/brief summary/i), { target: { value: 'VPN connection dropping frequently' } });
    fireEvent.change(screen.getByPlaceholderText(/detailed description/i), { target: { value: 'Whenever I connect to the internal network, it disconnects after 5 minutes.' } });

    const submitBtn = screen.getByRole('button', { name: /submit ticket/i });
    fireEvent.click(submitBtn);

    // Verify button is disabled and shows spinner text
    await waitFor(() => {
      expect(submitBtn).toBeDisabled();
      expect(screen.getByText(/submitting ticket\.\.\./i)).toBeInTheDocument();
    });

    // Resolve API call
    resolveApiCall!({
      id: 'ticket-100',
      ticketNumber: 'TKT-2026-000002',
      summary: 'VPN connection dropping frequently',
      description: 'Whenever I connect to the internal network, it disconnects after 5 minutes.',
      status: 'NEW',
      requestedPriority: 'MEDIUM',
      requesterId: mockRequester.id,
      categoryId: 'cat-1',
      relatedSystemId: 'sys-1'
    });

    await waitFor(() => {
      expect(screen.getByText(/TKT-2026-000002/i)).toBeInTheDocument();
    });
  });

  it('renders attachment section and handles file type validation', async () => {
    setupRequesterMock();
    render(<CreateTicket />);

    await waitFor(() => {
      expect(screen.getByText(/allowed formats: jpg, png, webp, pdf/i)).toBeInTheDocument();
    });

    const fileInput = document.getElementById('attachment-input') as HTMLInputElement;
    expect(fileInput).toBeInTheDocument();

    const invalidFile = new File(['hello'], 'script.exe', { type: 'application/x-msdownload' });
    fireEvent.change(fileInput, { target: { files: [invalidFile] } });

    await waitFor(() => {
      expect(screen.getByText(/invalid file type "script.exe"/i)).toBeInTheDocument();
    });
  });
});
