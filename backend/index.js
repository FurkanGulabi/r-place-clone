const express = require('express');
const cors = require('cors');
const fs = require('fs/promises');
const path = require('path');
const helmet = require('helmet');
const { body, validationResult } = require('express-validator');
const morgan = require('morgan');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3005;

// Configuration
const CONFIG = {
  CANVAS_SIZE: 50,
  COOLDOWN_TIME: 30000,
  BACKUP_INTERVAL: 15 * 60 * 1000, // 15 minutes
  BACKUP_FILE: path.join(__dirname, 'backup.json'),
  COLORS: new Set(['red', 'blue', 'green', 'yellow', 'purple', 'orange', 'pink', 'cyan', 'brown', 'white', 'black', 'gray'])
};

// Security Middlewares
app.use(helmet());
app.use(cors({
  origin: process.env.CORS_ORIGIN || '*',
  methods: ['GET', 'POST']
}));


// Utility Middlewares
app.use(express.json({ limit: '10kb' }));
app.use(morgan('dev'));

// Data Structures
let canvas = new Map();
const userTimestamps = new Map();

// Helpers
const initializeCanvas = () => {
  const newCanvas = new Map();
  for (let x = 0; x < CONFIG.CANVAS_SIZE; x++) {
    for (let y = 0; y < CONFIG.CANVAS_SIZE; y++) {
      newCanvas.set(`${x},${y}`, { x, y, color: 'white' });
    }
  }
  return newCanvas;
};

// Backup System
const loadBackup = async () => {
  try {
    const data = await fs.readFile(CONFIG.BACKUP_FILE, 'utf-8');
    const backup = JSON.parse(data);
    canvas = new Map(backup.map(pixel => [`${pixel.x},${pixel.y}`, pixel]));
    console.log(`[${new Date().toISOString()}] Backup loaded`);
  } catch (err) {
    console.error(`[${new Date().toISOString()}] Initializing new canvas`);
    canvas = initializeCanvas();
  }
};

const saveBackup = async () => {
  try {
    const backup = Array.from(canvas.values());
    await fs.writeFile(CONFIG.BACKUP_FILE, JSON.stringify(backup, null, 2));
    console.log(`[${new Date().toISOString()}] Backup saved`);
  } catch (err) {
    console.error(`[${new Date().toISOString()}] Backup failed:`, err.message);
  }
};

// Initialize and schedule backups
(async () => {
  await loadBackup();
  setInterval(saveBackup, CONFIG.BACKUP_INTERVAL);
})();

// Validation Middleware
const validatePixelPlacement = [
  body('userId').isString().notEmpty(),
  body('x').isInt({ min: 0, max: CONFIG.CANVAS_SIZE - 1 }),
  body('y').isInt({ min: 0, max: CONFIG.CANVAS_SIZE - 1 }),
  body('color').isIn([...CONFIG.COLORS])
];

// Routes
app.get('/canvas', (req, res) => {
  res.json({ canvas: Array.from(canvas.values()) });
});

app.post('/place-pixel', validatePixelPlacement, async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { userId, x, y, color } = req.body;
  const now = Date.now();
  const lastAction = userTimestamps.get(userId) || 0;

  if (now - lastAction < CONFIG.COOLDOWN_TIME) {
    return res.status(429).json({
      error: 'Cooldown active',
      retryAfter: CONFIG.COOLDOWN_TIME - (now - lastAction)
    });
  }

  try {
    const pixelKey = `${x},${y}`;
    canvas.set(pixelKey, { x, y, color });
    userTimestamps.set(userId, now);
    
    res.json({ 
      success: true,
      cooldown: CONFIG.COOLDOWN_TIME
    });
  } catch (err) {
    console.error(`[${new Date().toISOString()}] Pixel placement error:`, err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Error Handling
app.use((err, req, res, next) => {
  console.error(`[${new Date().toISOString()}] Error:`, err.stack);
  res.status(500).json({ error: 'Internal server error' });
});

app.listen(PORT, () => {
  console.log(`[${new Date().toISOString()}] Server running on port ${PORT}`);
});