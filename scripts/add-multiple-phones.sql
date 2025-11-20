-- Migration: Add support for 3 phone numbers instead of 1
-- Date: 2025-11-20

-- Step 1: Add new phone columns
ALTER TABLE public.clients 
  ADD COLUMN phone1 text,
  ADD COLUMN phone2 text,
  ADD COLUMN phone3 text;

-- Step 2: Migrate existing phone data to phone1
UPDATE public.clients 
SET phone1 = phone 
WHERE phone IS NOT NULL;

-- Step 3: Drop the old phone column
ALTER TABLE public.clients 
  DROP COLUMN phone;

-- Verification query (run this after migration to check):
-- SELECT id, first_name, last_name, phone1, phone2, phone3 FROM public.clients LIMIT 10;
