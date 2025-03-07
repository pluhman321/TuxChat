from flask import Flask, request, jsonify
from cryptography.fernet import Fernet
import os

app = Flask(__name__)

# Generate encryption key (store securely in production)
ENCRYPTION_KEY = Fernet.generate_key()
cipher = Fernet(ENCRYPTION_KEY)

# In-memory storage (use a database in production)
users = {}  # Store username and passwords
messages = []

@app.route("/signup", methods=["POST"])
def signup():
    data = request.json
    if not data or "username" not in data or "password" not in data:
        return jsonify({"error": "Invalid request"}), 400
    
    username = data["username"]
    if username in users:
        return jsonify({"error": "Username already taken"}), 400
    
    users[username] = data["password"]
    return jsonify({"status": "success"})

@app.route("/signin", methods=["POST"])
def signin():
    data = request.json
    if not data or "username" not in data or "password" not in data:
        return jsonify({"error": "Invalid request"}), 400
    
    username = data["username"]
    if username not in users or users[username] != data["password"]:
        return jsonify({"error": "Invalid credentials"}), 400
    
    return jsonify({"status": "success"})

@app.route("/send", methods=["POST"])
def send_message():
    data = request.json
    if not data or "message" not in data or "username" not in data or "recipient" not in data:
        return jsonify({"error": "Invalid request"}), 400
    
    encrypted_message = cipher.encrypt(data["message"].encode()).decode()
    messages.append({
        "username": data["username"],
        "profilePicture": data.get("profilePicture", ""),
        "recipient": data["recipient"],
        "message": encrypted_message,
    })
    return jsonify({"status": "Message sent securely"})

@app.route("/receive", methods=["GET"])
def receive_messages():
    decrypted_messages = []
    for msg in messages:
        decrypted_messages.append({
            "username": msg["username"],
            "profilePicture": msg["profilePicture"],
            "recipient": msg["recipient"],
            "message": cipher.decrypt(msg["message"].encode()).decode()
        })
    return jsonify({"messages": decrypted_messages})

if __name__ == "__main__":
    app.run(debug=True)
