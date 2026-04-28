-- =========================================================================
-- Migration 0004: Storage buckets and policies
-- product-media: public-read bucket for product images and documents
-- =========================================================================

-- Create the bucket (idempotent)
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'product-media',
  'product-media',
  true,
  52428800,  -- 50 MB
  array['image/jpeg','image/png','image/webp','image/gif','application/pdf']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- Public can read everything in product-media
drop policy if exists "product_media_public_read" on storage.objects;
create policy "product_media_public_read" on storage.objects
  for select using (bucket_id = 'product-media');

-- Only admins (via service_role) write. The sync workflows use the service
-- role key, which bypasses RLS. Customers should never write to this bucket.
drop policy if exists "product_media_admin_write" on storage.objects;
create policy "product_media_admin_write" on storage.objects
  for all
  using (bucket_id = 'product-media' and public.is_admin())
  with check (bucket_id = 'product-media' and public.is_admin());
