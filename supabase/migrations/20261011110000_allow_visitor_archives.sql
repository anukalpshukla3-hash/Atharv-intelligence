alter table public.conversations
  drop constraint if exists conversations_visitor_id_key;

create unique index if not exists conversations_one_open_per_visitor_idx
  on public.conversations (visitor_id)
  where status = 'open';
