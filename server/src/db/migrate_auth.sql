-- ============================================================
-- AUTHENTICATION MIGRATION
-- ============================================================
-- Run this on your database to add authentication support
-- For local: mysql -u root -p taskflow < src/db/migrate_auth.sql
-- For Aiven: Run this SQL in your Aiven database console

-- Add password_hash column to users table
ALTER TABLE users ADD COLUMN password_hash VARCHAR(255) NOT NULL DEFAULT '$2a$10$temporary-placeholder' AFTER email;

-- Add role column to users table
ALTER TABLE users ADD COLUMN role ENUM('user', 'admin') DEFAULT 'user' AFTER avatar_color;

-- Set first user (Rajvil) as admin
UPDATE users SET role = 'admin' WHERE id = 1;

-- Create sessions table for token management
CREATE TABLE IF NOT EXISTS sessions (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  token VARCHAR(500) NOT NULL,
  expires_at DATETIME NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_token (token),
  INDEX idx_user_id (user_id)
);

-- Create board_invitations table for sharing boards
CREATE TABLE IF NOT EXISTS board_invitations (
  id INT AUTO_INCREMENT PRIMARY KEY,
  board_id INT NOT NULL,
  invited_by INT NOT NULL,
  invited_email VARCHAR(150) NOT NULL,
  invited_user_id INT NULL,
  status ENUM('pending', 'accepted', 'declined') DEFAULT 'pending',
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (board_id) REFERENCES boards(id) ON DELETE CASCADE,
  FOREIGN KEY (invited_by) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (invited_user_id) REFERENCES users(id) ON DELETE SET NULL,
  UNIQUE KEY unique_pending_invitation (board_id, invited_email, status)
);
