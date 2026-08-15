-- Run once in the Supabase SQL Editor. It makes auth.users authoritative and
-- repairs existing Auth identities whose public app_users profile is missing.
create or replace function public.handle_new_auth_user()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  requested_role text := lower(coalesce(new.raw_user_meta_data ->> 'role', 'tenant'));
  app_role public.app_user_role;
  tenant_kind text := nullif(lower(new.raw_user_meta_data ->> 'tenantType'), '');
  app_id uuid;
begin
  app_role := case when requested_role in ('landlord','admin') then requested_role::public.app_user_role else 'tenant'::public.app_user_role end;
  if requested_role in ('student','employee') and tenant_kind is null then tenant_kind := requested_role; end if;
  if app_role = 'tenant' and (tenant_kind is null or tenant_kind not in ('student','employee','other')) then return new; end if;
  if tenant_kind = 'other' and nullif(trim(new.raw_user_meta_data ->> 'otherOccupation'), '') is null then return new; end if;

  insert into public.app_users (auth_id,email,name,role,tenant_type,status,mobile,middle_initial,address,is_verified,permit_number,signup_source,other_occupation,other_organization,other_workplace)
  values (new.id,new.email,coalesce(nullif(trim(new.raw_user_meta_data ->> 'name'),''),split_part(new.email,'@',1)),app_role,tenant_kind,
    case when app_role='landlord' then 'pending' else 'active' end,nullif(new.raw_user_meta_data ->> 'mobile',''),nullif(new.raw_user_meta_data ->> 'middleInitial',''),nullif(new.raw_user_meta_data ->> 'address',''),app_role<>'landlord',nullif(new.raw_user_meta_data ->> 'permitNumber',''),'web',nullif(new.raw_user_meta_data ->> 'otherOccupation',''),nullif(new.raw_user_meta_data ->> 'otherOrganization',''),nullif(new.raw_user_meta_data ->> 'otherWorkplace',''))
  on conflict (email) do update set auth_id=excluded.auth_id,name=excluded.name,role=excluded.role,tenant_type=excluded.tenant_type,mobile=coalesce(excluded.mobile,app_users.mobile),address=coalesce(excluded.address,app_users.address)
  returning id into app_id;

  if tenant_kind='student' then
    insert into public.student_profiles(user_id,school,guardian_name,guardian_address,guardian_contact) values(app_id,nullif(new.raw_user_meta_data->>'school',''),nullif(new.raw_user_meta_data->>'guardianName',''),nullif(new.raw_user_meta_data->>'guardianAddress',''),nullif(new.raw_user_meta_data->>'guardianContact','')) on conflict(user_id) do update set school=excluded.school,guardian_name=excluded.guardian_name,guardian_address=excluded.guardian_address,guardian_contact=excluded.guardian_contact;
  elsif tenant_kind='employee' then
    insert into public.employee_profiles(user_id,company,work_address) values(app_id,nullif(new.raw_user_meta_data->>'company',''),nullif(new.raw_user_meta_data->>'workAddress','')) on conflict(user_id) do update set company=excluded.company,work_address=excluded.work_address;
  elsif app_role='landlord' then
    insert into public.landlord_profiles(user_id,permit_number,business_permit_number,is_verified) values(app_id,nullif(new.raw_user_meta_data->>'permitNumber',''),nullif(new.raw_user_meta_data->>'permitNumber',''),false) on conflict(user_id) do nothing;
  end if;
  return new;
end; $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert or update of email,raw_user_meta_data,email_confirmed_at on auth.users for each row execute function public.handle_new_auth_user();

update auth.users set raw_user_meta_data=coalesce(raw_user_meta_data,'{}'::jsonb)
where not exists(select 1 from public.app_users where app_users.auth_id=auth.users.id);
