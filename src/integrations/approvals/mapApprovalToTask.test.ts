import { describe, expect, it } from "vitest";
import { mapApprovalToTask } from "./mapApprovalToTask";
import type { ApprovalApiRecord } from "./types";

const syncedAt = "2026-05-08T12:00:00.000Z";
const assignedUserId = "profile-user-id-1";

describe("mapApprovalToTask", () => {
  it("maps an assigned approval record into a Supabase task payload", () => {
    const record: ApprovalApiRecord = {
      Created: "6/5/2569 15:23",
      ID: "280",
      "หัวข้อ": "ปรับเนื้อหาข่าว",
      dueDate: "13/5/2569",
      "ผู้ขอ": "Requester Name",
      "ผู้ดำเนินการ": "Nattanai Roudreiw",
      status: "อยู่ระหว่างดำเนินการ",
      "รายละเอียด": "รายละเอียดงาน",
      "ประเภทย่อย": "Graphic",
      method: "MS Form",
      Attachments: "https://example.com/file.pdf",
    };

    const result = mapApprovalToTask(record, syncedAt, assignedUserId);

    expect(result.action).toBe("upsert");
    expect(result.externalId).toBe("280");
    expect(result.reason).toBeNull();
    expect(result.task).toMatchObject({
      title: "ปรับเนื้อหาข่าว",
      description: "รายละเอียดงาน",
      start_date: "2026-05-06",
      end_date: "2026-05-13",
      status: "in_progress",
      completed_at: null,
      assigned_user_id: assignedUserId,
      source: "teams_approvals",
      external_id: "280",
      requester_name: "Requester Name",
      approval_status: "อยู่ระหว่างดำเนินการ",
      request_type: "Graphic",
      source_method: "MS Form",
      attachment_url: "https://example.com/file.pdf",
    });
  });

  it.each(["ดำเนินการแล้ว", "รอ Admin ปิดงาน", "เสร็จสิ้น"])(
    "maps %s to completed",
    (status) => {
      const result = mapApprovalToTask(
        {
          Created: "6/5/2569 15:23",
          ID: "281",
          "หัวข้อ": "งานที่เสร็จแล้ว",
          dueDate: "13/5/2569",
          "ผู้ดำเนินการ": "Nattanai Roudreiw",
          status,
        },
        syncedAt,
        assignedUserId
      );

      expect(result.action).toBe("upsert");
      expect(result.task?.status).toBe("completed");
      expect(result.task?.completed_at).toBe(syncedAt);
    }
  );

  it("skips records that are waiting for lead assignment", () => {
    const result = mapApprovalToTask(
      {
        Created: "7/5/2569 16:42",
        ID: "284",
        "หัวข้อ": "ขอขึ้นแบนเนอร์ Homepage",
        status: "รอหัวหน้ามอบหมายงาน",
      },
      syncedAt,
      null
    );

    expect(result.action).toBe("skip");
    expect(result.task).toBeNull();
    expect(result.reason).toBe("Waiting for lead assignment");
  });

  it("skips assigned records when the assignee cannot be matched to a profile", () => {
    const result = mapApprovalToTask(
      {
        Created: "6/5/2569 15:23",
        ID: "282",
        "หัวข้อ": "งานที่มีผู้รับผิดชอบ",
        dueDate: "13/5/2569",
        "ผู้ดำเนินการ": "Unknown Designer",
        status: "อยู่ระหว่างดำเนินการ",
      },
      syncedAt,
      null
    );

    expect(result.action).toBe("skip");
    expect(result.task).toBeNull();
    expect(result.reason).toBe("Assigned person not found in profiles: Unknown Designer");
  });

  it("marks canceled records for deletion", () => {
    const result = mapApprovalToTask(
      {
        Created: "6/5/2569 15:23",
        ID: "283",
        "หัวข้อ": "งานที่ยกเลิก",
        status: "ยกเลิก",
      },
      syncedAt,
      null
    );

    expect(result.action).toBe("delete");
    expect(result.externalId).toBe("283");
    expect(result.task).toBeNull();
    expect(result.reason).toBe("Canceled in approval system");
  });
});
