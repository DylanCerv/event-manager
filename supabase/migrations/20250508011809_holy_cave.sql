/*
  # Create independent EventBook tables

  1. New Tables
    - `eventbooks`
      - `id` (uuid, primary key)
      - `name` (text)
      - `description` (text)
      - `cover_image` (text)
      - `start_date` (timestamptz)
      - `end_date` (timestamptz, nullable)
      - `is_active` (boolean)
      - `created_by` (uuid, references auth.users)
      - `created_at` (timestamptz)

    - `eventbook_posts`
      - `id` (uuid, primary key)
      - `eventbook_id` (uuid, references eventbooks)
      - `content` (text)
      - `image_url` (text, nullable)
      - `created_by` (uuid, references auth.users)
      - `created_at` (timestamptz)

  2. Security
    - Enable RLS on both tables
    - Add policies for admin and guest access
*/

-- Create eventbooks table
CREATE TABLE eventbooks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  cover_image text,
  start_date timestamptz NOT NULL,
  end_date timestamptz,
  is_active boolean DEFAULT true,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now()
);

-- Create eventbook_posts table
CREATE TABLE eventbook_posts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  eventbook_id uuid REFERENCES eventbooks(id) ON DELETE CASCADE,
  content text NOT NULL,
  image_url text,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE eventbooks ENABLE ROW LEVEL SECURITY;
ALTER TABLE eventbook_posts ENABLE ROW LEVEL SECURITY;

-- Policies for eventbooks
CREATE POLICY "Allow admin to manage eventbooks"
  ON eventbooks
  FOR ALL
  TO authenticated
  USING (auth.jwt() ->> 'role' = 'ADMIN');

CREATE POLICY "Allow users to view active eventbooks"
  ON eventbooks
  FOR SELECT
  TO authenticated
  USING (is_active = true);

-- Policies for eventbook_posts
CREATE POLICY "Allow admin to manage posts"
  ON eventbook_posts
  FOR ALL
  TO authenticated
  USING (
    auth.jwt() ->> 'role' = 'ADMIN' AND
    EXISTS (
      SELECT 1 FROM eventbooks
      WHERE eventbooks.id = eventbook_posts.eventbook_id
      AND eventbooks.created_by = auth.uid()
    )
  );

CREATE POLICY "Allow users to view posts in active eventbooks"
  ON eventbook_posts
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM eventbooks
      WHERE eventbooks.id = eventbook_posts.eventbook_id
      AND eventbooks.is_active = true
    )
  );