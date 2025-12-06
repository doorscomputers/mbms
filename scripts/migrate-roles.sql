-- Migration: Rename ADMIN to SUPER_ADMIN in users table
-- First, add the new enum value
ALTER TYPE "UserRole" ADD VALUE IF NOT EXISTS 'SUPER_ADMIN';
ALTER TYPE "UserRole" ADD VALUE IF NOT EXISTS 'ROUTE_ADMIN';

-- Update existing ADMIN users to SUPER_ADMIN
UPDATE users SET role = 'SUPER_ADMIN' WHERE role = 'ADMIN';
