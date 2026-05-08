ALTER TABLE public.tasks
ADD COLUMN IF NOT EXISTS source TEXT NOT NULL DEFAULT 'manual',
ADD COLUMN IF NOT EXISTS external_id TEXT,
ADD COLUMN IF NOT EXISTS requester_name TEXT,
ADD COLUMN IF NOT EXISTS requester_department TEXT,
ADD COLUMN IF NOT EXISTS approval_status TEXT,
ADD COLUMN IF NOT EXISTS approval_url TEXT,
ADD COLUMN IF NOT EXISTS request_type TEXT,
ADD COLUMN IF NOT EXISTS source_method TEXT,
ADD COLUMN IF NOT EXISTS attachment_url TEXT,
ADD COLUMN IF NOT EXISTS last_synced_at TIMESTAMP WITH TIME ZONE;

CREATE UNIQUE INDEX IF NOT EXISTS tasks_source_external_id_unique
ON public.tasks (source, external_id);
