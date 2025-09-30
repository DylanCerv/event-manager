/*
  # Create events and guests tables

  1. New Tables
    - `events`
      - `id` (uuid, primary key)
      - `name` (text)
      - `date` (timestamptz)
      - `location` (text)
      - `contractor_name` (text)
      - `guest_count` (integer)
      - `logo_url` (text, nullable)
      - `created_at` (timestamptz)
      - `created_by` (uuid, references auth.users)

    - `guests`
      - `id` (uuid, primary key)
      - `event_id` (uuid, references events)
      - `name` (text, nullable)
      - `email` (text, nullable)
      - `phone` (text, nullable)
      - `confirmed` (boolean)
      - `health_info` (text, nullable)
      - `qr_code` (text)
      - `created_at` (timestamptz)

  2. Security
    - Enable RLS on both tables
    - Add policies for admin and super_admin roles
*/

-- Create events table
CREATE TABLE events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  date timestamptz NOT NULL,
  location text NOT NULL,
  contractor_name text NOT NULL,
  guest_count integer NOT NULL,
  logo_url text,
  created_at timestamptz DEFAULT now(),
  created_by uuid REFERENCES auth.users(id)
);

-- Create guests table
CREATE TABLE guests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid REFERENCES events(id) ON DELETE CASCADE,
  name text,
  email text,
  phone text,
  confirmed boolean DEFAULT false,
  health_info text,
  qr_code text NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE events ENABLE ROW LEVEL SECURITY;
ALTER TABLE guests ENABLE ROW LEVEL SECURITY;

-- Policies for events
CREATE POLICY "Allow admin to create events"
  ON events
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.jwt() ->> 'role' = 'ADMIN');

CREATE POLICY "Allow admin to update own events"
  ON events
  FOR UPDATE
  TO authenticated
  USING (auth.jwt() ->> 'role' = 'ADMIN' AND created_by = auth.uid())
  WITH CHECK (auth.jwt() ->> 'role' = 'ADMIN' AND created_by = auth.uid());

CREATE POLICY "Allow admin to delete own events"
  ON events
  FOR DELETE
  TO authenticated
  USING (auth.jwt() ->> 'role' = 'ADMIN' AND created_by = auth.uid());

CREATE POLICY "Allow admin and super_admin to view events"
  ON events
  FOR SELECT
  TO authenticated
  USING (auth.jwt() ->> 'role' IN ('ADMIN', 'SUPER_ADMIN'));

-- Policies for guests
CREATE POLICY "Allow admin to manage guests"
  ON guests
  FOR ALL
  TO authenticated
  USING (
    auth.jwt() ->> 'role' = 'ADMIN' AND
    EXISTS (
      SELECT 1 FROM events
      WHERE events.id = guests.event_id
      AND events.created_by = auth.uid()
    )
  );

CREATE POLICY "Allow super_admin to view guests"
  ON guests
  FOR SELECT
  TO authenticated
  USING (auth.jwt() ->> 'role' = 'SUPER_ADMIN');