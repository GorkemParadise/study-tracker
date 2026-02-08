import * as SQLite from 'expo-sqlite';
import {
  Subject,
  StudySession,
  DailyPlan,
  Note,
  DailyPlanWithProgress,
  SubjectStats,
  DailyStats,
} from '../types';

let db: SQLite.SQLiteDatabase;

export async function getDatabase(): Promise<SQLite.SQLiteDatabase> {
  if (!db) {
    db = await SQLite.openDatabaseAsync('studytracker.db');
    await initDatabase();
  }
  return db;
}

async function initDatabase(): Promise<void> {
  await db.execAsync(`
    PRAGMA journal_mode = WAL;
    PRAGMA foreign_keys = ON;

    CREATE TABLE IF NOT EXISTS subjects (
      id TEXT PRIMARY KEY NOT NULL,
      name TEXT NOT NULL,
      color TEXT NOT NULL DEFAULT '#4A90D9',
      createdAt TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS study_sessions (
      id TEXT PRIMARY KEY NOT NULL,
      subjectId TEXT NOT NULL,
      startTime TEXT NOT NULL,
      endTime TEXT NOT NULL,
      duration INTEGER NOT NULL,
      note TEXT DEFAULT '',
      FOREIGN KEY (subjectId) REFERENCES subjects(id)
    );

    CREATE TABLE IF NOT EXISTS daily_plans (
      id TEXT PRIMARY KEY NOT NULL,
      date TEXT NOT NULL,
      subjectId TEXT NOT NULL,
      targetMinutes INTEGER NOT NULL,
      FOREIGN KEY (subjectId) REFERENCES subjects(id),
      UNIQUE(date, subjectId)
    );

    CREATE TABLE IF NOT EXISTS notes (
      id TEXT PRIMARY KEY NOT NULL,
      sessionId TEXT,
      date TEXT NOT NULL,
      title TEXT NOT NULL DEFAULT '',
      content TEXT NOT NULL DEFAULT '',
      createdAt TEXT NOT NULL,
      updatedAt TEXT NOT NULL,
      FOREIGN KEY (sessionId) REFERENCES study_sessions(id)
    );

    CREATE INDEX IF NOT EXISTS idx_sessions_subject ON study_sessions(subjectId);
    CREATE INDEX IF NOT EXISTS idx_sessions_start ON study_sessions(startTime);
    CREATE INDEX IF NOT EXISTS idx_plans_date ON daily_plans(date);
    CREATE INDEX IF NOT EXISTS idx_notes_date ON notes(date);
    CREATE INDEX IF NOT EXISTS idx_notes_session ON notes(sessionId);
  `);
}

// ===== SUBJECTS =====

export async function getAllSubjects(): Promise<Subject[]> {
  const database = await getDatabase();
  return database.getAllAsync<Subject>('SELECT * FROM subjects ORDER BY name');
}

export async function insertSubject(subject: Subject): Promise<void> {
  const database = await getDatabase();
  await database.runAsync(
    'INSERT INTO subjects (id, name, color, createdAt) VALUES (?, ?, ?, ?)',
    [subject.id, subject.name, subject.color, subject.createdAt]
  );
}

export async function updateSubject(subject: Subject): Promise<void> {
  const database = await getDatabase();
  await database.runAsync(
    'UPDATE subjects SET name = ?, color = ? WHERE id = ?',
    [subject.name, subject.color, subject.id]
  );
}

export async function deleteSubject(id: string): Promise<void> {
  const database = await getDatabase();
  await database.runAsync('DELETE FROM daily_plans WHERE subjectId = ?', [id]);
  await database.runAsync('DELETE FROM subjects WHERE id = ?', [id]);
}

export async function getSessionCountForSubject(subjectId: string): Promise<number> {
  const database = await getDatabase();
  const result = await database.getFirstAsync<{ count: number }>(
    'SELECT COUNT(*) as count FROM study_sessions WHERE subjectId = ?',
    [subjectId]
  );
  return result?.count ?? 0;
}

// ===== STUDY SESSIONS =====

export async function insertSession(session: StudySession): Promise<void> {
  const database = await getDatabase();
  await database.runAsync(
    'INSERT INTO study_sessions (id, subjectId, startTime, endTime, duration, note) VALUES (?, ?, ?, ?, ?, ?)',
    [session.id, session.subjectId, session.startTime, session.endTime, session.duration, session.note]
  );
}

export async function getSessionsForDate(date: string): Promise<StudySession[]> {
  const database = await getDatabase();
  return database.getAllAsync<StudySession>(
    'SELECT * FROM study_sessions WHERE date(startTime) = ? ORDER BY startTime DESC',
    [date]
  );
}

export async function getTotalMinutesForSubjectOnDate(subjectId: string, date: string): Promise<number> {
  const database = await getDatabase();
  const result = await database.getFirstAsync<{ total: number }>(
    'SELECT COALESCE(SUM(duration), 0) as total FROM study_sessions WHERE subjectId = ? AND date(startTime) = ?',
    [subjectId, date]
  );
  return Math.round((result?.total ?? 0) / 60);
}

