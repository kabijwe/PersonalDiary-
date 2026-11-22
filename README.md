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
- Diary entries with private/draft/public-intent labels, search and filtering; every post opens as a full Letterhead reading page with its saved context snapshot
- Poetry and writing collection
- Personal calendar events (Gregorian calendar view)
- Six-season overview (rough Gregorian-month approximation)
- Live Nepal clock and a single sunrise-to-sunset curve with a moving current-time marker
- Optional, user-initiated GPS location, reverse-geocoded place name, GPS altitude/accuracy when supplied by the device, and current weather via Open-Meteo
- Expanded immutable per-post time-context snapshots: Nepal time, AD/BS date, weekday/week, Panchang fields and end times, rashis, lunar month, ayana, ghadi-pala, sunrise/sunset, season, coordinates, altitude/accuracy, temperature, feels-like temperature, humidity, wind and weather update time
- Timestamped local location history for each successful GPS fix and manual place change, including coordinates and later-enriched place/weather details; records are exportable with the local JSON backup
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
- Season boundaries follow the traditional two-BS-month Nepali grouping; descriptive text is educational, not a local weather forecast.
- The time card requests GPS only after the user taps its location button. Sunrise/sunset use an approximate NOAA solar calculation for the returned coordinates; weather comes from Open-Meteo and place names from BigDataCloud reverse geocoding. These external services require an internet connection.
- Weather and reverse-geocoding requests send the chosen coordinates to Open-Meteo and BigDataCloud respectively. Do not enable location unless you are comfortable sharing it with those services.
- Time-card GPS is requested only after the user taps its GPS button. Every GPS button request is timestamped, including denied, failed or unsupported attempts; successful GPS fixes and each manual place change also store coordinates in local location history. GPS altitude/accuracy are stored only if the device/browser supplies them. A historical map-plotting screen is a planned follow-up, not included yet.
- Letterpad print-to-PDF uses the browser/device print dialog. Font rendering depends on installed/available fonts and internet access for Google Fonts.
- Photos are embedded in browser storage as data URLs and limited to 2 MB for memory images / 3 MB for letterpad artwork. Browser storage can be cleared by the operating system or user.

## Privacy and backup
Use Settings → Export regularly. Keep backup JSON files somewhere safe. Do not use this prototype to store highly sensitive personal information. Local browser storage is not equivalent to encrypted private storage.

## Next production milestones
1. Inspect and integrate the existing `~/Documents/kabijwe` project rather than replacing its backend blindly.
2. Keep storage strictly local-first; add local backup/restore validation and storage safeguards (no cloud sync or cloud-provider backups).
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
| Weather | Open-Meteo Forecast API | Current conditions, daily minimum/maximum, rain probability, wind direction/gusts, pressure, dew point, visibility and sunrise/sunset. |
| Air quality / UV | Open-Meteo Air Quality API | US AQI, PM2.5 and hourly UV; shown when the service provides data. |
| Place name (GPS only) | BigDataCloud free client-side reverse geocoding | No key; called only for the live GPS fix requested by the user. Locality, city and province; ward only if returned. |

**Location & privacy**: GPS is requested only when the user presses the GPS button. No background tracking. If denied, the previous location stays and a manual list of Nepali towns is available; the card always says whether the place is GPS, manual, or the Kathmandu default. The latest successful GPS fix or manual choice is remembered locally (`kabijwe.location`); there is no background tracking.

**Limitations (honest list)**
- Trisambat's live response could not be fetched from the build environment; the parser follows the schema used by the earlier working build (`days[].ad`, `days[].bs.{year,month,day}`) and is covered by a mocked test only. Verify on your phone once online.
- The engine's tithi/nakshatra end times matched printed drik panchang values within ~1–3 minutes in tests; Nepal's official calendar can differ by a few minutes or in leap-month handling. Do not use it for religious timing decisions without checking the official Panchang.
- संवत्सर is not shown (no verified source). Adhika masa is not detected.
- Sunrise ignores elevation (hills sunrise earlier).
- Run the app over `http://localhost` or HTTPS for service worker and GPS.

Tests: `node tests/engine.test.js`, `node tests/ui.test.js` (needs Playwright). See `TEST_REPORT.md`.

## डायरी Letterhead र समयको अनुभूति snapshot

