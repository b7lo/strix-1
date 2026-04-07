import express from 'express';
import cors from 'cors';
import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 5000;
const DB_PATH = path.join(__dirname, 'database.db');

app.use(cors());
app.use(express.json());

// Serve static frontend files in production
const distPath = path.join(__dirname, '..', 'dist');
app.use(express.static(distPath));

// Initialize Database
const db = new Database(DB_PATH);

// Create tables if they don't exist
db.exec(`
  CREATE TABLE IF NOT EXISTS settings (
    key TEXT PRIMARY KEY,
    value TEXT
  );

  CREATE TABLE IF NOT EXISTS projects (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    slug TEXT NOT NULL,
    description TEXT,
    image TEXT,
    type TEXT,
    link TEXT,
    category TEXT,
    tags TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );
`);

// Set default password if not exists
const checkPwd = db.prepare('SELECT value FROM settings WHERE key = ?').get('admin_password');
if (!checkPwd) {
  db.prepare('INSERT INTO settings (key, value) VALUES (?, ?)').run('admin_password', 'admin123');
}

// ==================== API Routes ====================

// Auth
app.post('/api/auth/login', (req, res) => {
  const { password } = req.body;
  const savedPwd = db.prepare('SELECT value FROM settings WHERE key = ?').get('admin_password');

  if (password === savedPwd.value) {
    res.json({ success: true, message: 'Logged in successfully' });
  } else {
    res.status(401).json({ success: false, message: 'كلمة المرور غير صحيحة' });
  }
});

app.post('/api/auth/change-password', (req, res) => {
  const { oldPassword, newPassword } = req.body;
  const savedPwd = db.prepare('SELECT value FROM settings WHERE key = ?').get('admin_password');

  if (oldPassword === savedPwd.value) {
    db.prepare('UPDATE settings SET value = ? WHERE key = ?').run(newPassword, 'admin_password');
    res.json({ success: true, message: 'Password changed successfully' });
  } else {
    res.status(401).json({ success: false, message: 'كلمة المرور الحالية غير صحيحة' });
  }
});

// Projects
app.get('/api/projects', (req, res) => {
  const projects = db.prepare('SELECT * FROM projects ORDER BY created_at DESC').all();
  res.json(projects);
});

app.post('/api/projects', (req, res) => {
  const { id, title, slug, description, image, type, link, category, tags } = req.body;
  try {
    db.prepare(`
      INSERT INTO projects (id, title, slug, description, image, type, link, category, tags)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(id, title, slug, description, image, type, link, category, tags);
    res.status(201).json({ success: true, id });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.put('/api/projects/:id', (req, res) => {
  const { id } = req.params;
  const { title, slug, description, image, type, link, category, tags } = req.body;
  try {
    db.prepare(`
      UPDATE projects 
      SET title = ?, slug = ?, description = ?, image = ?, type = ?, link = ?, category = ?, tags = ?
      WHERE id = ?
    `).run(title, slug, description, image, type, link, category, tags, id);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.delete('/api/projects/:id', (req, res) => {
  const { id } = req.params;
  try {
    db.prepare('DELETE FROM projects WHERE id = ?').run(id);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Sync endpoint for migrating localStorage projects
app.post('/api/projects/sync', (req, res) => {
  const { projects } = req.body;
  const insert = db.prepare(`
    INSERT OR IGNORE INTO projects (id, title, slug, description, image, type, link, category, tags)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const transaction = db.transaction((projects) => {
    for (const p of projects) {
      insert.run(p.id, p.title, p.slug, p.description, p.image, p.type, p.link, p.category || '', p.tags || '');
    }
  });

  try {
    transaction(projects);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// SPA fallback — serve index.html for all non-API routes
app.get('*', (req, res) => {
  res.sendFile(path.join(distPath, 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
