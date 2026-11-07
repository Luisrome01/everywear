-- RLS predicates referencing admins require relation SELECT permission even for anon.
-- The admins table has no anon SELECT policy, so its rows remain completely hidden.
grant select on public.everywear_admins to anon;