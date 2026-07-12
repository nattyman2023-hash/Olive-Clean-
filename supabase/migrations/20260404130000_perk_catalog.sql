-- Perk catalog: admin-managed perks that can be created and assigned to members later
create table if not exists public.perk_catalog (
    id uuid not null default gen_random_uuid() primary key,
    created_at timestamp with time zone not null default now(),
    name text not null,
    description text null,
    perk_type text not null default 'discount',  -- 'discount' | 'free_service' | 'gift' | 'custom'
    value_type text not null default 'percent',  -- 'percent' | 'flat' | 'unit'
    value numeric null,                          -- e.g. 15 for 15%, 50 for $50, 1 for 1 free cleaning
    icon text null,                              -- emoji icon
    color text null,                             -- tailwind color token
    is_active boolean not null default true,
    is_assignable boolean not null default true,
    max_uses integer null,                       -- null = unlimited
    times_assigned integer not null default 0,
    notes text null
);

alter table public.perk_catalog enable row level security;

create policy "Admins can manage perk catalog"
    on public.perk_catalog for all
    using (auth.uid() in (select user_id from public.user_roles where role = 'admin'));

create policy "Staff can view perk catalog"
    on public.perk_catalog for select
    using (auth.uid() in (select user_id from public.user_roles where role in ('admin', 'staff')));

-- Track which perks are assigned to which perks members
create table if not exists public.member_perks (
    id uuid not null default gen_random_uuid() primary key,
    created_at timestamp with time zone not null default now(),
    perks_member_id uuid not null references public.perks_members(id) on delete cascade,
    perk_catalog_id uuid not null references public.perk_catalog(id) on delete cascade,
    assigned_at timestamp with time zone not null default now(),
    assigned_by uuid null references auth.users(id) on delete set null,
    status text not null default 'active',     -- 'active' | 'redeemed' | 'expired' | 'revoked'
    redeemed_at timestamp with time zone null,
    expires_at timestamp with time zone null,
    notes text null
);

alter table public.member_perks enable row level security;

create policy "Admins can manage member perks"
    on public.member_perks for all
    using (auth.uid() in (select user_id from public.user_roles where role = 'admin'));

create policy "Members can view their own perks"
    on public.member_perks for select
    using (
        perks_member_id in (
            select pm.id from public.perks_members pm
            join public.clients c on c.id = pm.client_id
            where c.client_user_id = auth.uid()
        )
    );
