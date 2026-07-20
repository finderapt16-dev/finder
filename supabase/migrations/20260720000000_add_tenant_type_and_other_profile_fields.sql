-- Normalize renter accounts under the tenant system role while retaining
-- student and employee profile data and accepting legacy enum values.
begin;
alter type public.app_user_role add value if not exists 'tenant';
commit;

begin;

alter table public.app_users
  add column if not exists tenant_type text,
  add column if not exists other_occupation text,
  add column if not exists other_organization text,
  add column if not exists other_workplace text;

update public.app_users
set
  tenant_type = role::text,
  role = 'tenant'::public.app_user_role,
  updated_at = now()
where role::text in ('student', 'employee');

alter table public.app_users drop constraint if exists app_users_tenant_type_check;
alter table public.app_users add constraint app_users_tenant_type_check
check (tenant_type is null or tenant_type in ('student', 'employee', 'other'));

alter table public.app_users drop constraint if exists app_users_other_occupation_check;
alter table public.app_users add constraint app_users_other_occupation_check
check (tenant_type is distinct from 'other' or nullif(trim(other_occupation), '') is not null);

create index if not exists idx_app_users_tenant_type
on public.app_users (tenant_type)
where role = 'tenant'::public.app_user_role;

create or replace function public.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_requested_role text := lower(coalesce(new.raw_user_meta_data ->> 'role', ''));
  v_role public.app_user_role;
  v_tenant_type text;
  v_name text;
  v_user_id uuid;
begin
  v_role := case
    when v_requested_role in ('tenant', 'student', 'employee') then 'tenant'::public.app_user_role
    when v_requested_role in ('landlord', 'admin') then v_requested_role::public.app_user_role
    else 'tenant'::public.app_user_role
  end;

  v_tenant_type := case
    when lower(coalesce(new.raw_user_meta_data ->> 'tenantType', '')) in ('student', 'employee', 'other')
      then lower(new.raw_user_meta_data ->> 'tenantType')
    when v_requested_role in ('student', 'employee') then v_requested_role
    else null
  end;

  if v_role = 'tenant' and v_tenant_type is null then
    raise exception 'Tenant specification is required';
  end if;

  if v_tenant_type = 'other' and nullif(trim(new.raw_user_meta_data ->> 'otherOccupation'), '') is null then
    raise exception 'Occupation / Tenant Type is required for Other tenant accounts';
  end if;

  v_name := coalesce(nullif(trim(new.raw_user_meta_data ->> 'name'), ''), split_part(coalesce(new.email, ''), '@', 1), 'User');

  insert into public.app_users (
    auth_id, email, name, role, tenant_type, status, mobile, middle_initial,
    address, is_verified, permit_number, signup_source, other_occupation,
    other_organization, other_workplace
  )
  values (
    new.id, new.email, v_name, v_role, v_tenant_type,
    case when v_role = 'landlord' then 'pending' else 'active' end,
    nullif(new.raw_user_meta_data ->> 'mobile', ''),
    nullif(new.raw_user_meta_data ->> 'middleInitial', ''),
    nullif(new.raw_user_meta_data ->> 'address', ''),
    v_role <> 'landlord',
    case when v_role = 'landlord' then nullif(new.raw_user_meta_data ->> 'permitNumber', '') else null end,
    'web',
    case when v_tenant_type = 'other' then nullif(trim(new.raw_user_meta_data ->> 'otherOccupation'), '') else null end,
    case when v_tenant_type = 'other' then nullif(trim(new.raw_user_meta_data ->> 'otherOrganization'), '') else null end,
    case when v_tenant_type = 'other' then nullif(trim(new.raw_user_meta_data ->> 'otherWorkplace'), '') else null end
  )
  on conflict (email) do update set
    auth_id = excluded.auth_id,
    role = excluded.role,
    tenant_type = coalesce(excluded.tenant_type, app_users.tenant_type),
    permit_number = coalesce(app_users.permit_number, excluded.permit_number),
    other_occupation = coalesce(excluded.other_occupation, app_users.other_occupation),
    other_organization = coalesce(excluded.other_organization, app_users.other_organization),
    other_workplace = coalesce(excluded.other_workplace, app_users.other_workplace)
  returning id into v_user_id;

  if v_role = 'tenant' and v_tenant_type = 'student' then
    insert into public.student_profiles (user_id, school, guardian_name, guardian_address, guardian_contact)
    values (v_user_id, nullif(new.raw_user_meta_data ->> 'school', ''), nullif(new.raw_user_meta_data ->> 'guardianName', ''), nullif(new.raw_user_meta_data ->> 'guardianAddress', ''), nullif(new.raw_user_meta_data ->> 'guardianContact', ''))
    on conflict (user_id) do nothing;
  elsif v_role = 'tenant' and v_tenant_type = 'employee' then
    insert into public.employee_profiles (user_id, company, work_address)
    values (v_user_id, nullif(new.raw_user_meta_data ->> 'company', ''), nullif(new.raw_user_meta_data ->> 'workAddress', ''))
    on conflict (user_id) do nothing;
  elsif v_role = 'landlord' then
    insert into public.landlord_profiles (user_id, permit_number, business_permit_number, is_verified)
    values (v_user_id, nullif(new.raw_user_meta_data ->> 'permitNumber', ''), nullif(new.raw_user_meta_data ->> 'permitNumber', ''), false)
    on conflict (user_id) do update set
      permit_number = coalesce(landlord_profiles.permit_number, excluded.permit_number),
      business_permit_number = coalesce(landlord_profiles.business_permit_number, excluded.business_permit_number);

    insert into public.notifications (user_id, type, title, message, payload)
    select id, 'landlord_registration', 'New landlord registration',
      v_name || ' registered and is waiting for verification review.',
      jsonb_build_object('landlord_id', v_user_id, 'landlord_name', v_name, 'action', 'landlord_registration')
    from public.app_users where role = 'admin';
  elsif v_role = 'admin' then
    insert into public.admin_profiles (user_id, admin_level, department)
    values (v_user_id, 'Full Administrator', 'Platform Administration')
    on conflict (user_id) do nothing;
  end if;

  insert into public.signups (user_id, auth_id, email, role, source, metadata)
  values (v_user_id, new.id, new.email, v_role, 'web', coalesce(new.raw_user_meta_data, '{}'::jsonb));

  return new;
end;
$$;

commit;
