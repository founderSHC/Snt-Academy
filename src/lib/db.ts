import Database from "better-sqlite3";
import path from "path";
import fs from "fs";
import bcrypt from "bcryptjs";

const dataDir = path.join(process.cwd(), "data");
if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });

const dbPath = path.join(dataDir, "snt.db");

declare global {
  // eslint-disable-next-line no-var
  var __sntDb: Database.Database | undefined;
}

const db = global.__sntDb ?? new Database(dbPath);
global.__sntDb = db;

db.pragma("journal_mode = WAL");
db.pragma("foreign_keys = ON");
db.pragma("busy_timeout = 5000");

// Next.js evaluates this module from several parallel workers during `next
// build` (page-data collection), each opening the same on-disk database. All
// setup below runs inside one immediate transaction so it's serialized across
// those workers instead of racing on check-then-write migrations.
const initialize = db.transaction(() => {
  db.exec(`
    CREATE TABLE IF NOT EXISTS admins (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      name TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS classes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT UNIQUE NOT NULL,
      show_rank INTEGER NOT NULL DEFAULT 1
    );

    CREATE TABLE IF NOT EXISTS students (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      name TEXT NOT NULL,
      class_id INTEGER NOT NULL REFERENCES classes(id),
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS announcements (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      body TEXT NOT NULL,
      class_id INTEGER REFERENCES classes(id),
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `);

  // --- Migrate legacy single-score tests (pre category support) ---
  const tableExists = (name: string) =>
    !!db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name = ?").get(name);

  if (tableExists("tests") && !tableExists("test_categories")) {
    const testCols = db.prepare("PRAGMA table_info(tests)").all() as { name: string }[];
    const hasLegacyMaxScore = testCols.some((c) => c.name === "max_score");

    if (hasLegacyMaxScore) {
      db.exec(`
        CREATE TABLE test_categories (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          test_id INTEGER NOT NULL REFERENCES tests(id) ON DELETE CASCADE,
          name TEXT NOT NULL,
          max_score REAL NOT NULL,
          sort_order INTEGER NOT NULL DEFAULT 0
        );
      `);

      const legacyTests = db.prepare("SELECT id, max_score FROM tests").all() as {
        id: number;
        max_score: number;
      }[];
      const insertCategory = db.prepare(
        "INSERT INTO test_categories (test_id, name, max_score, sort_order) VALUES (?, 'Total', ?, 0)"
      );
      const categoryIdByTestId = new Map<number, number>();
      for (const t of legacyTests) {
        const result = insertCategory.run(t.id, t.max_score);
        categoryIdByTestId.set(t.id, Number(result.lastInsertRowid));
      }

      db.exec("ALTER TABLE scores RENAME TO scores_legacy;");
      db.exec(`
        CREATE TABLE scores (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          test_category_id INTEGER NOT NULL REFERENCES test_categories(id) ON DELETE CASCADE,
          student_id INTEGER NOT NULL REFERENCES students(id) ON DELETE CASCADE,
          score REAL NOT NULL,
          UNIQUE(test_category_id, student_id)
        );
      `);

      const legacyScores = db.prepare("SELECT test_id, student_id, score FROM scores_legacy").all() as {
        test_id: number;
        student_id: number;
        score: number;
      }[];
      const insertScore = db.prepare(
        "INSERT INTO scores (test_category_id, student_id, score) VALUES (?, ?, ?)"
      );
      for (const s of legacyScores) {
        const categoryId = categoryIdByTestId.get(s.test_id);
        if (categoryId) insertScore.run(categoryId, s.student_id, s.score);
      }
      db.exec("DROP TABLE scores_legacy;");

      try {
        db.exec("ALTER TABLE tests DROP COLUMN max_score;");
      } catch {
        // Older SQLite without DROP COLUMN support; the unused column is harmless.
      }
    }
  }

  db.exec(`
    CREATE TABLE IF NOT EXISTS tests (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      class_id INTEGER NOT NULL REFERENCES classes(id),
      title TEXT NOT NULL,
      test_date TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS test_categories (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      test_id INTEGER NOT NULL REFERENCES tests(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      max_score REAL NOT NULL,
      sort_order INTEGER NOT NULL DEFAULT 0,
      retest_threshold REAL,
      counts_toward_total INTEGER NOT NULL DEFAULT 1
    );

    CREATE TABLE IF NOT EXISTS scores (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      test_category_id INTEGER NOT NULL REFERENCES test_categories(id) ON DELETE CASCADE,
      student_id INTEGER NOT NULL REFERENCES students(id) ON DELETE CASCADE,
      score REAL NOT NULL,
      UNIQUE(test_category_id, student_id)
    );
  `);

  const categoryColumns = db.prepare("PRAGMA table_info(test_categories)").all() as { name: string }[];
  if (!categoryColumns.some((c) => c.name === "retest_threshold")) {
    db.exec("ALTER TABLE test_categories ADD COLUMN retest_threshold REAL;");
  }
  if (!categoryColumns.some((c) => c.name === "counts_toward_total")) {
    db.exec(
      "ALTER TABLE test_categories ADD COLUMN counts_toward_total INTEGER NOT NULL DEFAULT 1;"
    );
  }

  const classColumns = db.prepare("PRAGMA table_info(classes)").all() as { name: string }[];
  if (!classColumns.some((c) => c.name === "show_rank")) {
    db.exec("ALTER TABLE classes ADD COLUMN show_rank INTEGER NOT NULL DEFAULT 1;");
    // Rank display was disabled for Premium and Elite when this setting was introduced.
    db.prepare("UPDATE classes SET show_rank = 0 WHERE name IN ('Premium', 'Elite')").run();
  }

  const classNames = ["Premium", "Elite", "Master"];
  const insertClass = db.prepare("INSERT OR IGNORE INTO classes (name, show_rank) VALUES (?, ?)");
  for (const c of classNames) insertClass.run(c, c === "Master" ? 1 : 0);

  const adminExists = db.prepare("SELECT 1 FROM admins WHERE username = ?").get("jiwon");
  if (!adminExists) {
    const hash = bcrypt.hashSync("changeme123", 10);
    db.prepare("INSERT OR IGNORE INTO admins (username, password_hash, name) VALUES (?, ?, ?)").run(
      "jiwon",
      hash,
      "Jiwon"
    );
  }
});

initialize.immediate();

export default db;
