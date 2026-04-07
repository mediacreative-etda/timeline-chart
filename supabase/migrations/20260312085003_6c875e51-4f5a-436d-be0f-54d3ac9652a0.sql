
-- Allow profiles without corresponding auth users (for team member placeholders)
ALTER TABLE public.profiles DROP CONSTRAINT profiles_user_id_fkey;

-- Also allow tasks to reference these placeholder profiles
ALTER TABLE public.tasks DROP CONSTRAINT tasks_assigned_user_id_fkey;