हरेक डायरी/कविता पोस्ट सुरक्षित गर्दा त्यसबेलाको context object पोस्टमै snapshot का रूपमा राखिन्छ। डायरी सूची, गृहपृष्ठका हालका पोस्ट र कविता सूचीबाट पोस्ट खोल्दा Letterhead पढ्ने दृश्य खुल्छ; त्यसमा लेख, हस्ताक्षर र उपलब्ध समय/पञ्चाङ्ग/स्थान/मौसम विवरण देखिन्छ। Print/PDF पनि यही पोस्ट Letterhead बाट गर्न सकिन्छ। पुराना पोस्टमा पहिले सुरक्षित भएका सीमित विवरण मात्र देखिन्छन्; पुरानो डेटा अनुमान गरेर भरिँदैन।

Snapshot मा नेपाल समय, AD/BS मिति, बार/हप्ता, तिथि/पक्ष/समाप्ति, नक्षत्र/पाद/समाप्ति, योग/करण, चन्द्र/सूर्य राशि, चन्द्रमास, अयन, घडी-पला, सूर्योदय/सूर्यास्त, ऋतु, स्थानको नाम/स्रोत/निर्देशाङ्क, GPS altitude/accuracy (उपलब्ध भएमा), तापक्रम, महसुस हुने तापक्रम, मौसम अवस्था, आर्द्रता, हावाको गति र मौसम अद्यावधिक समय समावेश हुन्छन्। उपलब्ध नभएका मानहरू खाली वा स्पष्ट रूपमा अनुपलब्ध देखाइन्छन्।

### स्थान इतिहास

हरेक सफल GPS fix र हातले छानेको स्थान परिवर्तनलाई छुट्टै timestamp, latitude/longitude, स्रोत, उपलब्ध altitude/accuracy सहित स्थानीय `locationHistory` मा राखिन्छ। reverse-geocoding वा मौसम पछि आएमा सोही location record मा विवरण थपिन्छ; event को मूल timestamp जस्ताको तस्तै रहन्छ। इतिहास JSON export मा समावेश हुन्छ। भविष्यको चरणमा यही रेकर्डहरूलाई नक्सामा plot गर्ने UI थपिनेछ। GPS ले altitude नदिएमा मान अनुमान गरिँदैन।

### API स्रोतहरू
- **Bikram Sambat + तिथि**: [Trisambat](https://trisambat.com) (`/api/v1/ad/{year}/{month}.json`) — attribution आवश्यक, beta feed।
- **विस्तृत पञ्चाङ्ग** (तिथि, नक्षत्र, योग, करण, राशि): `panchang.js` को स्थानीय खगोलीय गणना।
- **मौसम**: Open-Meteo
- **स्थान नाम**: OpenStreetMap Nominatim
- **सूर्योदय/सूर्यास्त**: `panchang.js` (छानिएको स्थानको निर्देशाङ्कबाट)।

Production मा API licensing जाँच गर्नुहोस्।


## Local HTTPS for phone GPS (LAN only)

The repository includes `https-local.sh` and `https_server.py`. On Kali/Linux, install `mkcert` and `libnss3-tools` first, then run:

```bash
cd ~/Projects/PersonalDiary
bash https-local.sh
```

The helper detects the current LAN IPv4 address, creates a local certificate for localhost and that LAN IP, and binds the HTTPS server only to the detected LAN interface at `https://<LAN-IP>:8443`. Certificates and private keys are kept in the ignored `.certs/` folder and must never be committed or shared.

For phone GPS, the phone must trust the local mkcert root certificate. Find it with `mkcert -CAROOT` (file `rootCA.pem`), transfer that public root certificate to the phone over USB, then install it as a CA certificate (Firefox desktop: Settings → Privacy & Security → Certificates → View Certificates → Authorities → Import; Android: Settings → Security → Encryption & credentials → Install a certificate → CA certificate; iOS: install the downloaded profile and enable full trust under Certificate Trust Settings). Browser menus differ by device. If the LAN IP changes, stop the server and rerun the helper to regenerate the certificate. Keep the server on a trusted private Wi-Fi network.

This HTTPS helper is for local LAN use; it does not publish the diary or expose a cloud backend. A self-signed certificate that the phone does not trust will still cause browser warnings and may block geolocation.
