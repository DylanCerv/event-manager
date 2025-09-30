/*
  # Add access activation to guest access settings

  1. Changes
    - Add `is_active` boolean column to guest_access_settings table
    - Set default value to false

  2. Security
    - Maintain existing RLS policies
*/

-- Add is_active column to guest_access_settings table
ALTER TABLE guest_access_settings
  ADD COLUMN is_active boolean DEFAULT false;