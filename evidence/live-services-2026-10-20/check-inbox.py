"""Find only the unique synthetic notification in the configured sender's inbox."""
import email
import hashlib
import imaplib
import json
import os
from pathlib import Path

folder = Path(__file__).resolve().parent
sent = json.loads((folder / "email-send.json").read_text())
result = {"runId": sent["runId"], "mailbox": "INBOX", "received": False}
client = None
try:
    client = imaplib.IMAP4_SSL("imap.gmail.com", 993, timeout=20)
    client.login(os.environ["GMAIL_USER"], os.environ["GMAIL_APP_PASSWORD"])
    client.select("INBOX", readonly=True)
    status, ids = client.uid("search", None, "SUBJECT", '"' + sent["runId"] + '"')
    if status == "OK" and ids[0]:
        uid = ids[0].split()[-1]
        status, blocks = client.uid("fetch", uid, "(BODY.PEEK[HEADER.FIELDS (SUBJECT MESSAGE-ID DATE)])")
        if status == "OK":
            raw = b"".join(block[1] for block in blocks if isinstance(block, tuple))
            message = email.message_from_bytes(raw)
            result.update({
                "received": sent["runId"] in str(message["Subject"]),
                "uid": uid.decode(),
                "messageIdSha256": hashlib.sha256(str(message["Message-ID"]).encode()).hexdigest(),
                "date": str(message["Date"]),
                "method": "Authenticated IMAP search for the unique run token, followed by read-only headers",
            })
except Exception as error:
    result["errorType"] = type(error).__name__
    result["detail"] = "Inbox verification unavailable. Credentials and unrelated messages are not logged."
finally:
    if client is not None:
        try:
            client.logout()
        except Exception:
            pass
    (folder / "email-inbox.json").write_text(json.dumps(result, indent=2) + "\n")
print(json.dumps(result))
raise SystemExit(0 if result["received"] else 1)
