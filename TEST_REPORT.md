# Kabijwe v8 — test report (2026-11-21)

Run: `node tests/engine.test.js` (26 checks) and `node tests/ui.test.js` (43 checks, Chromium via Playwright, mocked network, timezone Asia/Kathmandu, mobile 390×844).

## Passed
- Engine vs known events: new/full moon instants (7 events, ≤1 min), tithi end times for Amavasya 2025-10-21, Dashami 2025-10-02, Purnima 2025-03-14, Chaturdashi 2025-02-27 (within 1–2 min of printed values), Lahiri ayanamsa 2026, Mesha sankranti 2026.
- Sunrise/sunset vs independent NOAA algorithm: 4 places × 5 dates, worst 0.76 min.
- Ghadi–pala arithmetic, before-sunrise continuation from yesterday's sunrise.
- UI: Nepali clock/weekday/AD date, BS date, tithi+paksha, nakshatra+pada, yoga, karana, rashis, lunar month, ayana, season, single sun curve, no horizontal scroll, GPS denied (Panchang stays, labelled default), GPS granted (labelled GPS), manual location (persisted, sunrise changes), diary create/edit/search/export/import, Letterhead post view with context detail grid, timestamped GPS location-history record, Letterpad preview + saved template, all page navigation, service worker v8 (no API caching), offline state (estimate labelled, retry visible, weather honest), Nepal-midnight rollover, diary default date in Nepal time.

## Not verified
- This change set has been statically syntax-checked through the GitHub file content, but the browser/Playwright suite has not been executed in the user's Termux environment yet.
- Historical location records are stored with coordinates for a future map view; map plotting UI is not part of this change.
- **Live Trisambat and Open-Meteo responses**: the build sandbox could not reach them. UI tests used a mock in the Trisambat schema; BS-date correctness against the real feed must be checked on your phone.
- Tantrakulam API: documentation unreachable and licence requires a paid plan for production; removed.
- Local BS *estimate* could not be validated against official calendar data (±1 day possible) and is always labelled "अनुमानित".
- Real-device Android/GPS and installed-PWA update flow.
