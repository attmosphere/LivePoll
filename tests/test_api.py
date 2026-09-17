import requests
import random

ENDPOINT = "http://127.0.0.1:8000"
random_number = random.random()
random_poll_name = f"Pytest {random_number}"

def test_call_endpoint():
    response = requests.get(ENDPOINT)
    assert response.status_code == 200

def test_create_poll():
    poll_name = random_poll_name
    payload = {"name": poll_name}
    response = requests.post(f"{ENDPOINT}/polls/create", json=payload)
    assert response.status_code == 201

def test_created_poll_exists():
    poll_name = random_poll_name
    response = requests.get(f"{ENDPOINT}/polls")
    assert poll_name in response.text