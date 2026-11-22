#!/usr/bin/env python3
"""Private LAN server for Kabijwe Diary. HTTPS is mandatory."""
import argparse,base64,hashlib,hmac,json,os,sqlite3,ssl,time,socket
from contextlib import closing
from http.server import SimpleHTTPRequestHandler,ThreadingHTTPServer
from pathlib import Path
from urllib.parse import urlparse
ROOT=Path(__file__).resolve().parent
DATA=Path.home()/".local"/"share"/"kabijwe"
DB=DATA/"diary.sqlite3"; AUTH=DATA/"auth.json"; MAX_BODY=50*1024*1024
FAILURES={}
def db_conn():
 DATA.mkdir(parents=True,exist_ok=True); os.chmod(DATA,0o700)
 con=sqlite3.connect(DB,timeout=15); con.execute("PRAGMA journal_mode=WAL"); con.execute("PRAGMA synchronous=FULL")
 con.execute("CREATE TABLE IF NOT EXISTS diary_state(id INTEGER PRIMARY KEY CHECK(id=1),revision INTEGER NOT NULL,payload TEXT NOT NULL,updated_at TEXT NOT NULL)")
 con.commit()
 if DB.exists(): os.chmod(DB,0o600)
 return con
def authorized(header):
 if not AUTH.exists(): return False
 try:
  scheme,token=header.split(" ",1)
  if scheme.lower()!="basic": return False
  username,password=base64.b64decode(token,validate=True).decode().split(":",1)
  cfg=json.loads(AUTH.read_text())
  if not hmac.compare_digest(username,cfg["username"]): return False
  actual=hashlib.scrypt(password.encode(),salt=bytes.fromhex(cfg["salt"]),n=2**14,r=8,p=1,dklen=32)
  return hmac.compare_digest(actual,bytes.fromhex(cfg["hash"]))
 except Exception: return False
