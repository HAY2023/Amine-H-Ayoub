# Welcome to Learn Quran Kids

This repository contains the Learn Quran Kids web and Tauri app. Below are quick instructions for publishing the project to GitHub and initial steps for enabling PWA, notifications, and a child-friendly "kiosk" mode.

## Deploy to GitHub

- Create a new repository on GitHub (private or public as you prefer).
- From your project root run:

```
git init
git add .
git commit -m "Initial commit"
git remote add origin <git_repo_url>
git push -u origin main
```

Replace `<git_repo_url>` with the URL shown on GitHub when you create the repo.

## What to add next (recommended)

- Add a `.gitignore` (already included) to avoid committing build outputs and secrets.
- Add PWA support: `manifest.webmanifest` + service worker to enable installable behavior and local notifications.
- Add a server component (or serverless function) to send push notifications to clients.
- Implement a Child Mode (kiosk-like) that locks navigation, requires a PIN to exit, and hides any browser/web indicators.

For detailed automated steps, see the project docs or ask me to continue and I'll add PWA files, service-worker scaffolding, and a basic child-mode implementation.
