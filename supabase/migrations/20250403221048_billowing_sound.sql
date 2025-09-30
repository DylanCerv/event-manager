/*
  # Create event finalizations table

  1. New Tables
    - `event_finalizations`
      - `id` (uuid, primary key)
      - `event_id` (uuid, foreign key to events)
      - `is_finalized` (boolean)
      - `final_message` (text)
      - `video_url` (text, nullable)
      - `video_message` (text, nullable)
      - `whatsapp_number` (text, nullable)
      - `created_at` (timestamptz)

  2. Security
    - Enable RLS on `event_finalizations` table
    - Add policies for authenticated users to:
      - Read their own event finalizations
      - Create/update their own event finalizations
*/

-- Create the event_finalizations table
CREATE TABLE IF NOT EXISTS event_finalizations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid REFERENCES events(id) ON DELETE CASCADE,
  is_finalized boolean DEFAULT false,
  final_message text NOT NULL,
  video_url text,
  video_message text,
  whatsapp_number text,
  created_at timestamptz DEFAULT now(),
  UNIQUE(event_id)
);

-- Enable Row Level Security
ALTER TABLE event_finalizations ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can read their own event finalizations"
  ON event_finalizations
  FOR SELECT
  TO authenticated
  USING (
    event_id IN (
      SELECT id FROM events WHERE created_by = auth.uid()
    )
  );

CREATE POLICY "Users can create their own event finalizations"
  ON event_finalizations
  FOR INSERT
  TO authenticated
  WITH CHECK (
    event_id IN (
      SELECT id FROM events WHERE created_by = auth.uid()
    )
  );

CREATE POLICY "Users can update their own event finalizations"
  ON event_finalizations
  FOR UPDATE
  TO authenticated
  USING (
    event_id IN (
      SELECT id FROM events WHERE created_by = auth.uid()
    )
  )
  WITH CHECK (
    event_id IN (
      SELECT id FROM events WHERE created_by = auth.uid()
    )
  );