class Handler(SimpleHTTPRequestHandler):
 server_version="KabijweLAN/1.0"
 def __init__(self,*args,**kwargs): super().__init__(*args,directory=str(ROOT),**kwargs)
 def log_message(self,fmt,*args): print("%s - request"%self.client_address[0])
 def end_headers(self):
  self.send_header("X-Content-Type-Options","nosniff"); self.send_header("Referrer-Policy","no-referrer")
  self.send_header("X-Frame-Options","DENY"); self.send_header("Cache-Control","no-store"); super().end_headers()
 def require_auth(self):
  ip=self.client_address[0]; now=time.time(); recent=[t for t in FAILURES.get(ip,[]) if now-t<900]; FAILURES[ip]=recent
  if len(recent)>=12: self.send_error(429,"Too many authentication attempts"); return False
  if not authorized(self.headers.get("Authorization","")):
   recent.append(now); FAILURES[ip]=recent; self.send_response(401)
   self.send_header("WWW-Authenticate",'Basic realm="Kabijwe Diary", charset="UTF-8"')
   self.send_header("Content-Length","0"); self.end_headers(); return False
  FAILURES.pop(ip,None); return True
 def send_json(self,code,payload):
  body=json.dumps(payload,ensure_ascii=False,separators=(",",":")).encode()
  self.send_response(code); self.send_header("Content-Type","application/json; charset=utf-8")
  self.send_header("Content-Length",str(len(body))); self.end_headers(); self.wfile.write(body)
 def do_GET(self):
  path=urlparse(self.path).path
  if path=="/api/health": return self.send_json(200,{"ok":True,"service":"kabijwe-lan","https":True})
  if path=="/api/state":
   if not self.require_auth(): return
   with closing(db_conn()) as con: row=con.execute("SELECT revision,payload,updated_at FROM diary_state WHERE id=1").fetchone()
   if row is None: return self.send_json(200,{"initialized":False,"revision":0,"state":None})
   return self.send_json(200,{"initialized":True,"revision":row[0],"state":json.loads(row[1]),"updatedAt":row[2]})
  return super().do_GET()
 def do_PUT(self):
  if urlparse(self.path).path!="/api/state": return self.send_error(404)
  if not self.require_auth(): return
  try:
   length=int(self.headers.get("Content-Length","0"))
   if length<=0 or length>MAX_BODY: return self.send_error(413,"Payload too large or empty")
   request=json.loads(self.rfile.read(length)); revision=request.get("revision"); state=request.get("state")
   if not isinstance(revision,int) or not isinstance(state,dict): return self.send_error(400,"Expected revision and state object")
   for key in ("entries","events","memories","templates","locationHistory","reminders"):
    if key in state and not isinstance(state[key],list): return self.send_error(400,"Invalid state field: "+key)
   for key in ("entries","events","memories","templates","locationHistory","reminders"): state.setdefault(key,[])
   state.setdefault("settings",{})
   payload=json.dumps(state,ensure_ascii=False,separators=(",",":")); stamp=time.strftime("%Y-%m-%dT%H:%M:%SZ",time.gmtime())
   with closing(db_conn()) as con:
    con.execute("BEGIN IMMEDIATE"); row=con.execute("SELECT revision FROM diary_state WHERE id=1").fetchone()
    current=row[0] if row else 0
    if revision!=current:
     con.rollback(); return self.send_json(409,{"error":"revision_conflict","revision":current,"message":"Another device saved newer data. Reload before saving again."})
    next_revision=current+1
    con.execute("INSERT INTO diary_state(id,revision,payload,updated_at) VALUES(1,?,?,?) ON CONFLICT(id) DO UPDATE SET revision=excluded.revision,payload=excluded.payload,updated_at=excluded.updated_at",(next_revision,payload,stamp))
    con.commit()
   os.chmod(DB,0o600); return self.send_json(200,{"ok":True,"revision":next_revision,"updatedAt":stamp})
  except (ValueError,json.JSONDecodeError): return self.send_error(400,"Invalid JSON")
  except Exception: return self.send_error(500,"Storage error")
 def do_POST(self): return self.send_error(405,"Method not allowed")
def main():
 p=argparse.ArgumentParser(); p.add_argument("--host",default=None,help="Defaults to the active LAN IPv4 address"); p.add_argument("--port",type=int,default=8443)
 p.add_argument("--cert",default=str(DATA/"server.crt")); p.add_argument("--key",default=str(DATA/"server.key")); a=p.parse_args()
 
 if a.host is None:
  probe=socket.socket(socket.AF_INET,socket.SOCK_DGRAM)
  try: probe.connect(("1.1.1.1",80)); a.host=probe.getsockname()[0]
  except OSError: raise SystemExit("Could not detect active LAN address. Connect to Wi-Fi/Ethernet.")
  finally: probe.close()
 cert,key=Path(a.cert),Path(a.key)
 if not cert.is_file() or not key.is_file(): raise SystemExit("TLS certificate missing. Run: bash setup_tls.sh")
 if not AUTH.is_file(): raise SystemExit("Login not configured. Run: python3 setup_auth.py")
 DATA.mkdir(parents=True,exist_ok=True); os.chmod(DATA,0o700)
 server=ThreadingHTTPServer((a.host,a.port),Handler); ctx=ssl.SSLContext(ssl.PROTOCOL_TLS_SERVER)
 ctx.minimum_version=ssl.TLSVersion.TLSv1_2; ctx.load_cert_chain(certfile=str(cert),keyfile=str(key))
 server.socket=ctx.wrap_socket(server.socket,server_side=True)
 print("Kabijwe Diary HTTPS listening on https://%s:%s"%(a.host,a.port)); print("Data directory:",DATA)
 print("Do not configure router port forwarding.")
 try: server.serve_forever()
 except KeyboardInterrupt: print("\nStopping Kabijwe Diary.")
 finally: server.server_close()
if __name__=="__main__": main()
