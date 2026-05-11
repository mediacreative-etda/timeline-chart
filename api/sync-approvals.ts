import { fetchApprovalRecords } from "../src/integrations/approvals/client.js";
import { mapApprovalToTask } from "../src/integrations/approvals/mapApprovalToTask.js";
import type { ApprovalSyncResult } from "../src/integrations/approvals/types";
import { createSupabaseAdminClient } from "../src/integrations/supabase/admin.js";

const json = (res: any, status: number, body: unknown) => {
  res.status(status).json(body);
};

const getHeader = (req: any, name: string) => {
  const value = req.headers?.[name] ?? req.headers?.[name.toLowerCase()];
  return Array.isArray(value) ? value[0] : value;
};

const assertAuthorized = async (
  req: any,
  supabase: ReturnType<typeof createSupabaseAdminClient>
) => {
  const providedSecret = getHeader(req, "x-sync-secret");
  if (providedSecret) {
    const expectedSecret = process.env.APPROVALS_SYNC_SECRET;
    if (!expectedSecret) {
      throw new Error("Missing server environment variable: APPROVALS_SYNC_SECRET");
    }

    return providedSecret === expectedSecret;
  }

  const authorization = getHeader(req, "authorization");
  const token = authorization?.startsWith("Bearer ") ? authorization.slice("Bearer ".length) : null;

  if (!token) {
    return false;
  }

  const { data, error } = await supabase.auth.getUser(token);
  return !error && Boolean(data.user);
};

const normalizeName = (value?: string | null) => value?.trim().toLowerCase() ?? "";

const getAssignedName = (record: any) => record.assignedName ?? record["ผู้ดำเนินการ"];

const fetchAssigneeLookup = async (supabase: ReturnType<typeof createSupabaseAdminClient>) => {
  const { data, error } = await supabase
    .from("profiles")
    .select("user_id, display_name");

  if (error) {
    throw error;
  }

  return new Map(
    (data ?? [])
      .filter((profile: any) => profile.display_name)
      .map((profile: any) => [normalizeName(profile.display_name), profile.user_id])
  );
};

export default async function handler(req: any, res: any) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return json(res, 405, { error: "Method not allowed. Use POST." });
  }

  try {
    const supabase = createSupabaseAdminClient();

    if (!(await assertAuthorized(req, supabase))) {
      return json(res, 401, { error: "Unauthorized sync request" });
    }

    const records = await fetchApprovalRecords();
    const isDryRun = req.query?.dryRun === "true";
    const assigneeLookup = await fetchAssigneeLookup(supabase);
    const syncedAt = new Date().toISOString();
    const mapped = records.map((record) =>
      mapApprovalToTask(record, syncedAt, assigneeLookup.get(normalizeName(getAssignedName(record))) ?? null)
    );
    const tasks = mapped.flatMap((result) => (result.action === "upsert" && result.task ? [result.task] : []));
    const deletedExternalIds = mapped.flatMap((result) =>
      result.action === "delete" && result.externalId ? [result.externalId] : []
    );
    const skipped = mapped.flatMap((result) =>
      result.action === "skip" && result.reason
        ? [{ externalId: result.externalId, reason: result.reason }]
        : []
    );

    if (isDryRun) {
      const result: ApprovalSyncResult = {
        fetched: records.length,
        upserted: 0,
        deleted: 0,
        skipped,
      };

      return json(res, 200, { ...result, deletePreview: deletedExternalIds, preview: tasks });
    }

    if (deletedExternalIds.length > 0) {
      const { error } = await supabase
        .from("tasks")
        .delete()
        .eq("source", "teams_approvals")
        .in("external_id", deletedExternalIds);

      if (error) {
        throw error;
      }
    }

    if (tasks.length === 0) {
      const result: ApprovalSyncResult = {
        fetched: records.length,
        upserted: 0,
        deleted: deletedExternalIds.length,
        skipped,
      };

      return json(res, 200, result);
    }

    const { error } = await supabase
      .from("tasks")
      .upsert(tasks, { onConflict: "source,external_id" });

    if (error) {
      throw error;
    }

    const result: ApprovalSyncResult = {
      fetched: records.length,
      upserted: tasks.length,
      deleted: deletedExternalIds.length,
      skipped,
    };

    return json(res, 200, result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown sync error";
    return json(res, 500, { error: message });
  }
}
