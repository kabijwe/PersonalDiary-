#!/usr/bin/env bash
set -euo pipefail
DATA_DIR="$HOME/.local/share/kabijwe"
mkdir -p "$DATA_DIR"; chmod 700 "$DATA_DIR"
LAN_IP="$(ip -4 route get 1.1.1.1 2>/dev/null | awk '{for(i=1;i<=NF;i++) if($i=="src"){print $(i+1); exit}}')"
if [[ -z "$LAN_IP" ]]; then echo "Connect to Wi-Fi/Ethernet and retry."; exit 1; fi
if [[ -e "$DATA_DIR/ca.key" ]]; then echo "Existing CA found; refusing to overwrite it."; exit 1; fi
umask 077
openssl req -x509 -newkey rsa:3072 -sha256 -days 3650 -nodes -keyout "$DATA_DIR/ca.key" -out "$DATA_DIR/ca.crt" -subj "/CN=Kabijwe Diary Local CA" -addext "basicConstraints=critical,CA:TRUE" -addext "keyUsage=critical,keyCertSign,cRLSign"
openssl req -new -newkey rsa:3072 -nodes -keyout "$DATA_DIR/server.key" -out "$DATA_DIR/server.csr" -subj "/CN=kabijwe.local"
cat > "$DATA_DIR/server.ext" <<EOF
basicConstraints=critical,CA:FALSE
keyUsage=critical,digitalSignature,keyEncipherment
extendedKeyUsage=serverAuth
subjectAltName=DNS:kabijwe.local,IP:$LAN_IP,IP:127.0.0.1
EOF
openssl x509 -req -in "$DATA_DIR/server.csr" -CA "$DATA_DIR/ca.crt" -CAkey "$DATA_DIR/ca.key" -CAcreateserial -out "$DATA_DIR/server.crt" -days 825 -sha256 -extfile "$DATA_DIR/server.ext"
chmod 600 "$DATA_DIR/ca.key" "$DATA_DIR/server.key"; chmod 644 "$DATA_DIR/ca.crt" "$DATA_DIR/server.crt"
rm -f "$DATA_DIR/server.csr" "$DATA_DIR/server.ext" "$DATA_DIR/ca.srl"
echo "LAN address: $LAN_IP"
echo "Install this CA certificate on each phone: $DATA_DIR/ca.crt"
echo "Then open: https://$LAN_IP:8443"
