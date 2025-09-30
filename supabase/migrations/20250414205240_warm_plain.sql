/*
  # Add event requests functionality

  1. New Tables
    - `event_requests`
      - `id` (uuid, primary key)
      - `event_id` (uuid, references events)
      - `status` (text) - 'pending', 'approved', 'rejected'
      - `requested_by` (uuid, references auth.users)
      - `processed_by` (uuid, references auth.users, nullable)
      - `processed_at` (timestamptz, nullable)
      - `created_at` (timestamptz)

  2. Security
    - Enable RLS
    - Add policies for admin and super_admin roles
*/

CREATE TABLE event_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid REFERENCES events(id) ON DELETE CASCADE,
  status text NOT NULL CHECK (status IN ('pending', 'approved', 'rejected')),
  requested_by uuid REFERENCES auth.users(id),
  processed_by uuid REFERENCES auth.users(id),
  processed_at timestamptz,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE event_requests ENABLE ROW LEVEL SECURITY;

-- Policies for event_requests
CREATE POLICY "Allow admin to create requests"
  ON event_requests
  FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.jwt() ->> 'role' = 'ADMIN' AND
    requested_by = auth.uid()
  );

CREATE POLICY "Allow admin to view own requests"
  ON event_requests
  FOR SELECT
  TO authenticated
  USING (
    (auth.jwt() ->> 'role' = 'ADMIN' AND requested_by = auth.uid()) OR
    auth.jwt() ->> 'role' = 'SUPER_ADMIN'
  );

CREATE POLICY "Allow super_admin to update requests"
  ON event_requests
  FOR UPDATE
  TO authenticated
  USING (auth.jwt() ->> 'role' = 'SUPER_ADMIN')
  WITH CHECK (auth.jwt() ->> 'role' = 'SUPER_ADMIN');