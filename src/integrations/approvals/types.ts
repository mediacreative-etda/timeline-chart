import type { TaskStatus } from "../../types/timeline";

export type ApprovalSyncAction = "upsert" | "delete" | "skip";

export interface ApprovalApiRecord {
  id?: string | number | null;
  approvalId?: string | number | null;
  title?: string | null;
  description?: string | null;
  requesterName?: string | null;
  requesterDepartment?: string | null;
  startDate?: string | null;
  dueDate?: string | null;
  completedAt?: string | null;
  status?: string | null;
  approvalUrl?: string | null;
  assignedEmail?: string | null;
  assignedName?: string | null;
  updatedAt?: string | null;
  method?: string | null;
  requestType?: string | null;
  attachmentUrl?: string | null;
  Created?: string | null;
  ID?: string | number | null;
  "หัวข้อ"?: string | null;
  "ผู้ขอ"?: string | null;
  "ผู้ดำเนินการ"?: string | null;
  "รายละเอียด"?: string | null;
  "ประเภทย่อย"?: string | null;
  "ผลดำเนินการ"?: string | null;
  Attachments?: string | null;
  "หมายเหตุ"?: string | null;
  "approval ID"?: string | number | null;
}

export interface ApprovalTaskPayload {
  title: string;
  description: string;
  start_date: string;
  end_date: string;
  status: TaskStatus;
  completed_at: string | null;
  assigned_user_id: string | null;
  source: "teams_approvals";
  external_id: string;
  requester_name: string | null;
  requester_department: string | null;
  approval_status: string | null;
  approval_url: string | null;
  request_type: string | null;
  source_method: string | null;
  attachment_url: string | null;
  last_synced_at: string;
}

export interface ApprovalMappingResult {
  externalId: string | null;
  action: ApprovalSyncAction;
  task: ApprovalTaskPayload | null;
  reason: string | null;
}

export interface ApprovalSyncResult {
  fetched: number;
  upserted: number;
  deleted: number;
  skipped: Array<{
    externalId: string | null;
    reason: string;
  }>;
}
