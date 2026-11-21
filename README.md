# Kabijwe — My Living Diary

A mobile-first, installable PWA starter for a Nepali-first personal diary and literary journal.

## Run locally
No build step or package installation is required.

### Option A: Python
```bash
cd kabijwe
python3 -m http.server 8000
```
Open `http://localhost:8000`.

### Option B: Node
```bash
npx serve .
```

For PWA installation and service-worker offline caching, use localhost or HTTPS (not `file://`).

## Included in this starter
- Responsive mobile and desktop interface
- Diary entries with private/draft/public-intent labels, search and filtering
- Poetry and writing collection
- Personal calendar events (Gregorian calendar view)
- Six-season overview (rough Gregorian-month approximation)
- Live Nepal clock and a single sunrise-to-sunset curve with a moving current-time marker
- Optional, user-initiated GPS location, reverse-geocoded place name and current weather via Open-Meteo
- Letterpad Studio with live preview, image, colours, page size, saved templates and print-to-PDF
- Memories with optional image and explicit geolocation permission
- Local JSON export/import
- Dark mode and basic settings
- PWA manifest and service worker shell caching

## Important limitations — read before using
This is a functional **local-first prototype**, not a deployed production service.
- Entries are stored in the browser's localStorage. They do not sync between devices or accounts.
- There is no server, user authentication, encrypted private storage, public publishing backend, cloud backup or multi-user access control.
- A "public" entry is only marked as intended for publication; it is not actually published to the internet.
- The calendar currently displays Gregorian dates. It does **not** claim BS conversion. A verified Bikram Sambat calendar dataset/library must be integrated and tested before displaying accurate BS dates.
- Season display is a rough Gregorian-month approximation, not an authoritative Nepali season calendar.
- The time card requests GPS only after the user taps its location button. Sunrise/sunset use an approximate NOAA solar calculation for the returned coordinates; weather comes from Open-Meteo and place names from OpenStreetMap Nominatim. These external services require an internet connection.
- Weather and reverse-geocoding requests send the chosen coordinates to Open-Meteo and OpenStreetMap respectively. Do not enable location unless you are comfortable sharing it with those services.
- Geolocation is requested only when the user taps "मेरो स्थान थप्नुहोस्". The saved memory stores coordinates as text; it does not expose a live map.
- Letterpad print-to-PDF uses the browser/device print dialog. Font rendering depends on installed/available fonts and internet access for Google Fonts.
- Photos are embedded in browser storage as data URLs and limited to 2 MB for memory images / 3 MB for letterpad artwork. Browser storage can be cleared by the operating system or user.

## Privacy and backup
Use Settings → Export regularly. Keep backup JSON files somewhere safe. Do not use this prototype to store highly sensitive personal information. Local browser storage is not equivalent to encrypted private storage.

## Next production milestones
1. Inspect and integrate the existing `~/Documents/kabijwe` project rather than replacing its backend blindly.
2. Add backend, authentication, server-side authorization, encrypted/private media and cloud sync.
3. Integrate a verified BS/AD conversion dataset and festival data.
4. Implement authoritative Nepali season boundaries.
5. Add weather/maps APIs with protected server-side keys, caching and offline fallbacks.
6. Expand letterpad editor with movable layers, typography controls, crop/rotate, multi-page output and embedded Devanagari fonts.
7. Add automated tests, migrations, backup/restore and security review.

## Mobile check
Open the hosted HTTPS URL on your phone, then use the browser menu's **Add to Home Screen / Install app** option. To test from a computer on the same Wi-Fi, serve on `0.0.0.0` and open the computer's LAN IP from the phone; firewall rules may apply.


## Live Nepal time, date and Panchang (v8)

**Root causes of the missing date/Panchang in earlier builds**
1. Panchang depended on an unverified third-party endpoint (`astro.tantragurukul.org/v1/panchanga`). Its published terms require a Commercial plan for production use, and its response schema could not be verified, so the parser silently left every field as "—". It has been **removed**.
2. The service worker was cache-first for *every* GET, including API calls, so weather/date JSON could be served stale forever. It is now network-first, same-origin only, and never caches API responses (cache `kabijwe-shell-v8`).
3. The old sunrise code returned a time 24 h off in the Nepal morning (UTC-day wrap), breaking the sun marker and ghadi–pala. Replaced.
4. Diary entry dates used the UTC date (wrong before 05:45 Nepal time). Now Nepal time.

