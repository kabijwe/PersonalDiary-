#!/usr/bin/env python3
import getpass,hashlib,json,os,secrets
from pathlib import Path
data=Path.home()/".local"/"share"/"kabijwe"
data.mkdir(parents=True,exist_ok=True); os.chmod(data,0o700)
username=input("Kabijwe login username [bikram]: ").strip() or "bikram"
while True:
 password=getpass.getpass("Set a strong password (minimum 14 characters): ")
 if len(password)<14: print("Use at least 14 characters."); continue
 if password!=getpass.getpass("Repeat password: "): print("Passwords do not match."); continue
 break
salt=secrets.token_bytes(16); derived=hashlib.scrypt(password.encode(),salt=salt,n=2**14,r=8,p=1,dklen=32)
path=data/"auth.json"
if path.exists() and input("Replace existing login? type YES: ")!="YES": raise SystemExit("Cancelled.")
path.write_text(json.dumps({"username":username,"salt":salt.hex(),"hash":derived.hex()})); os.chmod(path,0o600)
print("Login created. Password is not stored in plaintext.")
