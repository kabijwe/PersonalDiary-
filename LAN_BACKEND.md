# Kabijwe Diary — Private LAN Backend

The shared diary database stays on the Kali laptop. This is not a public cloud service.

## Security model
- HTTPS only (TLS 1.2+). Install the generated local CA certificate on every device.
- HTTP Basic login is protected by HTTPS. Password verifier uses scrypt; plaintext password is never stored.
- SQLite directory permission 0700; database permission 0600.
- API updates use revision checks. A stale device receives HTTP 409 rather than silently overwriting newer data.
- Browser localStorage remains a working/offline cache.
- Backups are encrypted with GPG symmetric AES-256. Keep the passphrase separately.
- The live SQLite file is not independently encrypted. Enable full-disk encryption (LUKS) and lock the Kali account. Encrypted backups are additional protection.

## Setup on Kali
Run from the project directory:

    sudo apt update
    sudo apt install -y openssl gnupg
    bash setup_tls.sh
    python3 setup_auth.py
    python3 server.py

Server port: 8443. Do not configure router port forwarding. Allow this port only from your trusted Wi-Fi subnet in the host firewall. Reserve the laptop IP in router DHCP settings.

The TLS script prints the LAN IP and CA certificate path. First trust ca.crt in the laptop browser too (Firefox: Settings > Privacy & Security > Certificates > View Certificates > Authorities > Import; enable trust for identifying websites). Transfer ca.crt securely to each phone. Android: install as a CA certificate under Security > Encryption & credentials (menu labels vary). iPhone: install the profile, then enable full trust under Certificate Trust Settings. Never transfer ca.key or server.key to a phone.

Open https://LAN-IP:8443 and enter the username/password created by setup_auth.py.

## Preserve and migrate existing browser data
1. Open the old app in the browser/origin that currently contains your diary.
2. Settings > Data management > Export; save kabijwe-backup.json.
3. Start the HTTPS server and open its LAN URL in the laptop browser. Authenticate.
4. Settings > Data management > Import; choose that JSON export and confirm. This initializes the central database without deleting the original browser copy.
5. Open the same HTTPS URL on the phone. It loads the shared database after login.

Do not clear browser storage or delete the original export until both laptop and phone show the expected records.

## Encrypted backup and offline copy
Create an encrypted backup:

    python3 backup.py create

To also copy it to a mounted USB drive:

    python3 backup.py create --copy-to /media/USER/USB_NAME

GPG AES-256 encryption is used. The passphrase is requested interactively and is not stored. Keep it separately from the laptop and USB.

Stop the server with Ctrl+C before restoring. The current database is first preserved as .before-restore:

    python3 backup.py restore /path/to/backup.sqlite.gpg

## Notes
- LAN-only means no router port forwarding, public tunnels or public hosting.
- Optional weather, map tiles and Nepali-date services still need outbound internet. Diary records are sent only to this LAN server.
- This first version uses one owner login. Concurrent revision conflicts are blocked rather than merged; reload before editing after a conflict.
