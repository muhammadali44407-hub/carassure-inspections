require('dotenv').config();
const express = require('express');
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const { v4: uuidv4 } = require('uuid');
const dayjs = require('dayjs');
const puppeteer = require('puppeteer');
const db = require('./db');
  const expressLayouts = require('express-ejs-layouts');

const app = express();
const PORT = process.env.PORT || 3000;

const expressLayouts = require('express-ejs-layouts');

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

app.use(expressLayouts);
app.set('layout', 'layout');

  app.use(expressLayouts);
  app.set('layout', 'layout');

app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use('/public', express.static(path.join(__dirname, 'public')));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Ensure uploads dir exists
const uploadDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    const unique = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname || '');
    cb(null, unique + ext);
  }
});
const upload = multer({ storage });

const DEFAULT_ITEMS = [
  { section: 'Exterior', label: 'Body & Paint' },
  { section: 'Exterior', label: 'Glass & Mirrors' },
  { section: 'Interior', label: 'Seats & Upholstery' },
  { section: 'Interior', label: 'Dashboard & Controls' },
  { section: 'Engine Bay', label: 'Leaks / Hoses / Belts' },
  { section: 'Suspension', label: 'Front Suspension' },
  { section: 'Suspension', label: 'Rear Suspension' },
  { section: 'Brakes', label: 'Pads / Rotors' },
  { section: 'Tyres', label: 'Tread / Condition' },
  { section: 'Electrical', label: 'Lights / Battery / Alternator' },
  { section: 'Test Drive', label: 'Steering / Transmission' },
  { section: 'Documents', label: 'Service History' }
];

// Home - list inspections
app.get('/', (req, res) => {
  const inspections = db.prepare('SELECT id, created_at, customer_name, vehicle_make, vehicle_model, vehicle_year, rego, status, score FROM inspections ORDER BY created_at DESC').all();
  res.render('list', { inspections, dayjs });
});

// New inspection form
app.get('/inspections/new', (req, res) => {
  res.render('new_inspection', { items: DEFAULT_ITEMS });
});

// Create inspection
const photoFields = DEFAULT_ITEMS.map((_, idx) => ({ name: `photo_${idx}`, maxCount: 1 }));
app.post('/inspections', upload.fields(photoFields), (req, res) => {
  const id = uuidv4();
  const now = dayjs().toISOString();

  const {
    customer_name, customer_email, customer_phone,
    vehicle_make, vehicle_model, vehicle_year,
    vin, rego, odometer, location,
    inspector_name, summary, score
  } = req.body;

  db.prepare(`INSERT INTO inspections
    (id, created_at, customer_name, customer_email, customer_phone, vehicle_make, vehicle_model, vehicle_year, vin, rego, odometer, location, inspector_name, summary, score, status)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
    .run(id, now, customer_name, customer_email, customer_phone, vehicle_make, vehicle_model, vehicle_year, vin, rego, odometer, location, inspector_name, summary, score || null, 'completed');

  // Insert items
  DEFAULT_ITEMS.forEach((it, idx) => {
    const rating = req.body[`rating_${idx}`] || '';
    const notes = req.body[`notes_${idx}`] || '';
    const fileArr = (req.files || {})[`photo_${idx}`] || [];
    const photo_path = fileArr[0] ? `/uploads/${fileArr[0].filename}` : null;
    db.prepare(`INSERT INTO items (inspection_id, section, label, rating, notes, photo_path) VALUES (?, ?, ?, ?, ?, ?)`)
      .run(id, it.section, it.label, rating, notes, photo_path);
  });

  res.redirect(`/inspections/${id}/report`);
});

// View report (web)
app.get('/inspections/:id/report', (req, res) => {
  const id = req.params.id;
  const insp = db.prepare('SELECT * FROM inspections WHERE id = ?').get(id);
  if (!insp) return res.status(404).send('Not found');
  const items = db.prepare('SELECT * FROM items WHERE inspection_id = ? ORDER BY id ASC').all(id);

  // Group by section
  const bySection = {};
  items.forEach(it => {
    if (!bySection[it.section]) bySection[it.section] = [];
    bySection[it.section].push(it);
  });

  res.render('report', { insp, bySection, dayjs });
});

// Export PDF
app.get('/inspections/:id/report.pdf', async (req, res) => {
  const id = req.params.id;
  const insp = db.prepare('SELECT id FROM inspections WHERE id = ?').get(id);
  if (!insp) return res.status(404).send('Not found');

  try {
    const base = process.env.BASE_URL || `${req.protocol}://${req.get('host')}`;
    const url = `${base}/inspections/${id}/report`;
    const browser = await puppeteer.launch({
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    const page = await browser.newPage();
    await page.goto(url, { waitUntil: 'networkidle0' });
    const pdfBuffer = await page.pdf({
      format: 'A4',
      margin: { top: '10mm', bottom: '10mm', left: '10mm', right: '10mm' },
      printBackground: true
    });
    await browser.close();

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="inspection-${id}.pdf"`);
    res.send(pdfBuffer);
  } catch (err) {
    console.error(err);
    res.status(500).send('PDF generation failed. Is Puppeteer installed on this system?');
  }
});

// Health
app.get('/healthz', (req, res) => res.json({ ok: true }));

app.listen(PORT, () => {
  console.log(`CarAssure inspections running on http://localhost:${PORT}`);
});