**Data sources**
| Item | Source | Notes |
|---|---|---|
| Tithi, paksha, nakshatra, pada, yoga, karana, rashis, lunar month, ayana, end times | `panchang.js` — local astronomical calculation (Meeus, *Astronomical Algorithms*; Lahiri ayanamsa) | Offline, no API key, no licence dependency. Not the official Panchang Nirnayak Samiti calendar. |
| Sunrise / sunset | `panchang.js` (Sun upper limb, −0°50′, sea level) | Uses the selected coordinates. |
| Ghadi–pala | local: 1 ghadi = 24 min, 1 pala = 24 s, counted from the most recent sunrise (before today's sunrise it continues from yesterday's) | |
| Bikram Sambat date | [Trisambat](https://trisambat.com/developers?lang=ne) month file `/api/v1/ad/{YYYY}/{MM}.json` (beta, attribution required) | Response is validated (month 1–12, day 1–32, BS year = AD+56/57), cached 30 days per month in localStorage, retried with timeout. If unavailable and not cached, a local sankranti-based **estimate** is shown, labelled "अनुमानित" (may be ±1 day). |
| Seasons | Traditional Nepali reckoning by BS month: वसन्त चैत–बैशाख, ग्रीष्म जेठ–असार, वर्षा साउन–भदौ, शरद असोज–कात्तिक, हेमन्त मंसिर–पुष, शिशिर माघ–फागुन | |
| Weather | Open-Meteo (timeout, timestamp; stale cache labelled "पुरानो") | |
| Place name (GPS only) | OpenStreetMap Nominatim | |

**Location & privacy**: GPS is requested only when the user presses the GPS button. No background tracking. If denied, the previous location stays and a manual list of Nepali towns is available; the card always says whether the place is GPS, manual, or the Kathmandu default. Only manual choices are remembered (`kabijwe.location`).

**Limitations (honest list)**
- Trisambat's live response could not be fetched from the build environment; the parser follows the schema used by the earlier working build (`days[].ad`, `days[].bs.{year,month,day}`) and is covered by a mocked test only. Verify on your phone once online.
- The engine's tithi/nakshatra end times matched printed drik panchang values within ~1–3 minutes in tests; Nepal's official calendar can differ by a few minutes or in leap-month handling. Do not use it for religious timing decisions without checking the official Panchang.
- संवत्सर is not shown (no verified source). Adhika masa is not detected.
- Sunrise ignores elevation (hills sunrise earlier).
- Run the app over `http://localhost` or HTTPS for service worker and GPS.

Tests: `node tests/engine.test.js`, `node tests/ui.test.js` (needs Playwright). See `TEST_REPORT.md`.

## नयाँ सुविधा — Auto Context Snapshot (मिति / तिथि / मौसम)

जब तपाईं नयाँ डायरी पोस्ट, कविता वा Letterpad ढाँचा सुरक्षित गर्नुहुन्छ, त्यसबेलाको:

- वि.सं. मिति
- तिथि / पक्ष
- स्थान
- मौसम (तापक्रम + अवस्था)
- सूर्योदय / सूर्यास्त (उपलब्ध भएमा)

स्वतः `context` फिल्डमा snapshot को रूपमा सुरक्षित हुन्छ।

यो जानकारी:
- डायरी सूची र हालका पोस्ट कार्डमा देखिन्छ
- Letterpad प्रिभ्यु र प्रिन्टमा माथि सानो मेटा लाइनको रूपमा आउँछ
- JSON export मा पनि रहन्छ

**नोट:** Snapshot त्यसबेलाको UI बाट लिइन्छ। राम्रो नतिजाका लागि पहिले “मेरो स्थान, मौसम र पञ्चाङ्ग हेर्नुहोस्” बटन थिचेर डेटा लोड गर्नुहोस्।

### API स्रोतहरू
- **Bikram Sambat + तिथि**: [Trisambat](https://trisambat.com) (`/api/v1/ad/{year}/{month}.json`) — attribution आवश्यक, beta feed।
- **विस्तृत पञ्चाङ्ग** (तिथि, नक्षत्र, योग, करण, राशि): `panchang.js` को स्थानीय खगोलीय गणना।
- **मौसम**: Open-Meteo
- **स्थान नाम**: OpenStreetMap Nominatim
- **सूर्योदय/सूर्यास्त**: `panchang.js` (छानिएको स्थानको निर्देशाङ्कबाट)।

Production मा API licensing जाँच गर्नुहोस्।
