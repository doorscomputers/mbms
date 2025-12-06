-- Migration: Rename email column to username in users table
-- This preserves all existing data

ALTER TABLE users RENAME COLUMN email TO username;
