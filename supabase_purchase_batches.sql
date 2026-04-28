create table if not exists public.purchase_batches (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  name text not null,
  source text,
  purchase_date date,
  buy_rate_note text,
  note text
);

alter table public.inventory
  add column if not exists purchase_batch_id uuid references public.purchase_batches(id) on delete set null;

create index if not exists idx_inventory_purchase_batch_id
  on public.inventory(purchase_batch_id);

create index if not exists idx_purchase_batches_purchase_date
  on public.purchase_batches(purchase_date desc);
