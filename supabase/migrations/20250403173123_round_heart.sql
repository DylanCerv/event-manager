/*
  # Add EventBook functionality

  1. Changes
    - Add `event_book_settings` table for managing EventBook configuration
    - Add `event_book_posts` table for storing guest posts and interactions

  2. Security
    - Enable RLS on new tables
    - Add policies for admin and guest access
*/

-- Create event_book_settings table
CREATE TABLE event_book_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid REFERENCES events(id) ON DELETE CASCADE,
  is_active boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

-- Create event_book_posts table
CREATE TABLE event_book_posts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid REFERENCES events(id) ON DELETE CASCADE,
  guest_id uuid REFERENCES guests(id) ON DELETE CASCADE,
  content text NOT NULL,
  image_url text,
  likes integer DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE event_book_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_book_posts ENABLE ROW LEVEL SECURITY;

-- Policies for event_book_settings
CREATE POLICY "Allow admin to manage event book settings"
  ON event_book_settings
  FOR ALL
  TO authenticated
  USING (
    auth.jwt() ->> 'role' = 'ADMIN' AND
    EXISTS (
      SELECT 1 FROM events
      WHERE events.id = event_book_settings.event_id
      AND events.created_by = auth.uid()
    )
  );

-- Policies for event_book_posts
CREATE POLICY "Allow guests to create posts"
  ON event_book_posts
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM guests
      WHERE guests.id = event_book_posts.guest_id
      AND guests.confirmed = true
    )
  );

CREATE POLICY "Allow guests to view posts"
  ON event_book_posts
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM guests
      WHERE guests.event_id = event_book_posts.event_id
      AND guests.confirmed = true
    )
  );

CREATE POLICY "Allow admin to manage posts"
  ON event_book_posts
  FOR ALL
  TO authenticated
  USING (
    auth.jwt() ->> 'role' = 'ADMIN' AND
    EXISTS (
      SELECT 1 FROM events
      WHERE events.id = event_book_posts.event_id
      AND events.created_by = auth.uid()
    )
  );