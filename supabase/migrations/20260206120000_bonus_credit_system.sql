create extension if not exists pgcrypto;

create table if not exists public.credit_wallets (
  user_id uuid primary key references auth.users(id) on delete cascade,
  balance integer not null default 0 check (balance >= 0),
  updated_at timestamptz not null default now()
);

create table if not exists public.credit_price_rules (
  id bigserial primary key,
  operation text not null check (operation in ('chat', 'image')),
  mode text not null check (mode in ('mentor', 'researcher', 'coach', 'visionary')),
  model_tier text not null default 'stable',
  credits integer not null check (credits >= 0),
  effective_from timestamptz not null default now(),
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create index if not exists idx_credit_price_rules_lookup
  on public.credit_price_rules (operation, mode, model_tier, active, effective_from desc);

create table if not exists public.usage_limits (
  plan_id text primary key,
  weekly_images integer not null default 2,
  daily_messages integer not null default 60,
  soft_usd_cap numeric(10, 4) not null default 2.5,
  bonus_discount_multiplier numeric(5, 2) not null default 0.70,
  period_days integer not null default 84,
  updated_at timestamptz not null default now()
);

create table if not exists public.demo_sessions (
  id uuid primary key default gen_random_uuid(),
  device_fingerprint text not null unique,
  credits_remaining integer not null default 15 check (credits_remaining >= 0),
  images_remaining integer not null default 1 check (images_remaining >= 0),
  expires_at timestamptz not null default (now() + interval '14 days'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.credit_ledger (
  id uuid primary key default gen_random_uuid(),
  request_id text not null unique,
  user_id uuid references auth.users(id) on delete set null,
  demo_session_id uuid references public.demo_sessions(id) on delete set null,
  feature text not null default 'bonus_ebook',
  operation text not null check (operation in ('chat', 'image')),
  mode text not null check (mode in ('mentor', 'researcher', 'coach', 'visionary')),
  model text not null,
  model_tier text not null default 'stable',
  tokens_in integer not null default 0,
  tokens_out integer not null default 0,
  grounded_queries integer not null default 0,
  image_count integer not null default 0,
  credits_delta integer not null,
  usd_estimate numeric(10, 6) not null default 0,
  status text not null check (status in ('reserved', 'committed', 'rolled_back')),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (user_id is not null or demo_session_id is not null)
);

create index if not exists idx_credit_ledger_user_created
  on public.credit_ledger (user_id, created_at desc);

create index if not exists idx_credit_ledger_demo_created
  on public.credit_ledger (demo_session_id, created_at desc);

create table if not exists public.idempotency_requests (
  endpoint text not null,
  scope_key text not null,
  idempotency_key text not null,
  response jsonb not null,
  created_at timestamptz not null default now(),
  primary key (endpoint, scope_key, idempotency_key)
);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_credit_wallets_updated_at on public.credit_wallets;
create trigger trg_credit_wallets_updated_at
before update on public.credit_wallets
for each row execute function public.set_updated_at();

drop trigger if exists trg_usage_limits_updated_at on public.usage_limits;
create trigger trg_usage_limits_updated_at
before update on public.usage_limits
for each row execute function public.set_updated_at();

drop trigger if exists trg_demo_sessions_updated_at on public.demo_sessions;
create trigger trg_demo_sessions_updated_at
before update on public.demo_sessions
for each row execute function public.set_updated_at();

drop trigger if exists trg_credit_ledger_updated_at on public.credit_ledger;
create trigger trg_credit_ledger_updated_at
before update on public.credit_ledger
for each row execute function public.set_updated_at();

insert into public.usage_limits (plan_id, weekly_images, daily_messages, soft_usd_cap, bonus_discount_multiplier, period_days)
values ('default', 2, 60, 2.5, 0.70, 84)
on conflict (plan_id)
do update set
  weekly_images = excluded.weekly_images,
  daily_messages = excluded.daily_messages,
  soft_usd_cap = excluded.soft_usd_cap,
  bonus_discount_multiplier = excluded.bonus_discount_multiplier,
  period_days = excluded.period_days,
  updated_at = now();

do $$
begin
  if not exists (select 1 from public.credit_price_rules) then
    insert into public.credit_price_rules (operation, mode, model_tier, credits, active)
    values
      ('chat', 'mentor', 'stable', 1, true),
      ('chat', 'coach', 'stable', 2, true),
      ('chat', 'researcher', 'stable', 4, true),
      ('chat', 'researcher', 'deep_dive', 8, true),
      ('chat', 'visionary', 'stable', 2, true),
      ('image', 'visionary', 'standard', 20, true),
      ('image', 'visionary', 'high_quality', 35, true);
  end if;
end
$$;

create or replace function public.get_base_price_credits(
  p_operation text,
  p_mode text,
  p_model_tier text default 'stable'
)
returns integer
language sql
stable
as $$
  select credits
  from public.credit_price_rules
  where operation = p_operation
    and mode = p_mode
    and model_tier = p_model_tier
    and active = true
    and effective_from <= now()
  order by effective_from desc, id desc
  limit 1;
$$;

create or replace function public.get_effective_price_credits(
  p_operation text,
  p_mode text,
  p_model_tier text default 'stable',
  p_plan_id text default 'default'
)
returns integer
language plpgsql
stable
as $$
declare
  v_base integer;
  v_multiplier numeric(5, 2);
begin
  v_base := public.get_base_price_credits(p_operation, p_mode, p_model_tier);

  if v_base is null and p_model_tier <> 'stable' then
    v_base := public.get_base_price_credits(p_operation, p_mode, 'stable');
  end if;

  if v_base is null then
    raise exception 'PRICE_RULE_NOT_FOUND for operation %, mode %, tier %', p_operation, p_mode, p_model_tier;
  end if;

  select bonus_discount_multiplier
  into v_multiplier
  from public.usage_limits
  where plan_id = p_plan_id;

  if v_multiplier is null then
    v_multiplier := 1;
  end if;

  return greatest(0, ceil(v_base * v_multiplier)::integer);
end;
$$;

create or replace function public.reserve_user_credits(
  p_user_id uuid,
  p_request_id text,
  p_operation text,
  p_mode text,
  p_model text,
  p_model_tier text,
  p_credits integer,
  p_metadata jsonb default '{}'::jsonb
)
returns table (
  success boolean,
  error_code text,
  balance integer,
  ledger_id uuid
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_wallet_balance integer;
  v_existing public.credit_ledger;
  v_ledger_id uuid;
begin
  if p_credits < 0 then
    return query select false, 'INVALID_CREDITS', 0, null::uuid;
    return;
  end if;

  select * into v_existing
  from public.credit_ledger
  where request_id = p_request_id;

  if found then
    select coalesce(w.balance, 0)
    into v_wallet_balance
    from public.credit_wallets as w
    where w.user_id = p_user_id;

    return query
    select
      (v_existing.status <> 'rolled_back') as success,
      case when v_existing.status = 'rolled_back' then 'REQUEST_ALREADY_ROLLED_BACK' else null end,
      coalesce(v_wallet_balance, 0),
      v_existing.id;
    return;
  end if;

  insert into public.credit_wallets (user_id, balance)
  values (p_user_id, 0)
  on conflict (user_id) do nothing;

  select w.balance
  into v_wallet_balance
  from public.credit_wallets as w
  where w.user_id = p_user_id
  for update;

  if v_wallet_balance < p_credits then
    return query select false, 'INSUFFICIENT_CREDITS', v_wallet_balance, null::uuid;
    return;
  end if;

  update public.credit_wallets as w
  set balance = w.balance - p_credits,
      updated_at = now()
  where w.user_id = p_user_id
  returning w.balance into v_wallet_balance;

  insert into public.credit_ledger (
    request_id,
    user_id,
    operation,
    mode,
    model,
    model_tier,
    credits_delta,
    status,
    metadata
  )
  values (
    p_request_id,
    p_user_id,
    p_operation,
    p_mode,
    p_model,
    p_model_tier,
    -p_credits,
    'reserved',
    coalesce(p_metadata, '{}'::jsonb)
  )
  returning id into v_ledger_id;

  return query select true, null::text, v_wallet_balance, v_ledger_id;
end;
$$;

create or replace function public.reserve_demo_credits(
  p_device_fingerprint text,
  p_request_id text,
  p_operation text,
  p_mode text,
  p_model text,
  p_model_tier text,
  p_credits integer,
  p_is_image boolean,
  p_metadata jsonb default '{}'::jsonb
)
returns table (
  success boolean,
  error_code text,
  credits_remaining integer,
  images_remaining integer,
  demo_session_id uuid,
  ledger_id uuid
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_session public.demo_sessions;
  v_existing public.credit_ledger;
  v_ledger_id uuid;
  v_credit_delta integer;
begin
  if coalesce(trim(p_device_fingerprint), '') = '' then
    return query select false, 'MISSING_DEVICE_FINGERPRINT', 0, 0, null::uuid, null::uuid;
    return;
  end if;

  select * into v_existing
  from public.credit_ledger
  where request_id = p_request_id;

  if found then
    select * into v_session
    from public.demo_sessions
    where id = v_existing.demo_session_id;

    return query
    select
      (v_existing.status <> 'rolled_back') as success,
      case when v_existing.status = 'rolled_back' then 'REQUEST_ALREADY_ROLLED_BACK' else null end,
      coalesce(v_session.credits_remaining, 0),
      coalesce(v_session.images_remaining, 0),
      v_existing.demo_session_id,
      v_existing.id;
    return;
  end if;

  select * into v_session
  from public.demo_sessions
  where device_fingerprint = p_device_fingerprint
  for update;

  if not found then
    insert into public.demo_sessions (device_fingerprint)
    values (p_device_fingerprint)
    returning * into v_session;
  elsif v_session.expires_at <= now() then
    update public.demo_sessions
    set credits_remaining = 15,
        images_remaining = 1,
        expires_at = now() + interval '14 days',
        updated_at = now()
    where id = v_session.id
    returning * into v_session;
  end if;

  if p_is_image then
    if v_session.images_remaining < 1 then
      return query select false, 'DEMO_IMAGE_LIMIT_REACHED', v_session.credits_remaining, v_session.images_remaining, v_session.id, null::uuid;
      return;
    end if;

    update public.demo_sessions as ds
    set images_remaining = ds.images_remaining - 1,
        updated_at = now()
    where ds.id = v_session.id
    returning * into v_session;

    v_credit_delta := 0;
  else
    if p_credits < 0 then
      return query select false, 'INVALID_CREDITS', v_session.credits_remaining, v_session.images_remaining, v_session.id, null::uuid;
      return;
    end if;

    if v_session.credits_remaining < p_credits then
      return query select false, 'DEMO_CREDITS_EXHAUSTED', v_session.credits_remaining, v_session.images_remaining, v_session.id, null::uuid;
      return;
    end if;

    update public.demo_sessions as ds
    set credits_remaining = ds.credits_remaining - p_credits,
        updated_at = now()
    where ds.id = v_session.id
    returning * into v_session;

    v_credit_delta := -p_credits;
  end if;

  insert into public.credit_ledger (
    request_id,
    demo_session_id,
    operation,
    mode,
    model,
    model_tier,
    credits_delta,
    status,
    metadata
  )
  values (
    p_request_id,
    v_session.id,
    p_operation,
    p_mode,
    p_model,
    p_model_tier,
    v_credit_delta,
    'reserved',
    coalesce(p_metadata, '{}'::jsonb)
  )
  returning id into v_ledger_id;

  return query select true, null::text, v_session.credits_remaining, v_session.images_remaining, v_session.id, v_ledger_id;
end;
$$;

create or replace function public.commit_ledger_request(
  p_request_id text,
  p_tokens_in integer,
  p_tokens_out integer,
  p_grounded_queries integer,
  p_image_count integer,
  p_usd_estimate numeric,
  p_metadata jsonb default '{}'::jsonb
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_updated integer;
begin
  update public.credit_ledger
  set status = 'committed',
      tokens_in = greatest(0, coalesce(p_tokens_in, 0)),
      tokens_out = greatest(0, coalesce(p_tokens_out, 0)),
      grounded_queries = greatest(0, coalesce(p_grounded_queries, 0)),
      image_count = greatest(0, coalesce(p_image_count, 0)),
      usd_estimate = greatest(0, coalesce(p_usd_estimate, 0)),
      metadata = metadata || coalesce(p_metadata, '{}'::jsonb),
      updated_at = now()
  where request_id = p_request_id
    and status = 'reserved';

  get diagnostics v_updated = row_count;
  return v_updated = 1;
end;
$$;

create or replace function public.rollback_ledger_request(
  p_request_id text,
  p_reason text default 'UPSTREAM_ERROR'
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_ledger public.credit_ledger;
begin
  select * into v_ledger
  from public.credit_ledger
  where request_id = p_request_id
  for update;

  if not found then
    return false;
  end if;

  if v_ledger.status <> 'reserved' then
    return false;
  end if;

  if v_ledger.user_id is not null and v_ledger.credits_delta < 0 then
    update public.credit_wallets
    set balance = balance + abs(v_ledger.credits_delta),
        updated_at = now()
    where user_id = v_ledger.user_id;
  elsif v_ledger.demo_session_id is not null then
    if v_ledger.operation = 'image' then
      update public.demo_sessions
      set images_remaining = images_remaining + 1,
          updated_at = now()
      where id = v_ledger.demo_session_id;
    elsif v_ledger.credits_delta < 0 then
      update public.demo_sessions
      set credits_remaining = credits_remaining + abs(v_ledger.credits_delta),
          updated_at = now()
      where id = v_ledger.demo_session_id;
    end if;
  end if;

  update public.credit_ledger
  set status = 'rolled_back',
      metadata = metadata || jsonb_build_object(
        'rollback_reason', p_reason,
        'rolled_back_at', now()
      ),
      updated_at = now()
  where id = v_ledger.id;

  return true;
end;
$$;

create or replace function public.get_user_budget_status(
  p_user_id uuid,
  p_plan_id text default 'default'
)
returns table (
  total_usd numeric,
  soft_usd_cap numeric,
  period_days integer,
  within_cap boolean
)
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_cap numeric;
  v_period integer;
  v_total numeric;
begin
  select u.soft_usd_cap, u.period_days
  into v_cap, v_period
  from public.usage_limits as u
  where u.plan_id = p_plan_id;

  if v_cap is null then
    v_cap := 2.5;
  end if;

  if v_period is null then
    v_period := 84;
  end if;

  select coalesce(sum(abs(usd_estimate)), 0)
  into v_total
  from public.credit_ledger
  where user_id = p_user_id
    and status = 'committed'
    and created_at >= now() - make_interval(days => v_period);

  return query
  select v_total, v_cap, v_period, (v_total < v_cap);
end;
$$;

alter table public.credit_wallets enable row level security;
alter table public.credit_price_rules enable row level security;
alter table public.usage_limits enable row level security;
alter table public.demo_sessions enable row level security;
alter table public.credit_ledger enable row level security;
alter table public.idempotency_requests enable row level security;

alter table public.credit_wallets force row level security;
alter table public.credit_price_rules force row level security;
alter table public.usage_limits force row level security;
alter table public.demo_sessions force row level security;
alter table public.credit_ledger force row level security;
alter table public.idempotency_requests force row level security;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'credit_wallets'
      and policyname = 'wallet_select_own'
  ) then
    create policy wallet_select_own
      on public.credit_wallets
      for select
      using (auth.uid() = user_id);
  end if;

  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'credit_ledger'
      and policyname = 'ledger_select_own'
  ) then
    create policy ledger_select_own
      on public.credit_ledger
      for select
      using (auth.uid() = user_id);
  end if;

  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'credit_price_rules'
      and policyname = 'price_rules_read_authenticated'
  ) then
    create policy price_rules_read_authenticated
      on public.credit_price_rules
      for select
      using (auth.role() = 'authenticated');
  end if;

  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'usage_limits'
      and policyname = 'usage_limits_read_authenticated'
  ) then
    create policy usage_limits_read_authenticated
      on public.usage_limits
      for select
      using (auth.role() = 'authenticated');
  end if;
end
$$;

revoke all on function public.reserve_user_credits(uuid, text, text, text, text, text, integer, jsonb) from public;
revoke all on function public.reserve_demo_credits(text, text, text, text, text, text, integer, boolean, jsonb) from public;
revoke all on function public.commit_ledger_request(text, integer, integer, integer, integer, numeric, jsonb) from public;
revoke all on function public.rollback_ledger_request(text, text) from public;
revoke all on function public.get_user_budget_status(uuid, text) from public;

grant execute on function public.reserve_user_credits(uuid, text, text, text, text, text, integer, jsonb) to service_role;
grant execute on function public.reserve_demo_credits(text, text, text, text, text, text, integer, boolean, jsonb) to service_role;
grant execute on function public.commit_ledger_request(text, integer, integer, integer, integer, numeric, jsonb) to service_role;
grant execute on function public.rollback_ledger_request(text, text) to service_role;
grant execute on function public.get_user_budget_status(uuid, text) to service_role;
grant execute on function public.get_effective_price_credits(text, text, text, text) to service_role;
