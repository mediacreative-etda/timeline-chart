
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;

CREATE POLICY "Authenticated users can insert profiles"
ON public.profiles
FOR INSERT
TO authenticated
WITH CHECK (true);
