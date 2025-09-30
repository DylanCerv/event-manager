/*
  # Add table number to guests and enhance status options

  1. Changes
    - Add `table_number` column to guests table
    - Add `attended` column to guests table
    - Add `guest_number` column to guests table with default starting at 100

  2. Data Migration
    - Set default values for new columns
*/

-- Add new columns to guests table
ALTER TABLE guests 
  ADD COLUMN table_number integer,
  ADD COLUMN attended boolean DEFAULT false,
  ADD COLUMN guest_number integer;

-- Create a function to generate sequential guest numbers starting from 100
CREATE OR REPLACE FUNCTION generate_guest_number()
RETURNS trigger AS $$
BEGIN
  -- Get the maximum guest number or start at 99 if no guests exist
  NEW.guest_number := COALESCE(
    (SELECT MAX(guest_number) FROM guests WHERE event_id = NEW.event_id),
    99
  ) + 1;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically assign guest numbers
CREATE TRIGGER set_guest_number
  BEFORE INSERT ON guests
  FOR EACH ROW
  EXECUTE FUNCTION generate_guest_number();