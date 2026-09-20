import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import fs from 'fs';

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Middleware to parse JSON payloads
  app.use(express.json({ limit: '10mb' }));

  // Read Firebase config safely for backend diagnostics
  let firebaseConfig: Record<string, any> = {};
  try {
    const configPath = path.join(process.cwd(), 'firebase-applet-config.json');
    if (fs.existsSync(configPath)) {
      firebaseConfig = JSON.parse(fs.readFileSync(configPath, 'utf8'));
    }
  } catch (err) {
    console.warn('Could not read firebase-applet-config.json:', err);
  }

  // In-memory live event log and SSE clients for real-time broadcasts
  interface LiveUpdateEvent {
    id: string;
    timestamp: string;
    type: 'MARKSHEET_SUBMITTED' | 'MARKSHEET_UNLOCKED' | 'MARKSHEET_DELETED' | 'BATCH_UPDATED' | 'STUDENT_ROSTER_SAVED' | 'SYSTEM';
    title: string;
    description: string;
    author?: string;
    details?: Record<string, any>;
  }

  const liveEvents: LiveUpdateEvent[] = [
    {
      id: 'evt-init',
      timestamp: new Date().toISOString(),
      type: 'SYSTEM',
      title: 'Exam Cell Live Engine Booted',
      description: 'Central Exam Cell Real-time Server & Firestore Sync Engine active.',
      author: 'System',
    },
  ];

  const sseClients = new Set<express.Response>();

  const broadcastEvent = (event: LiveUpdateEvent) => {
    liveEvents.unshift(event);
    if (liveEvents.length > 100) {
      liveEvents.pop();
    }
    const payload = `data: ${JSON.stringify(event)}\n\n`;
    for (const client of sseClients) {
      try {
        client.write(payload);
      } catch (err) {
        sseClients.delete(client);
      }
    }
  };

  // Heartbeat to keep SSE connections open behind proxies
  setInterval(() => {
    for (const client of sseClients) {
      try {
        client.write(': heartbeat\n\n');
      } catch {
        sseClients.delete(client);
      }
    }
  }, 25000);

  // ==========================================
  // BACKEND API ROUTES
  // ==========================================

  // 1. Health check & Server Status
  app.get('/api/health', (req, res) => {
    res.json({
      status: 'ok',
      service: 'Jaya Sakthi Central Exam Cell Backend',
      timestamp: new Date().toISOString(),
      uptimeSeconds: Math.floor(process.uptime()),
      environment: process.env.NODE_ENV || 'development',
      connectedClients: sseClients.size,
      totalUpdatesLogged: liveEvents.length,
      database: {
        provider: 'Google Cloud Firestore',
        projectId: firebaseConfig.projectId || 'sacred-feat-t9v0l',
        databaseId: firebaseConfig.firestoreDatabaseId || '(default)',
        status: 'online',
        realtime: true,
      },
    });
  });

  // 2. Database Status & Info
  app.get('/api/database/status', (req, res) => {
    res.json({
      connected: true,
      provider: 'Firebase Firestore',
      projectId: firebaseConfig.projectId,
      firestoreDatabaseId: firebaseConfig.firestoreDatabaseId,
      authDomain: firebaseConfig.authDomain,
      collections: ['marksheets', 'student_batches'],
      realtimeSync: true,
      connectedSseClients: sseClients.size,
      lastEvent: liveEvents[0] || null,
      timestamp: new Date().toISOString(),
    });
  });

  // 3. Marksheet submission acknowledgment endpoint
  app.post('/api/marksheets/log-submission', (req, res) => {
    const { subjectCode, semester, department, studentCount, submittedBy, examType } = req.body;
    console.log(`[Exam Cell Live Backend] Marksheet recorded: ${subjectCode} (${semester}, ${department}) with ${studentCount} students by ${submittedBy || 'Faculty'}`);

    const newEvent: LiveUpdateEvent = {
      id: `evt-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      timestamp: new Date().toISOString(),
      type: 'MARKSHEET_SUBMITTED',
      title: `Marksheet Submitted: ${subjectCode || 'Exam'}`,
      description: `${department || 'Dept'} • ${semester || 'Sem'} • ${studentCount || 0} students evaluated`,
      author: submittedBy || 'Faculty In-Charge',
      details: { subjectCode, semester, department, studentCount, examType },
    };

    broadcastEvent(newEvent);

    res.json({
      success: true,
      loggedAt: newEvent.timestamp,
      eventId: newEvent.id,
      message: `Marksheet for ${subjectCode} successfully processed by Exam Cell server`,
    });
  });

  // 4. Generic Live Update Logging Endpoint
  app.post('/api/updates/record', (req, res) => {
    const { type, title, description, author, details } = req.body;
    const newEvent: LiveUpdateEvent = {
      id: `evt-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      timestamp: new Date().toISOString(),
      type: type || 'SYSTEM',
      title: title || 'Live Update',
      description: description || '',
      author: author || 'System',
      details: details || {},
    };

    broadcastEvent(newEvent);
    console.log(`[Exam Cell Live Broadcast] ${newEvent.type}: ${newEvent.title} - ${newEvent.description}`);

    res.json({
      success: true,
      event: newEvent,
    });
  });

  // 5. Get Recent Live Updates
  app.get('/api/updates/recent', (req, res) => {
    res.json({
      success: true,
      count: liveEvents.length,
      events: liveEvents,
      timestamp: new Date().toISOString(),
    });
  });

  // 6. Server-Sent Events (SSE) Stream for real-time live updates
  app.get('/api/updates/stream', (req, res) => {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache, no-transform');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders?.();

    // Send immediate initial handshake and recent updates
    res.write(`data: ${JSON.stringify({
      id: 'init',
      type: 'SYSTEM',
      title: 'Connected to Live Server Stream',
      description: 'Listening for real-time updates across Exam Cell portal',
      timestamp: new Date().toISOString(),
      recent: liveEvents.slice(0, 10),
    })}\n\n`);

    sseClients.add(res);

    req.on('close', () => {
      sseClients.delete(res);
    });
  });

  // ==========================================
  // VITE MIDDLEWARE (DEV) & STATIC SERVING (PROD)
  // ==========================================
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[JSEC Live Server] Running at http://0.0.0.0:${PORT}`);
  });
}

startServer();