export async function getDailyTotalMinutes(date: string): Promise<number> {
  const database = await getDatabase();
  const result = await database.getFirstAsync<{ total: number }>(
    'SELECT COALESCE(SUM(duration), 0) as total FROM study_sessions WHERE date(startTime) = ?',
    [date]
  );
  return Math.round((result?.total ?? 0) / 60);
}

export async function getWeeklyStats(dates: string[]): Promise<DailyStats[]> {
  const database = await getDatabase();
  const placeholders = dates.map(() => '?').join(',');
  const rows = await database.getAllAsync<{ date: string; total: number }>(
    `SELECT date(startTime) as date, COALESCE(SUM(duration), 0) as total
     FROM study_sessions WHERE date(startTime) IN (${placeholders}) GROUP BY date(startTime)`,
    dates
  );
  return dates.map((d) => {
    const row = rows.find((r) => r.date === d);
    return { date: d, totalMinutes: Math.round((row?.total ?? 0) / 60) };
  });
}

export async function getSubjectStats(startDate?: string, endDate?: string): Promise<SubjectStats[]> {
  const database = await getDatabase();
  let query = `
    SELECT s.id as subjectId, s.name as subjectName, s.color as subjectColor,
           COALESCE(SUM(ss.duration), 0) as totalSeconds,
           COUNT(ss.id) as sessionCount
    FROM subjects s
    LEFT JOIN study_sessions ss ON s.id = ss.subjectId`;
  const params: string[] = [];
  if (startDate && endDate) {
    query += ' AND date(ss.startTime) BETWEEN ? AND ?';
    params.push(startDate, endDate);
  }
  query += ' GROUP BY s.id ORDER BY totalSeconds DESC';
  const rows = await database.getAllAsync<{
    subjectId: string; subjectName: string; subjectColor: string;
    totalSeconds: number; sessionCount: number;
  }>(query, params);
  return rows.map((r) => ({
    subjectId: r.subjectId, subjectName: r.subjectName, subjectColor: r.subjectColor,
    totalMinutes: Math.round(r.totalSeconds / 60), sessionCount: r.sessionCount,
  }));
}

// ===== DAILY PLANS =====

export async function getPlansForDate(date: string): Promise<DailyPlanWithProgress[]> {
  const database = await getDatabase();
  const plans = await database.getAllAsync<DailyPlan & { subjectName: string; subjectColor: string }>(
    `SELECT dp.*, s.name as subjectName, s.color as subjectColor
     FROM daily_plans dp JOIN subjects s ON dp.subjectId = s.id
     WHERE dp.date = ? ORDER BY s.name`,
    [date]
  );
  const result: DailyPlanWithProgress[] = [];
  for (const plan of plans) {
    const actualMinutes = await getTotalMinutesForSubjectOnDate(plan.subjectId, date);
    result.push({ ...plan, actualMinutes });
  }
  return result;
}

export async function upsertPlan(plan: DailyPlan): Promise<void> {
  const database = await getDatabase();
  await database.runAsync(
    `INSERT INTO daily_plans (id, date, subjectId, targetMinutes) VALUES (?, ?, ?, ?)
     ON CONFLICT(date, subjectId) DO UPDATE SET targetMinutes = ?`,
    [plan.id, plan.date, plan.subjectId, plan.targetMinutes, plan.targetMinutes]
  );
}

export async function deletePlan(id: string): Promise<void> {
  const database = await getDatabase();
  await database.runAsync('DELETE FROM daily_plans WHERE id = ?', [id]);
}

// ===== NOTES =====

export async function getAllNotes(): Promise<Note[]> {
  const database = await getDatabase();
  return database.getAllAsync<Note>('SELECT * FROM notes ORDER BY updatedAt DESC');
}

export async function insertNote(note: Note): Promise<void> {
  const database = await getDatabase();
  await database.runAsync(
    'INSERT INTO notes (id, sessionId, date, title, content, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?)',
    [note.id, note.sessionId, note.date, note.title, note.content, note.createdAt, note.updatedAt]
  );
}

export async function updateNote(note: Note): Promise<void> {
  const database = await getDatabase();
  await database.runAsync(
    'UPDATE notes SET title = ?, content = ?, updatedAt = ? WHERE id = ?',
    [note.title, note.content, note.updatedAt, note.id]
  );
}

export async function deleteNote(id: string): Promise<void> {
  const database = await getDatabase();
  await database.runAsync('DELETE FROM notes WHERE id = ?', [id]);
}

// ===== DATA MANAGEMENT =====

export async function exportAllData(): Promise<object> {
  const database = await getDatabase();
  const subjects = await database.getAllAsync('SELECT * FROM subjects');
  const sessions = await database.getAllAsync('SELECT * FROM study_sessions');
  const plans = await database.getAllAsync('SELECT * FROM daily_plans');
  const notes = await database.getAllAsync('SELECT * FROM notes');
  return { exportDate: new Date().toISOString(), subjects, study_sessions: sessions, daily_plans: plans, notes };
}

export async function resetAllData(): Promise<void> {
  const database = await getDatabase();
  await database.execAsync('DELETE FROM notes; DELETE FROM study_sessions; DELETE FROM daily_plans; DELETE FROM subjects;');
}