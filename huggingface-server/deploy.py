import urllib.request
import json
import sys
import os
TOKEN = os.environ.get("HF_TOKEN")
HEADERS = {"Authorization": f"Bearer {TOKEN}", "Content-Type": "application/json"}

def call_api(url, method="GET", data=None):
    req = urllib.request.Request(url, headers=HEADERS, method=method)
    if data:
        req.data = json.dumps(data).encode("utf-8")
    try:
        with urllib.request.urlopen(req) as response:
            return json.loads(response.read().decode())
    except urllib.error.HTTPError as e:
        print(f"Error {e.code}: {e.read().decode()}")
        sys.exit(1)

def main():
    # 1. Get user info
    print("Getting user info...")
    user_info = call_api("https://huggingface.co/api/whoami-v2")
    username = user_info["name"]
    print(f"Logged in as {username}")

    # 2. Create Space
    space_name = "quran-kids-quiz"
    print(f"Creating Space {username}/{space_name}...")
    try:
        call_api("https://huggingface.co/api/repos/create", method="POST", data={
            "type": "space",
            "name": space_name,
            "sdk": "docker"
        })
        print("Space created successfully.")
    except SystemExit:
        print("Space might already exist, continuing...")

    # We need to upload files. For uploading files, the easiest way via API is the commit endpoint or using huggingface_hub.
    # Actually, we can install huggingface_hub using py -m pip if py is available.
    print(f"Space URL: https://huggingface.co/spaces/{username}/{space_name}")

if __name__ == "__main__":
    main()
