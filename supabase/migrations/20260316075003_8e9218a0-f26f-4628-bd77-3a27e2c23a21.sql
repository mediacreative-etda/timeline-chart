CREATE POLICY "Authenticated users can delete profiles"
ON public.profiles
FOR DELETE
TO authenticated
USING (auth.uid() IS NOT NULL);