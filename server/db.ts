import { Database } from 'bun:sqlite';
import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';

interface StoredReading {
  id: string;
  device_id: string | null;
  room: string;
  timestamp: number;
  created_at: string;
  sensor_data: string;
}

interface ReadingInsert {
  id: string;
  device_id: string | null;
  room: string;
  timestamp: number;
  sensor_data: string;
}

interface ReadingQuery {
  limit?: number;
  offset?: number;
  device_id?: string;
  room?: string;
  since?: number;
}

export class AirQualityDatabase {
  private db: Database;

  constructor(dbPath = '/data/air_quality.db') {
    // Ensure data directory exists (synchronously)
    const dir = dirname(dbPath);
    try {
      mkdirSync(dir, { recursive: true });
    } catch (err) {
      if (err && typeof err === 'object' && 'code' in err && err.code !== 'EEXIST') {
        console.error('Failed to create data directory:', err);
        throw err;
      }
    }

    this.db = new Database(dbPath);
    // Enable WAL mode for better concurrency
    this.db.exec('PRAGMA journal_mode = WAL');
    this.initSchema();
  }

  private initSchema(): void {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS readings (
        id TEXT PRIMARY KEY,
        device_id TEXT,
        room TEXT,
        timestamp INTEGER NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        sensor_data TEXT NOT NULL,
        UNIQUE(timestamp, device_id)
      );

      CREATE INDEX IF NOT EXISTS idx_timestamp ON readings(timestamp DESC);
      CREATE INDEX IF NOT EXISTS idx_device_id ON readings(device_id);
      CREATE INDEX IF NOT EXISTS idx_room ON readings(room);
    `);
  }

  insertReading(reading: ReadingInsert): void {
    const stmt = this.db.prepare(`
      INSERT INTO readings (id, device_id, room, timestamp, sensor_data)
      VALUES (?, ?, ?, ?, ?)
      ON CONFLICT(timestamp, device_id) DO UPDATE SET
        sensor_data = excluded.sensor_data,
        room = excluded.room
    `);

    stmt.run(reading.id, reading.device_id, reading.room, reading.timestamp, reading.sensor_data);
  }

  getReadings(query: ReadingQuery = {}): StoredReading[] {
    const { limit = 50, offset = 0, device_id, room, since } = query;

    let sql = 'SELECT * FROM readings WHERE 1=1';
    const params: (string | number)[] = [];

    if (device_id) {
      sql += ' AND device_id = ?';
      params.push(device_id);
    }

    if (room) {
      sql += ' AND room = ?';
      params.push(room);
    }

    if (since) {
      sql += ' AND timestamp >= ?';
      params.push(since);
    }

    sql += ' ORDER BY timestamp DESC LIMIT ? OFFSET ?';
    params.push(limit, offset);

    const stmt = this.db.prepare(sql);
    return stmt.all(...params) as StoredReading[];
  }

  deleteReading(id: string): void {
    const stmt = this.db.prepare('DELETE FROM readings WHERE id = ?');
    stmt.run(id);
  }

  deleteAllReadings(): void {
    this.db.exec('DELETE FROM readings');
  }

  getAllReadingsForExport(): StoredReading[] {
    const stmt = this.db.prepare('SELECT * FROM readings ORDER BY timestamp ASC');
    return stmt.all() as StoredReading[];
  }

  getStats(): {
    total_readings: number;
    oldest_timestamp: number | null;
    newest_timestamp: number | null;
    devices: string[];
    rooms: string[];
  } {
    const totalStmt = this.db.prepare('SELECT COUNT(*) as count FROM readings');
    const total = (totalStmt.get() as { count: number }).count;

    const timestampStmt = this.db.prepare('SELECT MIN(timestamp) as oldest, MAX(timestamp) as newest FROM readings');
    const timestamps = timestampStmt.get() as { oldest: number | null; newest: number | null };

    const devicesStmt = this.db.prepare(
      'SELECT DISTINCT device_id FROM readings WHERE device_id IS NOT NULL ORDER BY device_id',
    );
    const devices = (devicesStmt.all() as { device_id: string }[]).map((row) => row.device_id);

    const roomsStmt = this.db.prepare('SELECT DISTINCT room FROM readings ORDER BY room');
    const rooms = (roomsStmt.all() as { room: string }[]).map((row) => row.room);

    return {
      total_readings: total,
      oldest_timestamp: timestamps.oldest,
      newest_timestamp: timestamps.newest,
      devices,
      rooms,
    };
  }

  close(): void {
    this.db.close();
  }
}
