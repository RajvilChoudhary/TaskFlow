-- ============================================================
-- TASKFLOW DATABASE SCHEMA
-- ============================================================

-- CREATE DATABASE IF NOT EXISTS taskflow;
-- USE taskflow;

-- ============================================================
-- USERS
-- ============================================================
CREATE TABLE IF NOT EXISTS users (
  id           INT AUTO_INCREMENT PRIMARY KEY,
  name         VARCHAR(100)  NOT NULL,
  email        VARCHAR(150)  NOT NULL UNIQUE,
  initials     VARCHAR(4)    NOT NULL,
  avatar_color VARCHAR(7)    NOT NULL DEFAULT '#7C5CBF',
  created_at   DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================
-- BOARDS
-- ============================================================
CREATE TABLE IF NOT EXISTS boards (
  id          INT AUTO_INCREMENT PRIMARY KEY,
  title       VARCHAR(200)  NOT NULL,
  background  VARCHAR(300)  NOT NULL DEFAULT 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
  created_by  INT           NOT NULL,
  created_at  DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE CASCADE
);

-- ============================================================
-- BOARD MEMBERS
-- ============================================================
CREATE TABLE IF NOT EXISTS board_members (
  id        INT AUTO_INCREMENT PRIMARY KEY,
  board_id  INT NOT NULL,
  user_id   INT NOT NULL,
  role      ENUM('admin', 'member') NOT NULL DEFAULT 'member',
  UNIQUE KEY unique_board_member (board_id, user_id),
  FOREIGN KEY (board_id) REFERENCES boards(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id)  REFERENCES users(id)  ON DELETE CASCADE
);

-- ============================================================
-- LISTS
-- ============================================================
CREATE TABLE IF NOT EXISTS lists (
  id         INT AUTO_INCREMENT PRIMARY KEY,
  board_id   INT           NOT NULL,
  title      VARCHAR(200)  NOT NULL,
  position   FLOAT         NOT NULL DEFAULT 0,
  archived   BOOLEAN       NOT NULL DEFAULT 0,
  created_at DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (board_id) REFERENCES boards(id) ON DELETE CASCADE
);

-- ============================================================
-- CARDS
-- ============================================================
CREATE TABLE IF NOT EXISTS cards (
  id           INT AUTO_INCREMENT PRIMARY KEY,
  list_id      INT           NULL,
  board_id     INT           NOT NULL,
  title        VARCHAR(500)  NOT NULL,
  description  TEXT,
  position     FLOAT         NOT NULL DEFAULT 0,
  cover_color  VARCHAR(7),
  cover_image  VARCHAR(500),
  due_date     DATETIME,
  completed    BOOLEAN       NOT NULL DEFAULT 0,
  archived     BOOLEAN       NOT NULL DEFAULT 0,
  created_at   DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (list_id)  REFERENCES lists(id)  ON DELETE CASCADE,
  FOREIGN KEY (board_id) REFERENCES boards(id) ON DELETE CASCADE
);

-- ============================================================
-- CARD MEMBERS
-- ============================================================
CREATE TABLE IF NOT EXISTS card_members (
  id       INT AUTO_INCREMENT PRIMARY KEY,
  card_id  INT NOT NULL,
  user_id  INT NOT NULL,
  UNIQUE KEY unique_card_member (card_id, user_id),
  FOREIGN KEY (card_id)  REFERENCES cards(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id)  REFERENCES users(id) ON DELETE CASCADE
);

-- ============================================================
-- LABELS
-- ============================================================
CREATE TABLE IF NOT EXISTS labels (
  id       INT AUTO_INCREMENT PRIMARY KEY,
  board_id INT          NOT NULL,
  name     VARCHAR(100) NOT NULL DEFAULT '',
  color    VARCHAR(7)   NOT NULL,
  FOREIGN KEY (board_id) REFERENCES boards(id) ON DELETE CASCADE
);

-- ============================================================
-- CARD LABELS
-- ============================================================
CREATE TABLE IF NOT EXISTS card_labels (
  id       INT AUTO_INCREMENT PRIMARY KEY,
  card_id  INT NOT NULL,
  label_id INT NOT NULL,
  UNIQUE KEY unique_card_label (card_id, label_id),
  FOREIGN KEY (card_id)  REFERENCES cards(id)  ON DELETE CASCADE,
  FOREIGN KEY (label_id) REFERENCES labels(id) ON DELETE CASCADE
);

-- ============================================================
-- CHECKLISTS
-- ============================================================
CREATE TABLE IF NOT EXISTS checklists (
  id         INT AUTO_INCREMENT PRIMARY KEY,
  card_id    INT          NOT NULL,
  title      VARCHAR(200) NOT NULL DEFAULT 'Checklist',
  created_at DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (card_id) REFERENCES cards(id) ON DELETE CASCADE
);

-- ============================================================
-- CHECKLIST ITEMS
-- ============================================================
CREATE TABLE IF NOT EXISTS checklist_items (
  id           INT AUTO_INCREMENT PRIMARY KEY,
  checklist_id INT          NOT NULL,
  title        VARCHAR(500) NOT NULL,
  completed    BOOLEAN      NOT NULL DEFAULT 0,
  position     FLOAT        NOT NULL DEFAULT 0,
  created_at   DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (checklist_id) REFERENCES checklists(id) ON DELETE CASCADE
);

-- ============================================================
-- COMMENTS
-- ============================================================
CREATE TABLE IF NOT EXISTS comments (
  id         INT AUTO_INCREMENT PRIMARY KEY,
  card_id    INT  NOT NULL,
  user_id    INT  NOT NULL,
  content    TEXT NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (card_id)  REFERENCES cards(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id)  REFERENCES users(id) ON DELETE CASCADE
);

-- ============================================================
-- ATTACHMENTS
-- ============================================================
CREATE TABLE IF NOT EXISTS attachments (
  id            INT AUTO_INCREMENT PRIMARY KEY,
  card_id       INT          NOT NULL,
  user_id       INT          NOT NULL,
  filename      VARCHAR(300) NOT NULL,
  original_name VARCHAR(300) NOT NULL,
  url           VARCHAR(500) NOT NULL,
  created_at    DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (card_id)  REFERENCES cards(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id)  REFERENCES users(id) ON DELETE CASCADE
);

-- ============================================================
-- ACTIVITY LOG
-- ============================================================
CREATE TABLE IF NOT EXISTS activity_log (
  id         INT AUTO_INCREMENT PRIMARY KEY,
  card_id    INT          NULL,
  board_id   INT          NULL,
  user_id    INT          NOT NULL,
  action     VARCHAR(100) NOT NULL,
  data       JSON,
  created_at DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (card_id)  REFERENCES cards(id)  ON DELETE CASCADE,
  FOREIGN KEY (board_id) REFERENCES boards(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id)  REFERENCES users(id)  ON DELETE CASCADE
);
