#!/usr/bin/env python3
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
import ssl
from pathlib import Path

ROOT = Path(__file__).resolve().parent
CERT = ROOT / ".certs" / "diary.pem"
KEY = ROOT / ".certs" / "diary-key.pem"
if not CERT.is_file() or not KEY.is_file():
    raise SystemExit("HTTPS प्रमाणपत्र भेटिएन। पहिले bash https-local.sh चलाउनुहोस्।")

class LocalOnlyHandler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(ROOT), **kwargs)

server = ThreadingHTTPServer(("0.0.0.0", 8443), LocalOnlyHandler)
context = ssl.SSLContext(ssl.PROTOCOL_TLS_SERVER)
context.minimum_version = ssl.TLSVersion.TLSv1_2
context.load_cert_chain(CERT, KEY)
server.socket = context.wrap_socket(server.socket, server_side=True)
print("Kabijwe Diary HTTPS: https://localhost:8443  (LAN: https://<LAN-IP>:8443)")
print("Stop with Ctrl+C. Use only on a trusted private network.")
try:
    server.serve_forever()
except KeyboardInterrupt:
    print("\nHTTPS server stopped.")
finally:
    server.server_close()
