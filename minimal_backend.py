from flask import Flask, request, jsonify
from flask_cors import CORS
import json
import os

app = Flask(__name__)
CORS(app)  # Enable CORS for all routes

# Simple in-memory storage
users = {}
messages = []

@app.route("/")
def home():
    """Serve the HTML file"""
    try:
        with open('index.html', 'r') as f:
            return f.read()
    except FileNotFoundError:
        return """
        <h1>🚨 File Missing</h1>
        <p>Cannot find index.html in the current directory.</p>
        <p>Current directory: """ + os.getcwd() + """</p>
        <p>Files found: """ + str(os.listdir('.')) + """</p>
        """

@app.route("/styles.css")
def css():
    """Serve CSS file"""
    try:
        with open('styles.css', 'r') as f:
            return f.read(), 200, {'Content-Type': 'text/css'}
    except FileNotFoundError:
        return "/* CSS file not found */", 404

@app.route("/script.js")
def js():
    """Serve JavaScript file"""
    try:
        with open('script.js', 'r') as f:
            return f.read(), 200, {'Content-Type': 'application/javascript'}
    except FileNotFoundError:
        return "// JS file not found", 404

@app.route("/signup", methods=["POST"])
def signup():
    try:
        data = request.json
        username = data.get("username", "").strip()
        password = data.get("password", "")
        
        if not username or not password:
            return jsonify({"error": "Username and password required"}), 400
            
        if username in users:
            return jsonify({"error": "Username already taken"}), 400
            
        users[username] = password
        print(f"✅ User signed up: {username}")
        return jsonify({"status": "success"})
        
    except Exception as e:
        print(f"❌ Signup error: {e}")
        return jsonify({"error": "Signup failed"}), 500

@app.route("/signin", methods=["POST"])
def signin():
    try:
        data = request.json
        username = data.get("username", "").strip()
        password = data.get("password", "")
        
        if username not in users or users[username] != password:
            return jsonify({"error": "Invalid credentials"}), 401
            
        print(f"✅ User signed in: {username}")
        return jsonify({"status": "success"})
        
    except Exception as e:
        print(f"❌ Signin error: {e}")
        return jsonify({"error": "Signin failed"}), 500

@app.route("/send", methods=["POST"])
def send_message():
    try:
        data = request.json
        username = data.get("username", "")
        message = data.get("message", "")
        recipient = data.get("recipient", "all")
        profile_picture = data.get("profilePicture", "")
        
        if not username or not message:
            return jsonify({"error": "Username and message required"}), 400
            
        messages.append({
            "username": username,
            "message": message,
            "recipient": recipient,
            "profilePicture": profile_picture
        })
        
        print(f"📨 Message from {username}: {message}")
        return jsonify({"status": "Message sent securely"})
        
    except Exception as e:
        print(f"❌ Send error: {e}")
        return jsonify({"error": "Send failed"}), 500

@app.route("/receive", methods=["GET"])
def receive_messages():
    try:
        print(f"📬 Sending {len(messages)} messages")
        return jsonify({"messages": messages})
        
    except Exception as e:
        print(f"❌ Receive error: {e}")
        return jsonify({"error": "Receive failed"}), 500

if __name__ == "__main__":
    print("=" * 50)
    print("🐧 TUXCHAT MINIMAL SERVER")
    print("=" * 50)
    print(f"📁 Current directory: {os.getcwd()}")
    print(f"📄 Files in directory: {os.listdir('.')}")
    print("🌐 Starting server on http://localhost:5000")
    print("🔍 Debug mode: ON")
    print("=" * 50)
    
    app.run(debug=True, host='0.0.0.0', port=5000)