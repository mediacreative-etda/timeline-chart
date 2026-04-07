ALTER TABLE public.tasks
ADD COLUMN IF NOT EXISTS completed_at TIMESTAMP WITH TIME ZONE;

UPDATE public.tasks
SET completed_at = updated_at
WHERE status = 'completed'
  AND completed_at IS NULL;

CREATE OR REPLACE FUNCTION public.sync_task_completed_at()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'completed' THEN
    IF TG_OP = 'INSERT' THEN
      NEW.completed_at = COALESCE(NEW.completed_at, now());
    ELSIF OLD.status <> 'completed' THEN
      NEW.completed_at = COALESCE(NEW.completed_at, now());
    ELSIF NEW.completed_at IS NULL THEN
      NEW.completed_at = OLD.completed_at;
    END IF;
  ELSE
    NEW.completed_at = NULL;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

DROP TRIGGER IF EXISTS sync_tasks_completed_at ON public.tasks;

CREATE TRIGGER sync_tasks_completed_at
BEFORE INSERT OR UPDATE ON public.tasks
FOR EACH ROW
EXECUTE FUNCTION public.sync_task_completed_at();
