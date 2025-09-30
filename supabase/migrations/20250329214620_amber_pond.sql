/*
  # Add event cards table

  1. New Tables
    - `event_cards`
      - `id` (uuid, primary key)
      - `event_id` (uuid, references events)
      - `cover_image` (text)
      - `event_name` (text)
      - `maps_iframe` (text)
      - `recommendations` (text)
      - `created_at` (timestamptz)

  2. Security
    - Enable RLS on event_cards table
    - Add policies for admin and super_admin roles
*/

CREATE TABLE event_cards (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid REFERENCES events(id) ON DELETE CASCADE,
  cover_image text NOT NULL,
  event_name text NOT NULL,
  maps_iframe text NOT NULL,
  recommendations text NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE event_cards ENABLE ROW LEVEL SECURITY;

-- Policies for event_cards
CREATE POLICY "Allow admin to manage event cards"
  ON event_cards
  FOR ALL
  TO authenticated
  USING (
    auth.jwt() ->> 'role' = 'ADMIN' AND
    EXISTS (
      SELECT 1 FROM events
      WHERE events.id = event_cards.event_id
      AND events.created_by = auth.uid()
    )
  );

CREATE POLICY "Allow super_admin to view event cards"
  ON event_cards
  FOR SELECT
  TO authenticated
  USING (auth.jwt() ->> 'role' = 'SUPER_ADMIN');