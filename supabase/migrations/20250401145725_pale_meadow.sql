/*
  # Add contact footer to event cards

  1. Changes
    - Add contact footer fields to event_cards table
    - Add social media links
    - Add contact information

  2. Security
    - Maintain existing RLS policies
*/

-- Add contact footer fields to event_cards table
ALTER TABLE event_cards
  ADD COLUMN show_contact_footer boolean DEFAULT false,
  ADD COLUMN contact_message text,
  ADD COLUMN contact_whatsapp text,
  ADD COLUMN contact_email text,
  ADD COLUMN facebook_url text,
  ADD COLUMN instagram_url text;