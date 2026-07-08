-- ============================================================
-- TASKFLOW SEED DATA
-- ============================================================
USE taskflow;

-- ============================================================
-- USERS
-- ============================================================
INSERT INTO users (name, email, initials, avatar_color) VALUES
  ('Rajvil Choudhary', 'rajvil@taskflow.com', 'RC', '#7C5CBF'),
  ('Alice Johnson',    'alice@taskflow.com',   'AJ', '#4BCE97'),
  ('Bob Smith',        'bob@taskflow.com',     'BS', '#F5CD47'),
  ('Carol White',      'carol@taskflow.com',   'CW', '#F87168'),
  ('David Brown',      'david@taskflow.com',   'DB', '#579DFF');

-- ============================================================
-- BOARDS  (3 boards for multi-board demo)
-- ============================================================
INSERT INTO boards (title, background, created_by) VALUES
  ('My TaskFlow Board',     'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', 1),
  ('Product Roadmap',     'linear-gradient(135deg, #11998e 0%, #38ef7d 100%)', 1),
  ('Marketing Campaign',  'linear-gradient(135deg, #f7971e 0%, #ffd200 100%)', 1);

-- ============================================================
-- BOARD MEMBERS
-- ============================================================
INSERT INTO board_members (board_id, user_id, role) VALUES
  (1, 1, 'admin'), (1, 2, 'member'), (1, 3, 'member'), (1, 4, 'member'), (1, 5, 'member'),
  (2, 1, 'admin'), (2, 2, 'member'), (2, 3, 'member'),
  (3, 1, 'admin'), (3, 4, 'member'), (3, 5, 'member');

-- ============================================================
-- LABELS (per board)
-- ============================================================
-- Board 1
INSERT INTO labels (board_id, name, color) VALUES
  (1, 'Bug',           '#F87168'),
  (1, 'Feature',       '#579DFF'),
  (1, 'Enhancement',   '#4BCE97'),
  (1, 'Design',        '#9F8FEF'),
  (1, 'Urgent',        '#FAA53D'),
  (1, 'Documentation', '#6CC3E0');

-- Board 2
INSERT INTO labels (board_id, name, color) VALUES
  (2, 'Q1',      '#4BCE97'),
  (2, 'Q2',      '#F5CD47'),
  (2, 'Q3',      '#FAA53D'),
  (2, 'Blocked', '#F87168'),
  (2, 'Done',    '#579DFF');

-- Board 3
INSERT INTO labels (board_id, name, color) VALUES
  (3, 'Social Media', '#9F8FEF'),
  (3, 'Email',        '#579DFF'),
  (3, 'Blog',         '#4BCE97'),
  (3, 'Ad Campaign',  '#FAA53D');

-- ============================================================
-- LISTS — Board 1
-- ============================================================
INSERT INTO lists (board_id, title, position) VALUES
  (1, 'To Do',        1),
  (1, 'In Progress',  2),
  (1, 'Review',       3),
  (1, 'Done',         4);

-- LISTS — Board 2
INSERT INTO lists (board_id, title, position) VALUES
  (2, 'Backlog',       1),
  (2, 'Planned',       2),
  (2, 'In Development',3),
  (2, 'Shipped',       4);

-- LISTS — Board 3
INSERT INTO lists (board_id, title, position) VALUES
  (3, 'Ideas',         1),
  (3, 'In Review',     2),
  (3, 'Approved',      3),
  (3, 'Published',     4);

-- ============================================================
-- CARDS — Board 1
-- ============================================================
INSERT INTO cards (list_id, board_id, title, description, position, cover_color, due_date) VALUES
  -- To Do (list 1)
  (1, 1, 'Set up project repository',
   'Initialize the Git repository, create the project structure, and set up the development environment.',
   1, NULL, NULL),
  
  (1, 1, 'Design database schema',
   'Create an ER diagram and define all tables, relationships, and indexes for the application.',
   2, '#7C5CBF', DATE_ADD(NOW(), INTERVAL 3 DAY)),
  
  (1, 1, 'Write API documentation',
   'Document all REST API endpoints using Swagger or a similar tool.',
   3, NULL, DATE_ADD(NOW(), INTERVAL 7 DAY)),

  -- In Progress (list 2)
  (2, 1, 'Build REST API endpoints',
   'Implement all CRUD endpoints for boards, lists, cards, labels, checklists, and members using Express.js.',
   1, '#4BCE97', DATE_ADD(NOW(), INTERVAL 2 DAY)),
  
  (2, 1, 'Implement drag and drop',
   'Use @hello-pangea/dnd to implement smooth drag-and-drop for cards and lists.',
   2, NULL, DATE_ADD(NOW(), INTERVAL 1 DAY)),

  (2, 1, 'Set up authentication middleware',
   'Implement JWT-based authentication and protect all API routes.',
   3, NULL, NULL),

  -- Review (list 3)
  (3, 1, 'Write unit tests for API',
   'Create comprehensive tests for all API endpoints using Jest and Supertest.',
   1, '#F87168', DATE_ADD(NOW(), INTERVAL -1 DAY)),

  (3, 1, 'UI component review',
   'Review all React components for accessibility, performance, and code quality.',
   2, NULL, NULL),

  -- Done (list 4)
  (4, 1, 'Set up project structure',
   'Created the monorepo with server and client directories, installed all dependencies.',
   1, NULL, NULL),
  
  (4, 1, 'Configure CI/CD pipeline',
   'Set up GitHub Actions for automated testing and deployment.',
   2, '#579DFF', NULL),

  -- Inbox Cards (Board 1)
  (NULL, 1, 'Have to make a clone of TaskFlow', 'UI matching from screenshots', 1, NULL, NULL),
  (NULL, 1, 'See it, send it, save it for later', 'Random thought', 2, NULL, NULL);

