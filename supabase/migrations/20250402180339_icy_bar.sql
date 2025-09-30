/*
  # Add QR Access Management

  1. New Tables
    - `guest_access_settings`
      - `id` (uuid, primary key)
      - `event_id` (uuid, references events)
      - `access_type` (text) - either 'video' or 'message'
      - `welcome_message` (text)
      - `created_at` (timestamptz)

    - `guest_access_videos`
      - `id` (uuid, primary key)
      - `guest_id` (uuid, references guests)
      - `video_url` (text)
      - `created_at` (timestamptz)

  2. Changes to guests table
    - Add `access_denied` column to track guest access status

  3. Security
    - Enable RLS on new tables
    - Add policies for admin and super_admin roles
*/

-- Create guest_access_settings table
CREATE TABLE guest_access_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid REFERENCES events(id) ON DELETE CASCADE,
  access_type text NOT NULL CHECK (access_type IN ('video', 'message')),
  welcome_message text,
  created_at timestamptz DEFAULT now()
);

-- Create guest_access_videos table
CREATE TABLE guest_access_videos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  guest_id uuid REFERENCES guests(id) ON DELETE CASCADE,
  video_url text NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Add access_denied column to guests table
ALTER TABLE guests
  ADD COLUMN access_denied boolean DEFAULT false;

-- Enable RLS
ALTER TABLE guest_access_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE guest_access_videos ENABLE ROW LEVEL SECURITY;

-- Policies for guest_access_settings
CREATE POLICY "Allow admin to manage access settings"
  ON guest_access_settings
  FOR ALL
  TO authenticated
  USING (
    auth.jwt() ->> 'role' = 'ADMIN' AND
    EXISTS (
      SELECT 1 FROM events
      WHERE events.id = guest_access_settings.event_id
      AND events.created_by = auth.uid()
    )
  );

CREATE POLICY "Allow super_admin to view access settings"
  ON guest_access_settings
  FOR SELECT
  TO authenticated
  USING (auth.jwt() ->> 'role' = 'SUPER_ADMIN');

-- Policies for guest_access_videos
CREATE POLICY "Allow admin to manage access videos"
  ON guest_access_videos
  FOR ALL
  TO authenticated
  USING (
    auth.jwt() ->> 'role' = 'ADMIN' AND
    EXISTS (
      SELECT 1 FROM guests
      JOIN events ON events.id = guests.event_id
      WHERE guests.id = guest_access_videos.guest_id
      AND events.created_by = auth.uid()
    )
  );

CREATE POLICY "Allow super_admin to view access videos"
  ON guest_access_videos
  FOR SELECT
  TO authenticated
  USING (auth.jwt() ->> 'role' = 'SUPER_ADMIN');