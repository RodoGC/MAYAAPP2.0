import requests
import json

url = "http://127.0.0.1:8001/api/auth/login"
payload = {
    "email": "test@test.com",
    "password": "test"
}
headers = {
    "Content-Type": "application/json"
}

try:
    print(f"Testing connection to {url}...")
    response = requests.post(url, json=payload, headers=headers)
    print(f"Status Code: {response.status_code}")
    print(f"Response: {response.text}")
except Exception as e:
    print(f"Connection failed: {e}")
