import { type Request, type Response, Router } from 'express';
import { AirQualityDatabase } from './db';

const router = Router();
const db = new AirQualityDatabase();

// Helper to generate unique ID using Web Crypto API
function generateId(): string {
  return crypto.randomUUID().replace(/-/g, '');
}

// GET /readings - Retrieve readings with pagination and filtering
router.get('/readings', (req: Request, res: Response) => {
  try {
    const limit = req.query.limit ? Number.parseInt(req.query.limit as string, 10) : 50;
    const offset = req.query.offset ? Number.parseInt(req.query.offset as string, 10) : 0;
    const device_id = req.query.device_id as string | undefined;
    const room = req.query.room as string | undefined;
    const since = req.query.since ? Number.parseInt(req.query.since as string, 10) : undefined;

    const readings = db.getReadings({
      limit,
      offset,
      device_id,
      room,
      since,
    });

    // Parse sensor_data JSON for each reading
    const parsedReadings = readings.map((reading) => ({
      id: reading.id,
      device_id: reading.device_id,
      room: reading.room,
      timestamp: reading.timestamp,
      created_at: reading.created_at,
      data: JSON.parse(reading.sensor_data),
    }));

    res.json({
      readings: parsedReadings,
      pagination: {
        limit,
        offset,
        count: parsedReadings.length,
      },
    });
  } catch (error) {
    console.error('Error fetching readings:', error);
    res.status(500).json({ error: 'Failed to fetch readings' });
  }
});

// POST /readings - Store a new reading
router.post('/readings', (req: Request, res: Response) => {
  try {
    const { data, room, device_id, timestamp } = req.body;

    if (!data || !room) {
      res.status(400).json({ error: 'Missing required fields: data, room' });
      return;
    }

    const id = generateId();
    const readingTimestamp = timestamp || Date.now();

    db.insertReading({
      id,
      device_id: device_id || null,
      room,
      timestamp: readingTimestamp,
      sensor_data: JSON.stringify(data),
    });

    res.status(201).json({
      id,
      timestamp: readingTimestamp,
      success: true,
    });
  } catch (error) {
    console.error('Error storing reading:', error);
    res.status(500).json({ error: 'Failed to store reading' });
  }
});

// DELETE /readings/:id - Delete a specific reading
router.delete('/readings/:id', (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    if (!id) {
      res.status(400).json({ error: 'Missing reading ID' });
      return;
    }

    db.deleteReading(id);

    res.json({
      success: true,
      message: `Reading ${id} deleted`,
    });
  } catch (error) {
    console.error('Error deleting reading:', error);
    res.status(500).json({ error: 'Failed to delete reading' });
  }
});

// DELETE /readings - Clear all readings
router.delete('/readings', (req: Request, res: Response) => {
  try {
    db.deleteAllReadings();

    res.json({
      success: true,
      message: 'All readings cleared',
    });
  } catch (error) {
    console.error('Error clearing readings:', error);
    res.status(500).json({ error: 'Failed to clear readings' });
  }
});

// GET /export - Export all readings
router.get('/export', (req: Request, res: Response) => {
  try {
    const readings = db.getAllReadingsForExport();

    // Parse sensor_data JSON for each reading
    const parsedReadings = readings.map((reading) => ({
      id: reading.id,
      device_id: reading.device_id,
      room: reading.room,
      timestamp: reading.timestamp,
      created_at: reading.created_at,
      data: JSON.parse(reading.sensor_data),
    }));

    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', 'attachment; filename="air_quality_export.json"');
    res.json({
      export_date: new Date().toISOString(),
      version: '1.0',
      readings: parsedReadings,
    });
  } catch (error) {
    console.error('Error exporting data:', error);
    res.status(500).json({ error: 'Failed to export data' });
  }
});

// POST /import - Import readings from export file
router.post('/import', (req: Request, res: Response) => {
  try {
    const { readings } = req.body;

    if (!Array.isArray(readings)) {
      res.status(400).json({ error: 'Invalid import format: readings must be an array' });
      return;
    }

    let importedCount = 0;
    let errorCount = 0;

    for (const reading of readings) {
      try {
        // Validate required fields
        if (!reading.data || !reading.room || !reading.timestamp) {
          errorCount++;
          continue;
        }

        db.insertReading({
          id: reading.id || generateId(),
          device_id: reading.device_id || null,
          room: reading.room,
          timestamp: reading.timestamp,
          sensor_data: typeof reading.data === 'string' ? reading.data : JSON.stringify(reading.data),
        });

        importedCount++;
      } catch (err) {
        console.error('Error importing reading:', err);
        errorCount++;
      }
    }

    res.json({
      success: true,
      imported: importedCount,
      errors: errorCount,
      total: readings.length,
    });
  } catch (error) {
    console.error('Error importing data:', error);
    res.status(500).json({ error: 'Failed to import data' });
  }
});

// GET /stats - Get database statistics
router.get('/stats', (req: Request, res: Response) => {
  try {
    const stats = db.getStats();

    res.json({
      ...stats,
      database_path: '/data/air_quality.db',
    });
  } catch (error) {
    console.error('Error fetching stats:', error);
    res.status(500).json({ error: 'Failed to fetch statistics' });
  }
});

export default router;
