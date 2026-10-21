alter table public.nodal_portal_records drop constraint if exists nodal_portal_records_record_type_check;
alter table public.nodal_portal_records add constraint nodal_portal_records_record_type_check
  check (record_type in ('assignment','evaluation','document','notification','training','activity','test','certificate'));