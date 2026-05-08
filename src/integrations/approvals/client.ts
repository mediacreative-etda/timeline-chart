import type { ApprovalApiRecord } from "./types";

const mockApprovalRecords: ApprovalApiRecord[] = [
  {
    id: "mock-approval-001",
    title: "Mock approval task",
    description: "Temporary mock data for testing the approval sync endpoint.",
    requesterName: "Requester Name",
    requesterDepartment: "Corporate Communications",
    startDate: new Date().toISOString(),
    dueDate: new Date().toISOString(),
    status: "pending",
  },
];

const getRequiredEnv = (name: string) => {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing server environment variable: ${name}`);
  }

  return value;
};

export const fetchApprovalRecords = async (): Promise<ApprovalApiRecord[]> => {
  if (process.env.APPROVALS_MOCK_MODE === "true") {
    return mockApprovalRecords;
  }

  const baseUrl = getRequiredEnv("APPROVALS_API_BASE_URL").replace(/\/$/, "");
  const apiKey = getRequiredEnv("APPROVALS_API_KEY");

  const response = await fetch(`${baseUrl}/approvals`, {
    headers: {
      Authorization: `Bearer ${apiKey}`,
      Accept: "application/json",
    },
  });

  if (!response.ok) {
    throw new Error(`Approvals API request failed with ${response.status}`);
  }

  const data = await response.json();

  if (Array.isArray(data)) {
    return data as ApprovalApiRecord[];
  }

  if (Array.isArray(data.records)) {
    return data.records as ApprovalApiRecord[];
  }

  if (Array.isArray(data.items)) {
    return data.items as ApprovalApiRecord[];
  }

  throw new Error("Approvals API response must be an array, records array, or items array");
};
