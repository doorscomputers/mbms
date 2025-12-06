-- Step 2: Update existing ADMIN users to SUPER_ADMIN
UPDATE users SET role = 'SUPER_ADMIN' WHERE role = 'ADMIN';
