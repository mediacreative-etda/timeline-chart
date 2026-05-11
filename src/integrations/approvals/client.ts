import type { ApprovalApiRecord } from "./types";

const mockApprovalRecords: ApprovalApiRecord[] = [
  {
    id: "mock-approval-001",
    title: "Mock approval task",
    description: "Temporary mock data for testing the approval sync endpoint.",
    requesterName: "Requester Name",
    requesterDepartment: "Corporate Communications",
    assignedName: "Nattapong Worapivut",
    startDate: "2026-05-11",
    dueDate: "2026-05-15",
    status: "อยู่ระหว่างดำเนินการ",
  },
  {
    id: "mock-approval-002",
    title: "Mock approval task for Nattanai",
    description: "Temporary mock data for testing completed status.",
    requesterName: "Requester Name",
    requesterDepartment: "Corporate Communications",
    assignedName: "Nattanai Roudreiw",
    startDate: "2026-05-13",
    dueDate: "2026-05-20",
    status: "เสร็จสิ้น",
  },
  {
    id: "mock-approval-003",
    title: "Mock canceled approval task",
    description: "Temporary mock data for testing canceled deletion.",
    requesterName: "Requester Name",
    requesterDepartment: "Corporate Communications",
    assignedName: "Napadol Utsanaboonsiri",
    startDate: "2026-05-16",
    dueDate: "2026-05-18",
    status: "ยกเลิก",
  },
  {
    id: "mock-approval-004",
    title: "Mock waiting for lead assignment",
    description: "Temporary mock data for testing lead assignment skip.",
    requesterName: "Requester Name",
    requesterDepartment: "Corporate Communications",
    startDate: "2026-05-18",
    dueDate: "2026-05-22",
    status: "รอหัวหน้ามอบหมายงาน",
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

