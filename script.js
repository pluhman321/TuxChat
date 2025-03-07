document.addEventListener("DOMContentLoaded", function () {
    const authUsername = document.getElementById("authUsername");
    const authPassword = document.getElementById("authPassword");
    const signUpButton = document.getElementById("signUpButton");
    const signInButton = document.getElementById("signInButton");
    const confirmSignUpButton = document.getElementById("confirmSignUpButton");
    const confirmSignInButton = document.getElementById("confirmSignInButton");
    const authSection = document.getElementById("auth");
    const chatSection = document.getElementById("chat");
    const usernameInput = document.getElementById("username");
    const profilePictureInput = document.getElementById("profilePicture");
    const recipientSelect = document.getElementById("recipient");
    const messageInput = document.getElementById("messageInput");
    const sendButton = document.getElementById("sendButton");
    const messagesContainer = document.getElementById("messagesContainer");

    let username = "";
    let profilePicture = "";

    signUpButton.addEventListener("click", function () {
        authSection.style.display = "block";
    });

    signInButton.addEventListener("click", function () {
        authSection.style.display = "block";
    });

    function handleAuth(action) {
        const user = authUsername.value.trim();
        const pass = authPassword.value.trim();
        if (user === "" || pass === "") {
            alert("Username and password are required.");
            return;
        }

        fetch(`http://127.0.0.1:5000/${action}`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ username: user, password: pass })
        })
        .then(response => response.json())
        .then(data => {
            if (data.status === "success") {
                username = user;
                localStorage.setItem("username", username);
                usernameInput.value = username;
                authSection.style.display = "none";
                chatSection.style.display = "block";
                loadMessages();
                updateRecipients();
            } else {
                alert(data.error || "Authentication failed.");
            }
        })
        .catch(error => console.error("Auth error:", error));
    }

    confirmSignUpButton.addEventListener("click", () => handleAuth("signup"));
    confirmSignInButton.addEventListener("click", () => handleAuth("signin"));

    profilePictureInput.addEventListener("change", function () {
        const file = profilePictureInput.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = function (e) {
                profilePicture = e.target.result;
            };
            reader.readAsDataURL(file);
        }
    });

    sendButton.addEventListener("click", function () {
        const message = messageInput.value.trim();
        const recipient = recipientSelect.value;
        if (message === "" || username === "") {
            alert("You must be signed in and enter a message.");
            return;
        }

        fetch("http://127.0.0.1:5000/send", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ username, profilePicture, recipient, message })
        })
        .then(response => response.json())
        .then(() => {
            messageInput.value = "";
            loadMessages();
        })
        .catch(error => console.error("Error sending message:", error));
    });

    function loadMessages() {
        fetch("http://127.0.0.1:5000/receive")
            .then(response => response.json())
            .then(data => {
                messagesContainer.innerHTML = "";
                data.messages.forEach(msg => {
                    if (msg.recipient === "all" || msg.recipient === username) {
                        const messageElement = document.createElement("div");
                        messageElement.classList.add("message");
                        messageElement.innerHTML = `
                            <div class="message-content">
                                ${msg.profilePicture ? `<img src="${msg.profilePicture}" class="profile-pic" />` : ""}
                                <strong>${msg.username}:</strong> ${msg.message}
                            </div>
                        `;
                        messagesContainer.appendChild(messageElement);
                    }
                });
            })
            .catch(error => console.error("Error loading messages:", error));
    }

    function updateRecipients() {
        fetch("http://127.0.0.1:5000/receive")
            .then(response => response.json())
            .then(data => {
                const users = new Set();
                data.messages.forEach(msg => users.add(msg.username));
                recipientSelect.innerHTML = `<option value="all">Send to Everyone</option>`;
                users.forEach(user => {
                    if (user !== username) {
                        recipientSelect.innerHTML += `<option value="${user}">${user}</option>`;
                    }
                });
            })
            .catch(error => console.error("Error updating recipients:", error));
    }

    // Check for existing session and auto-login
    const storedUsername = localStorage.getItem("username");
    if (storedUsername) {
        username = storedUsername;
        usernameInput.value = username;
        authSection.style.display = "none";
        chatSection.style.display = "block";
        loadMessages();
        updateRecipients();
    }

    loadMessages();
    setInterval(() => {
        loadMessages();
        updateRecipients();
    }, 3000);
});