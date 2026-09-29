-- بازبینی تراکنش‌ها توسط مدیر ارشد و پیام‌های مدیر ارشد
alter table public.transactions
  add column if not exists review_status text not null default 'pending',
  add column if not exists review_note text,
  add column if not exists reviewed_at timestamptz,
  add column if not exists reviewed_by_name text;

update public.transactions
set review_status = case when coalesce(reconciled,false) then 'approved' else 'pending' end
where coalesce(review_status,'') = '' or (review_status = 'pending' and coalesce(reconciled,false));

create index if not exists transactions_review_status_idx on public.transactions(review_status);

create table if not exists public.senior_messages (
  id bigserial primary key,
  message text not null,
  active boolean not null default true,
  created_by_name text,
  created_at timestamptz not null default now()
);

create index if not exists senior_messages_active_created_idx
  on public.senior_messages(active, created_at desc);

create index if not exists attachments_entity_idx
  on public.attachments(entity_type, entity_id);
