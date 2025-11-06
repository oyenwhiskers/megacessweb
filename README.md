# MegaCess Web (static UI scaffold)

This repo contains a simple, framework-free Bootstrap UI scaffold for the MegaCess system. It includes a left sidebar with the modules you shared and blank content pages for each section.

## Structure

```
megacessweb/
├─ index.html                 # Dashboard (entry)
├─ assets/
│  ├─ css/style.css          # Theme + layout (sidebar/topbar)
│  └─ js/main.js             # Active nav + mobile sidebar toggle
└─ pages/
	├─ analytics.html
	├─ assign-worker.html
	├─ manage-account.html
	├─ manage-attendance.html
	├─ manage-resources.html
	├─ manage-advance.html
	├─ manage-payroll.html
	└─ manage-payment-rate.html
└─ partials/
	└─ sidebar.html           # Sidebar component (HTML partial loaded via JS)
```

All pages use Bootstrap and Bootstrap Icons via CDN — no other frameworks.

## Run locally (XAMPP)

1. Place this folder under `c:/xampp/htdocs/` as `megacessweb` (already set up).
2. Start Apache in XAMPP.
3. Open: `http://localhost/megacessweb/`.

The sidebar links use absolute paths (`/megacessweb/...`) so navigation works from any page.

## Customize

- Update colors, spacing, and layout in `assets/css/style.css`.
- Add your page content inside each file's `<div class="container-fluid p-4">` section.
- Sidebar links live in `partials/sidebar.html`. Edit once and all pages update.
- If you rename the project folder, update the link paths (search for `/megacessweb/`).

## Notes

- This is a starting point to plug in your real UI and logic. No build step required.
- Tested with Bootstrap 5.3 via CDN.
