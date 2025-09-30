/*
  # Add cronograma support to event cards

  1. Changes
    - Add `show_cronograma` boolean column to event_cards table
    - Add `cronograma_items` JSONB column to event_cards table to store schedule items
*/

-- Add cronograma columns to event_cards table
ALTER TABLE event_cards
  ADD COLUMN show_cronograma boolean DEFAULT false,
  ADD COLUMN cronograma_items jsonb DEFAULT '[]'::jsonb;

-- Add index for faster JSON queries
CREATE INDEX idx_event_cards_cronograma_items ON event_cards USING gin (cronograma_items);