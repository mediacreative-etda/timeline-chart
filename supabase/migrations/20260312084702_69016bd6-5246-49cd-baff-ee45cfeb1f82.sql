
-- Drop overly permissive policies
DROP POLICY "Authenticated users can create tasks" ON public.tasks;
DROP POLICY "Authenticated users can update tasks" ON public.tasks;
DROP POLICY "Authenticated users can delete tasks" ON public.tasks;

-- Recreate with created_by check where applicable
CREATE POLICY "Authenticated users can create tasks" ON public.tasks FOR INSERT TO authenticated WITH CHECK (auth.uid() = created_by);
CREATE POLICY "Authenticated users can update tasks" ON public.tasks FOR UPDATE TO authenticated USING (auth.uid() IS NOT NULL);
CREATE POLICY "Authenticated users can delete tasks" ON public.tasks FOR DELETE TO authenticated USING (auth.uid() IS NOT NULL);
