create table if not exists glossary_terms (
  id uuid default gen_random_uuid() primary key,
  term text not null unique,
  definition text not null,
  sort_order int default 0,
  created_at timestamp default now()
);

create table if not exists faq_items (
  id uuid default gen_random_uuid() primary key,
  question text not null unique,
  answer text not null,
  sort_order int default 0,
  created_at timestamp default now()
);

alter table glossary_terms enable row level security;
alter table faq_items enable row level security;

-- Read-only from the app for every logged-in user — there is no insert/update/
-- delete policy on purpose. Add or edit entries directly in the Supabase Table
-- Editor (glossary_terms / faq_items) rather than through the app.
drop policy if exists "readable by authenticated users" on glossary_terms;
create policy "readable by authenticated users" on glossary_terms for select using (auth.role() = 'authenticated');

drop policy if exists "readable by authenticated users" on faq_items;
create policy "readable by authenticated users" on faq_items for select using (auth.role() = 'authenticated');

insert into glossary_terms (term, definition, sort_order) values
  ('MOQ', 'Minimum Order Quantity — the smallest amount a supplier will let you order at once. Look for low or no MOQ suppliers for dropshipping so you never have to buy in bulk before you have a sale.', 1),
  ('1688', 'A Chinese B2B marketplace (owned by Alibaba) for wholesale, mostly factory-direct goods. Prices are lower than AliExpress but listings are in Chinese and MOQs can be higher.', 2),
  ('Taobao', 'China''s largest consumer/small-business marketplace. Similar to 1688 but often has smaller lot sizes and more consumer-facing listings.', 3),
  ('AliExpress', 'Alibaba''s international retail marketplace. Popular for dropshipping because most listings allow single-unit orders shipped internationally.', 4),
  ('Basetao', 'A sourcing and fulfillment agent that buys from Chinese suppliers on your behalf, can inspect/consolidate items, and ships them internationally to you or your customer.', 5),
  ('Dropshipping', 'A retail model where you sell products online without holding inventory — a supplier or agent ships orders directly once a customer buys.', 6),
  ('Gold Supplier', 'A paid verification badge on Alibaba/1688 marketplaces indicating a supplier has been vetted and is generally more trustworthy than an unverified listing.', 7),
  ('Landed cost', 'The total cost of getting a product to you or your customer — unit price plus shipping, customs, and agent fees — before you add your markup.', 8),
  ('Margin', 'The percentage of your sale price that is profit after subtracting your landed cost.', 9),
  ('SKU', 'Stock Keeping Unit — a unique code identifying a specific product or variant (e.g. size/color combination).', 10),
  ('Chargeback', 'When a customer disputes a card charge with their bank and the payment is forcibly reversed, usually with a fee to the seller.', 11),
  ('LTV', 'Lifetime Value — the total revenue you can expect from one customer across all their orders with you, not just their first purchase.', 12),
  ('Winning product', 'A product that proves profitable and sells consistently once tested with real ads, as opposed to one that just looks promising on paper.', 13),
  ('Ad angle', 'The specific hook or pitch used to market a product — e.g. solving a pain point, novelty appeal, or framing it as a gift idea.', 14),
  ('Repeat buyer', 'A customer who has purchased from you more than once — a strong signal of trust and product-market fit worth nurturing.', 15)
on conflict (term) do nothing;

insert into faq_items (question, answer, sort_order) values
  ('What is DropshipOS for?', 'It''s an all-in-one workspace for dropshippers: source products from Chinese suppliers, build listings, price them correctly, write ad scripts, track orders, and manage customers — all in one place.', 1),
  ('Do I need to hold inventory?', 'No. DropshipOS is built around dropshipping, so Smart Sourcing favors suppliers with low or no minimum order quantity — you never need to buy in bulk before you have a sale.', 2),
  ('Can I use it on my phone and my computer?', 'Yes. Everything you add — vendors, orders, customers, listings — is saved to your account in the cloud, so it syncs automatically across any device you log into.', 3),
  ('What happens when I hit my monthly action limit?', 'AI-powered actions (Smart Sourcing, Listing Generator, Ad Scripts) are capped per month based on your plan. Once you hit the limit, you''ll see an upgrade prompt instead of the AI feature running again until your next billing period.', 4),
  ('Which supplier platforms does it support?', '1688, Taobao, and AliExpress for sourcing, plus Basetao as a fulfillment agent.', 5),
  ('Is my data private?', 'Yes. Your vendors, orders, customers, and saved listings are protected by row-level security in the database — only your logged-in account can see or edit them.', 6)
on conflict (question) do nothing;
