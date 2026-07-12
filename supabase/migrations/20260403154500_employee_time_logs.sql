create table public.time_logs (
    id uuid not null default gen_random_uuid() primary key,
    employee_id uuid not null references public.employees(id) on delete cascade,
    clock_in timestamp with time zone not null default now(),
    clock_in_lat numeric null,
    clock_in_lng numeric null,
    clock_out timestamp with time zone null,
    clock_out_lat numeric null,
    clock_out_lng numeric null
);

alter table public.time_logs enable row level security;

create policy "Employees can view their own time logs"
    on public.time_logs for select
    using (employee_id in (select id from public.employees where user_id = auth.uid()));

create policy "Employees can insert their own time logs"
    on public.time_logs for insert
    with check (employee_id in (select id from public.employees where user_id = auth.uid()));

create policy "Employees can update their own time logs"
    on public.time_logs for update
    using (employee_id in (select id from public.employees where user_id = auth.uid()));

create policy "Admins can view all time logs"
    on public.time_logs for all
    using (auth.uid() in (select user_id from public.user_roles where role = 'admin'));
