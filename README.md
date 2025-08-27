# CarAssure Inspections — Standalone Web App

Create and share **car inspection reports** (web link + PDF) with photos, notes, and ratings.

## Features
- Mobile-friendly **New Inspection** form with predefined items (Exterior, Interior, Engine, etc.)
- Upload photos for each item
- Auto-generates a **shareable web report**: `/inspections/:id/report`
- **Download PDF** via headless Chrome (Puppeteer)
- Uses **SQLite** (embedded) — zero setup
- Clean, professional dark UI

## Quick Start
```bash
# 1) Install Node.js 18+
# 2) Unzip this folder, then:
npm install
cp .env.example .env
# (optional) set PORT or BASE_URL in .env
npm start
# open http://localhost:3000
```

## How it works
- On first run, SQLite schema is created automatically (`data.sqlite`)
- Go to **New Inspection** → fill in customer + vehicle + ratings + notes + photos → **Save & View Report**
- Share the report URL with your client or export the **PDF**

## Customization
- Edit default inspection items in `server.js` (`DEFAULT_ITEMS` array)
- Modify report layout in `views/report.ejs`
- Update brand styles in `public/css/styles.css`
- Add fields to the form and DB:
  - Extend the `inspections` table in `db.js`
  - Add inputs in `views/new_inspection.ejs`
  - Render in `views/report.ejs`

## Deploy
- **Self-host** on a VPS (Ubuntu) with `pm2` + `nginx`
- Or use **Railway**, **Render**, or **Fly.io**
- Set `BASE_URL` env var if behind a reverse proxy for accurate PDF generation

## Notes
- Puppeteer downloads a compatible Chromium on `npm install`. On some servers, you may need extra packages (e.g., `apt-get install -y libatk1.0-0 libnss3 ...`).
- For S3 or CDN image storage, replace Multer's destination with an S3 upload and store public URLs in `photo_path`.

---

Built for CarAssure. Enjoy!
