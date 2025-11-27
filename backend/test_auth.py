import requests
import json

BASE_URL = "http://localhost:8001/api"

def test_signup():
    print("Testing Signup...")
    payload = {
        "email": "test_script@example.com",
        "password": "password123",
        "username": "testscript"
    }
    try:
        response = requests.post(f"{BASE_URL}/auth/signup", json=payload)
        print(f"Status: {response.status_code}")
        print(f"Headers: {response.headers}")
        print(f"Response: {response.text}")
    except Exception as e:
        print(f"Error: {e}")

def test_login():
    print("\nTesting Login...")
    payload = {
        "email": "test_script@example.com",
        "password": "password123"
    }
    try:
        response = requests.post(f"{BASE_URL}/auth/login", json=payload)
        print(f"Status: {response.status_code}")
        print(f"Response: {response.text}")
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    test_signup()
    test_login()
