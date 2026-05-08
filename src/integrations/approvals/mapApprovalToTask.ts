import type { ApprovalApiRecord, ApprovalMappingResult, ApprovalTaskPayload } from "./types";
import type { TaskStatus } from "../../types/timeline";

const firstText = (...values: unknown[]) => {
  for (const value of values) {
    if (value === null || value === undefined) continue;

    const text = String(value).trim();
    if (text) return text;
  }

  return null;
};

const parseSlashDate = (value: string) => {
  const match = value.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})(?:\s+(\d{1,2}):(\d{2}))?/);
  if (!match) return null;

  const [, dayText, monthText, yearText, hourText = "0", minuteText = "0"] = match;
  const day = Number(dayText);
  const month = Number(monthText);
  const rawYear = Number(yearText);
  const year = rawYear > 2400 ? rawYear - 543 : rawYear;
  const hour = Number(hourText);
  const minute = Number(minuteText);

  if (!day || !month || month > 12 || day > 31) return null;

  return { year, month, day, hour, minute };
};

const pad = (value: number) => String(value).padStart(2, "0");

const toIsoDate = (value?: string | null) => {
  const text = firstText(value);
  if (!text) return null;

  const slashDate = parseSlashDate(text);
  if (slashDate) {
    return `${slashDate.year}-${pad(slashDate.month)}-${pad(slashDate.day)}`;
  }

  const date = new Date(text);
  if (Number.isNaN(date.getTime())) return null;

  return date.toISOString().slice(0, 10);
};

const toIsoDateTime = (value?: string | null) => {
  const text = firstText(value);
  if (!text) return null;

  const slashDate = parseSlashDate(text);
  if (slashDate) {
    return `${slashDate.year}-${pad(slashDate.month)}-${pad(slashDate.day)}T${pad(slashDate.hour)}:${pad(slashDate.minute)}:00+07:00`;
  }

  const date = new Date(text);
  if (Number.isNaN(date.getTime())) return null;

  return date.toISOString();
};

const normalizeStatus = (status?: string | null) => status?.trim().replace(/\s+/g, " ").toLowerCase() ?? "";

export const isCanceledApprovalStatus = (status?: string | null) => {
  const normalized = normalizeStatus(status);
  return ["ยกเลิก", "cancelled", "canceled"].includes(normalized);
};

const isWaitingForLeadStatus = (status?: string | null) => {
  const normalized = normalizeStatus(status);
  return normalized === "รอหัวหน้ามอบหมายงาน";
};

const mapApprovalStatus = (status?: string | null): TaskStatus => {
  const normalized = status?.trim().toLowerCase() ?? "";

  if (
    [
      "ดำเนินการแล้ว",
      "รอ admin ปิดงาน",
      "เสร็จสิ้น",
      "approved",
      "completed",
      "complete",
      "done",
      "finished",
    ].includes(normalized)
  ) {
    return "completed";
  }

  if (["อยู่ระหว่างดำเนินการ", "in_progress", "in progress", "processing", "working"].includes(normalized)) {
    return "in_progress";
  }

  return "not_started";
};

export const mapApprovalToTask = (
  record: ApprovalApiRecord,
  syncedAt = new Date().toISOString(),
  assignedUserId: string | null = null
): ApprovalMappingResult => {
  const externalId = firstText(record.approvalId, record["approval ID"], record.id, record.ID);
  const title = firstText(record.title, record["หัวข้อ"]);
  const description = firstText(record.description, record["รายละเอียด"]) ?? "";
  const assignedName = firstText(record.assignedName, record["ผู้ดำเนินการ"]);
  const approvalStatus = firstText(record.status);
  const startDate = toIsoDate(firstText(record.startDate, record.Created));
  const endDate = toIsoDate(firstText(record.dueDate, record.startDate, record.Created));

  if (!externalId) {
    return { externalId, action: "skip", task: null, reason: "Missing approval ID" };
  }

  if (isCanceledApprovalStatus(approvalStatus)) {
    return { externalId, action: "delete", task: null, reason: "Canceled in approval system" };
  }

  if (isWaitingForLeadStatus(approvalStatus) || !assignedName) {
    return { externalId, action: "skip", task: null, reason: "Waiting for lead assignment" };
  }

  if (!assignedUserId) {
    return { externalId, action: "skip", task: null, reason: `Assigned person not found in profiles: ${assignedName}` };
  }

  if (!title) {
    return { externalId, action: "skip", task: null, reason: "Missing title" };
  }

  if (!startDate || !endDate) {
    return { externalId, action: "skip", task: null, reason: "Missing valid start or due date" };
  }

  const status = mapApprovalStatus(approvalStatus);

  const task: ApprovalTaskPayload = {
    title,
    description,
    start_date: startDate,
    end_date: endDate < startDate ? startDate : endDate,
    status,
    completed_at: status === "completed" ? toIsoDateTime(firstText(record.completedAt, record.updatedAt)) ?? syncedAt : null,
    assigned_user_id: assignedUserId,
    source: "teams_approvals",
    external_id: externalId,
    requester_name: firstText(record.requesterName, record["ผู้ขอ"]),
    requester_department: record.requesterDepartment?.trim() || null,
    approval_status: approvalStatus,
    approval_url: firstText(record.approvalUrl),
    request_type: firstText(record.requestType, record["ประเภทย่อย"]),
    source_method: firstText(record.method),
    attachment_url: firstText(record.attachmentUrl, record.Attachments),
    last_synced_at: syncedAt,
  };

  return { externalId, action: "upsert", task, reason: null };
};
