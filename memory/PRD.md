# Device Manager Pro — PRD

## Original Problem Statement
Build a cross-platform (Android + iOS) phone cleaner, storage organizer & optimizer app
called **Device Manager Pro**, styled after an Avast-style green cleaner (from 5 user-provided
screenshots). Feature reality differs per platform due to sandboxing — position iOS as a
"Photo & Storage Organizer + Vault + AI Health Score" app. Keep all metrics honest (no fake
RAM/CPU boost). Every delete has a 7-day trash/undo safety net.

## Tech Architecture
- **Frontend:** Expo React Native (SDK 54) + expo-router file-based routing, react-native-svg
  gauges/donut, reanimated animations, expo-media-library (real photo scan), expo-file-system
  (real storage), expo-battery, expo-device, expo-local-authentication (vault biometric).
- **Backend:** FastAPI + MongoDB (motor). Device-scoped via locally-generated `device_id`
  (no login). Models use clean JSON (no `_id` leakage), UTC ISO timestamps.
- **State/UI:** AppProvider (premium flag + toast), theme tokens from design_guidelines.json
  (Avast green #38A845, white cards on light-grey, pill buttons, circular icon chips).

## User Personas
- Everyday phone owner low on storage who wants a one-tap clean + duplicate photo removal.
- Privacy-conscious user wanting a locked vault and honest security posture.

## Core Requirements (static)
- Health-score dashboard, junk clean-up with undo, duplicate photo finder, storage analyzer,
  app manager, privacy cleaner, security scan, file vault, trash/recovery, premium paywall.
- Honest metrics; 7-day trash before permanent delete; contextual permission handling.

## Updated (2026-08-16, iteration 3 — free + responsive + real access)
- **Premium removed — everything is free.** Deleted all paywall gates: duplicate-scan cap,
  compressor cap, Vault premium wall, Auto-Pilot gate, "Go Premium" tool tile + PRO badges,
  Settings premium banner (now an "All tools unlocked" banner). `premium` is always true.
- **Responsive on all devices:** content is centered with a `maxContentWidth` (640) across every
  screen, so phones stay full-width while tablets/large screens no longer stretch cards.
- **Real device access:** photos via expo-media-library (duplicate finder, compressor, offload),
  storage via expo-file-system, battery via expo-battery, and **real files via expo-document-picker**
  (Vault "Add files" now imports actual photos/documents from the device). Sample data is used only
  in web preview / when permission isn't granted (clearly labelled).

## Implemented (2026-08-16, iteration 2 — new features)
- **Photo Compressor** (`/compress`): scans largest photos, live "estimated savings" that
  updates with selection + compression level (High/Balanced/Max), real on-device compression via
  expo-image-manipulator (native) with graceful fallback, saves compressed copy, moves originals
  to 7-day Trash, shows "space saved" summary. Free tier capped at 10 → paywall.
- **Smarter AI Doctor** (`/api/ai-tip`): genuine LLM tip (Emergent key, gpt-5.4-mini) personalized
  to real device metrics, cached once per device per day, honest (no fake boost claims), with a
  rule-based fallback when offline/no key. Home tip card shows an "AI" badge.
- **Cloud Offload** (`/offload`): flags photos untouched 6+ months, shows total reclaimable size,
  "Open cloud backup" deep-link + "Free space" moves to 7-day Trash.
- Fixed: `POST /api/trash` no longer 422s when items omit per-item `device_id` (injected from
  request) — this had silently blocked persistence for duplicate/compress/offload flows.
- Backend tests now 18/18 passing (added AI-tip fallback + cache tests).

## Implemented (2026-08-16)
- Onboarding (3 slides) + persisted flag.
- Bottom tabs: Home, Tools, Vault, Settings.
- Home Dashboard: animated SVG health-score gauge (real signals: storage%, junk est,
  duplicate count, battery), AI tip card + "storage full in ~X days" prediction (backend),
  4 quick-action cards, tools row, pull-to-refresh, scans saved to backend.
- Clean Up: freeable estimate, category checkboxes, animated clean → "space freed" summary.
- Duplicate Photo Finder: real expo-media-library scan (burst/similar grouping) with graceful
  sample-photo fallback + full permission contract (allow/settings/preview), smart "select all
  except best", move-to-trash (backend), free-tier 50-photo cap → paywall.
- Storage Analyzer: donut chart + legend + large-files list.
- App Manager: sortable (largest/unused/A–Z), multi-select, export via Share, uninstall intent.
- Privacy Cleaner: checklist + animated Privacy Sweep (honest scope note).
- Security: animated scan with records + protection toggles + honest disclaimer.
- Optimise: per-task "Go" + Optimise-all, score bump.
- File Vault: premium-gated, biometric unlock, add/remove encrypted items (backend).
- Trash: 7-day countdown, restore/delete (backend auto-purges expired).
- Paywall: monthly/yearly plans, unlocks premium (demo flag).
- Settings: Auto-Pilot toggle + schedule (premium-gated), notifications, prefs persisted.
- Backend endpoints: /scans, /dashboard, /prefs, /trash(+restore), /vault. 16/16 pytest pass.
- Fixed: web-safe haptics wrapper (was blocking clean/dup/security/privacy/optimise completions).

## Backlog / Remaining
- **P1:** Real in_app_purchase / RevenueCat billing (currently demo premium flag).
- **P1:** Image compression engine (bulk compress → save to Photos, keep original in trash).
- **P2:** Cloud offload suggestions (flag 6-month-old media, deep-link to Photos backup).
- **P2:** Battery diagnostics detail (charging pattern log, per-app ranking).
- **P2:** Android OEM startup-manager deep links; iOS "Clear this app's cache" platform split.
- **P2:** Firebase analytics/crashlytics; ATT prompt before ad SDK; local notifications for Auto-Pilot.

## Next Tasks
1. Wire real subscriptions (RevenueCat) behind the paywall.
2. Build the image compression module.
3. Add AI-generated daily tips (LLM) to the Phone Doctor.
