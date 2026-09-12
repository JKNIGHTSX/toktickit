import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { RequesterSelect } from "../../src/components/RequesterSelect";
import * as RequesterModule from "../../src/context/RequesterContext";

vi.mock("../../src/context/RequesterContext", () => ({
  useRequester: vi.fn(),
}));

const mockRequesters = [
  { id: 1, name: "Jennifer Anderson", email: "jennifer.anderson@toktickit.local", department: "Marketing", isActive: true },
  { id: 2, name: "Michael Chen", email: "michael.chen@toktickit.local", department: "Engineering", isActive: true },
  { id: 3, name: "Sarah Wilson", email: "sarah.wilson@toktickit.local", department: "HR", isActive: true },
];

function setupRequesterMock(overrides: Partial<RequesterModule.RequesterContextType> = {}) {
  const defaults: RequesterModule.RequesterContextType = {
    currentRequester: null,
    requesters: mockRequesters,
    isLoading: false,
    error: null,
    selectRequester: vi.fn(),
    clearRequester: vi.fn(),
    refreshRequesters: vi.fn(),
  };
  (RequesterModule.useRequester as any).mockReturnValue({ ...defaults, ...overrides });
}

describe("UI-01 & UI-02: RequesterSelect Component Tests", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // --- UI-01: Renders active requesters dropdown ---

  it("UI-01 / AC-01: renders the requester selector heading and select dropdown", () => {
    setupRequesterMock();
    render(<RequesterSelect />);

    expect(screen.getByText("Select Development Requester")).toBeInTheDocument();
    expect(screen.getByRole("combobox")).toBeInTheDocument();
  });

  it("UI-01 / AC-01: populates dropdown with all active requesters from context", () => {
    setupRequesterMock();
    render(<RequesterSelect />);

    const select = screen.getByRole("combobox") as HTMLSelectElement;
    // placeholder + 3 requesters
    expect(select.options).toHaveLength(4);
    expect(select.options[1].text).toContain("Jennifer Anderson");
    expect(select.options[2].text).toContain("Michael Chen");
    expect(select.options[3].text).toContain("Sarah Wilson");
  });

  it("UI-01 / AC-01: displays requester department alongside name", () => {
    setupRequesterMock();
    render(<RequesterSelect />);

    const select = screen.getByRole("combobox") as HTMLSelectElement;
    expect(select.options[1].text).toContain("Marketing");
    expect(select.options[2].text).toContain("Engineering");
  });

  it("UI-01 / AC-01: Continue button is disabled when no requester is selected", () => {
    setupRequesterMock();
    render(<RequesterSelect />);

    const continueBtn = screen.getByRole("button", { name: /continue/i });
    expect(continueBtn).toBeDisabled();
  });

  it("UI-01 / AC-01: Continue button becomes enabled after selecting a requester", () => {
    setupRequesterMock();
    render(<RequesterSelect />);

    const select = screen.getByRole("combobox");
    fireEvent.change(select, { target: { value: "1" } });

    const continueBtn = screen.getByRole("button", { name: /continue/i });
    expect(continueBtn).not.toBeDisabled();
  });

  it("UI-01 / AC-01: selecting a requester and clicking Continue calls selectRequester", () => {
    const selectRequesterMock = vi.fn();
    const onContinueMock = vi.fn();
    setupRequesterMock({ selectRequester: selectRequesterMock });

    render(<RequesterSelect onContinue={onContinueMock} />);

    const select = screen.getByRole("combobox");
    fireEvent.change(select, { target: { value: "2" } });

    const continueBtn = screen.getByRole("button", { name: /continue/i });
    fireEvent.click(continueBtn);

    expect(selectRequesterMock).toHaveBeenCalledWith(2);
    expect(onContinueMock).toHaveBeenCalled();
  });

  // --- Loading state ---

  it("UI-01: renders loading spinner while requesters are being fetched", () => {
    setupRequesterMock({ isLoading: true, requesters: [] });
    render(<RequesterSelect />);

    expect(screen.getByRole("status")).toBeInTheDocument();
    expect(screen.getByText(/loading development requesters/i)).toBeInTheDocument();
  });

  // --- Error state ---

  it("UI-01: renders error alert with Retry button when fetch fails", () => {
    const refreshMock = vi.fn();
    setupRequesterMock({ error: "Network error", requesters: [], refreshRequesters: refreshMock });
    render(<RequesterSelect />);

    expect(screen.getByRole("alert")).toBeInTheDocument();
    expect(screen.getByText(/network error/i)).toBeInTheDocument();

    const retryBtn = screen.getByRole("button", { name: /retry/i });
    expect(retryBtn).toBeInTheDocument();
    fireEvent.click(retryBtn);
    expect(refreshMock).toHaveBeenCalled();
  });

  // --- Empty state ---

  it("UI-01: renders empty state warning when no active requesters exist", () => {
    setupRequesterMock({ requesters: [] });
    render(<RequesterSelect />);

    expect(screen.getByText(/no active requesters/i)).toBeInTheDocument();
  });

  // --- UI-02: Unselected Requester guard ---

  it("UI-02 / AC-02: shows the requester selector when currentRequester is null", () => {
    setupRequesterMock({ currentRequester: null });
    render(<RequesterSelect />);

    expect(screen.getByRole("combobox")).toBeInTheDocument();
    expect(screen.getByText("Select Development Requester")).toBeInTheDocument();
  });

  it("UI-02 / AC-02: includes Lab 3 authentication notice informing user this is not a login screen", () => {
    setupRequesterMock();
    render(<RequesterSelect />);

    expect(screen.getByText(/this is for testing only and is not a login screen/i)).toBeInTheDocument();
    expect(screen.getByText(/authentication coming in lab 3/i)).toBeInTheDocument();
  });
});