-- ============================================================
-- CARDS — Board 2
-- ============================================================
INSERT INTO cards (list_id, board_id, title, description, position) VALUES
  (5, 2, 'User authentication flow',    'Design user login and registration flow.', 1),
  (5, 2, 'Dark mode support',           'Add dark mode toggle across all views.', 2),
  (6, 2, 'Mobile app MVP',              'Define scope for first mobile release.', 1),
  (6, 2, 'API v2 planning',             'Plan breaking changes for next API version.', 2),
  (7, 2, 'Real-time notifications',     'WebSocket-based push notifications.', 1),
  (8, 2, 'Export to CSV feature',       'Allow users to export their board data.', 1);

-- ============================================================
-- CARDS — Board 3
-- ============================================================
INSERT INTO cards (list_id, board_id, title, description, position) VALUES
  (9,  3, 'Q2 social media calendar',  'Plan posts for Twitter, LinkedIn, Instagram.', 1),
  (9,  3, 'Blog post: Team spotlight', 'Feature article on engineering culture.', 2),
  (10, 3, 'Email newsletter draft',    'Draft April newsletter for review.', 1),
  (11, 3, 'Google Ads campaign',       'Set up conversion tracking and ad groups.', 1),
  (12, 3, 'Press release published',   'Announce new feature to media outlets.', 1);

-- ============================================================
-- CARD MEMBERS
-- ============================================================
INSERT INTO card_members (card_id, user_id) VALUES
  (1, 1), (1, 2),
  (2, 1), (2, 3),
  (4, 2), (4, 4),
  (5, 1), (5, 3),
  (7, 4),
  (8, 2), (8, 5),
  (9, 1), (9, 2),
  (10,1);

-- ============================================================
-- CARD LABELS
-- ============================================================
INSERT INTO card_labels (card_id, label_id) VALUES
  (1, 2),       -- Feature
  (2, 2), (2,4),(2,5), -- Feature + Design + Urgent
  (3, 6),       -- Documentation
  (4, 2), (4,3),-- Feature + Enhancement
  (5, 2), (5,3),-- Feature + Enhancement
  (6, 2),       -- Feature
  (7, 1),       -- Bug
  (8, 4),       -- Design
  (9, 3),       -- Enhancement
  (10,2);       -- Feature

-- ============================================================
-- CHECKLISTS
-- ============================================================
INSERT INTO checklists (card_id, title) VALUES
  (2, 'Schema Tasks'),
  (4, 'API Endpoints'),
  (5, 'DnD Components');

-- Checklist items for card 2 (Design database schema)
INSERT INTO checklist_items (checklist_id, title, completed, position) VALUES
  (1, 'Draw ER diagram',                  1, 1),
  (1, 'Define users table',              1, 2),
  (1, 'Define boards and lists tables',  1, 3),
  (1, 'Define cards table with positions',0, 4),
  (1, 'Define labels and checklist tables',0,5),
  (1, 'Write schema.sql migration',       0, 6);

-- Checklist items for card 4 (Build REST API)
INSERT INTO checklist_items (checklist_id, title, completed, position) VALUES
  (2, 'Boards CRUD',     1, 1),
  (2, 'Lists CRUD',      1, 2),
  (2, 'Cards CRUD',      1, 3),
  (2, 'Labels API',      0, 4),
  (2, 'Checklists API',  0, 5),
  (2, 'Members API',     0, 6),
  (2, 'Comments API',    0, 7),
  (2, 'Attachments API', 0, 8);

-- Checklist items for card 5 (Drag and Drop)
INSERT INTO checklist_items (checklist_id, title, completed, position) VALUES
  (3, 'Set up DnD context',              1, 1),
  (3, 'Card drag within list',           1, 2),
  (3, 'Card drag between lists',         0, 3),
  (3, 'List reordering (horizontal)',    0, 4),
  (3, 'Persist order to backend',        0, 5);

-- ============================================================
-- COMMENTS
-- ============================================================
INSERT INTO comments (card_id, user_id, content) VALUES
  (2, 2, 'I have started the ER diagram, will share by EOD.'),
  (2, 1, 'Great! Make sure to include the activity_log table for audit trail.'),
  (4, 3, 'Endpoints look good. Should we add pagination to the cards list endpoint?'),
  (4, 1, 'Yes, lets add limit/offset pagination. Good catch!'),
  (5, 2, '@hello-pangea/dnd works great with React 18. No warnings.'),
  (7, 4, 'Tests are failing on the card move endpoint. Will fix tomorrow.'),
  (7, 1, 'Assigned this to you, please priority fix before the review meeting.');
