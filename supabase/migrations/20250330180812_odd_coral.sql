/*
  # Add health and mobility form fields

  1. Changes
    - Add form-related columns to event_cards table
    - Add health and mobility information to guests table
    - Add form submission tracking columns to guests table

  2. Security
    - Maintain existing RLS policies
*/

-- Add form settings to event_cards table
ALTER TABLE event_cards
  ADD COLUMN show_health_form boolean DEFAULT false,
  ADD COLUMN show_mobility_form boolean DEFAULT false;

-- Add health and mobility information to guests table
ALTER TABLE guests
  ADD COLUMN dietary_restrictions text,
  ADD COLUMN mobility_restrictions text,
  ADD COLUMN health_form_submitted boolean DEFAULT false,
  ADD COLUMN mobility_form_submitted boolean DEFAULT false,
  ADD COLUMN forms_completed boolean DEFAULT false;