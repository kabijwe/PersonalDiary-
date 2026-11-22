#!/usr/bin/env python3
"""Encrypted SQLite backups using GPG AES-256."""
import argparse,getpass,os,shutil,sqlite3,subprocess,tempfile,time
from pathlib import Path
DATA=Path.home()/".local"/"share"/"kabijwe"; DB=DATA/"diary.sqlite3"
def gpg(cmd,secret):
 p=subprocess.run(cmd,input=(secret+"\n").encode(),stdout=subprocess.PIPE,stderr=subprocess.PIPE)
 if p.returncode: raise SystemExit("GPG failed: "+p.stderr.decode(errors="replace")[-1000:])
def main():
 ap=argparse.ArgumentParser(); sub=ap.add_subparsers(dest="action",required=True)
 b=sub.add_parser("create"); b.add_argument("--copy-to",help="Mounted USB/offline folder")
 r=sub.add_parser("restore"); r.add_argument("file"); a=ap.parse_args()
 if not shutil.which("gpg"): raise SystemExit("Install GPG: sudo apt install gnupg")
 DATA.mkdir(parents=True,exist_ok=True); os.chmod(DATA,0o700)
 if a.action=="create":
  if not DB.exists(): raise SystemExit("Database does not exist yet.")
  folder=DATA/"backups"; folder.mkdir(exist_ok=True,mode=0o700)
  output=folder/("kabijwe-"+time.strftime("%Y%m%d-%H%M%S")+".sqlite.gpg")
  with tempfile.TemporaryDirectory() as td:
   snapshot=Path(td)/"snapshot.sqlite"; src=sqlite3.connect("file:"+str(DB)+"?mode=ro",uri=True); dst=sqlite3.connect(snapshot)
   src.backup(dst); dst.close(); src.close()
   secret=getpass.getpass("Backup passphrase (store separately): ")
   if len(secret)<14: raise SystemExit("Use at least 14 characters.")
   if secret!=getpass.getpass("Repeat passphrase: "): raise SystemExit("Passphrases do not match.")
   gpg(["gpg","--batch","--yes","--pinentry-mode","loopback","--passphrase-fd","0","--symmetric","--cipher-algo","AES256","--s2k-mode","3","--s2k-digest-algo","SHA512","--output",str(output),str(snapshot)],secret)
  os.chmod(output,0o600); print("Encrypted backup:",output)
  if a.copy_to:
   target=Path(a.copy_to).expanduser()
   if not target.is_dir(): raise SystemExit("Offline destination must be an existing mounted directory.")
   copied=target/output.name; shutil.copy2(output,copied); os.chmod(copied,0o600); print("Offline copy:",copied)
  print("Keep the passphrase separate from both backup copies.")
 else:
  source=Path(a.file).expanduser()
  if not source.is_file(): raise SystemExit("Backup file not found.")
  secret=getpass.getpass("Backup passphrase: ")
  with tempfile.TemporaryDirectory() as td:
   restored=Path(td)/"restore.sqlite"
   gpg(["gpg","--batch","--yes","--pinentry-mode","loopback","--passphrase-fd","0","--output",str(restored),str(source)],secret)
   con=sqlite3.connect(restored); integrity=con.execute("PRAGMA integrity_check").fetchone()[0]; con.close()
   if integrity!="ok": raise SystemExit("Backup integrity failed; current database untouched.")
   if DB.exists():
    old=DB.with_suffix(".sqlite.before-restore"); shutil.copy2(DB,old); os.chmod(old,0o600)
   shutil.copy2(restored,DB); os.chmod(DB,0o600)
  print("Restore complete. Restart the server.")
if __name__=="__main__": main()
