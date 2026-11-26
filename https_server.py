#!/usr/bin/env python3
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import unquote, urlsplit
import os
import ssl

ROOT = Path(__file__).resolve().parent
CERT = ROOT / ".certs" / "diary.pem"
KEY = ROOT / ".certs" / "diary-key.pem"
if not CERT.is_file() or not KEY.is_file():
    raise SystemExit("HTTPS प्रमाणपत्र भेटिएन। पहिले bash https-local.sh चलाउनुहोस्।")

class LocalOnlyHandler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(ROOT), **kwargs)

    def _is_private_path(self):
        parts = Path(unquote(urlsplit(self.path).path)).parts
        return any(part in {".certs", ".git", ".env"} for part in parts)

    def do_GET(self):
        if self._is_private_path():
            self.send_error(404)
            return
        super().do_GET()

    def do_HEAD(self):
        if self._is_private_path():
            self.send_error(404)
            return
        super().do_HEAD()

    def list_directory(self, path):
        self.send_error(403, "Directory listing is disabled")
        return None

host = os.environ.get("KABIJWE_LAN_IP", "127.0.0.1")
server = ThreadingHTTPServer((host, 8443), LocalOnlyHandler)
context = ssl.SSLContext(ssl.PROTOCOL_TLS_SERVER)
context.minimum_version = ssl.TLSVersion.TLSv1_2
context.load_cert_chain(CERT, KEY)
server.socket = context.wrap_socket(server.socket, server_side=True)
print(f"Kabijwe Diary HTTPS: https://{host}:8443")
print("Private .certs/.git/.env paths are blocked; directory listing is disabled.")
print("Stop with Ctrl+C. Use only on a trusted private network.")
try:
    server.serve_forever()
except KeyboardInterrupt:
    print("\nHTTPS server stopped.")
finally:
    server.server_close()
