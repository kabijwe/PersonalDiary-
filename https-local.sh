#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")"
if ! command -v mkcert >/dev/null 2>&1; then
  echo "mkcert भेटिएन। Kali मा mkcert र libnss3-tools स्थापना गरेर पुनः चलाउनुहोस्।"
  exit 1
fi
if ! command -v python3 >/dev/null 2>&1; then
  echo "python3 भेटिएन।"
  exit 1
fi
LAN_IP="$(ip -4 route get 1.1.1.1 2>/dev/null | awk '{for(i=1;i<=NF;i++) if($i=="src"){print $(i+1);exit}}')"
if [ -z "$LAN_IP" ]; then LAN_IP="$(hostname -I 2>/dev/null | awk '{print $1}')"; fi
if [ -z "$LAN_IP" ]; then echo "LAN IPv4 पत्ता लगाउन सकिएन।"; exit 1; fi
mkdir -p .certs
mkcert -install
mkcert -cert-file .certs/diary.pem -key-file .certs/diary-key.pem localhost 127.0.0.1 ::1 "$LAN_IP"
echo ""
echo "=============================================="
echo " KABIJWE DIARY · LOCAL HTTPS"
echo "=============================================="
echo "Computer: https://localhost:8443"
echo "Mobile  : https://$LAN_IP:8443"
echo "Root CA : $(mkcert -CAROOT)/rootCA.pem"
echo "Phone मा Root CA विश्वासयोग्य बनाएपछि GPS चल्छ।"
echo "=============================================="
KABIJWE_LAN_IP="$LAN_IP" python3 https_server.py
