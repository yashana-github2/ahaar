document.addEventListener("DOMContentLoaded", () => {

const loginBtn = document.getElementById("loginBtn");
const messageBox = document.getElementById("message");

loginBtn.addEventListener("click", async () => {

const phone = document.getElementById("phone").value.trim();
const password = document.getElementById("password").value.trim();

if (!phone || phone.length !== 10) {
    messageBox.style.color = "red";
    messageBox.textContent = "Enter a valid 10 digit phone number.";
    return;
}

if (!password) {
    messageBox.style.color = "red";
    messageBox.textContent = "Enter your password.";
    return;
}

try {

    const res = await fetch("http://localhost:5000/login", {
        method: "POST",
        headers: {"Content-Type":"application/json"},
        credentials:"include",
        body: JSON.stringify({
            phone_number: phone,
            password: password
        })
    });

    const data = await res.json();

    if (res.ok) {

        localStorage.setItem("aahaarUserName", data.name);
        localStorage.setItem("aahaarUserId", data.user_id);

        window.location.href = "home.html";

    } else {

        messageBox.style.color = "red";
        messageBox.textContent = data.error || "Login failed.";

    }

} catch (err) {

    messageBox.style.color = "red";
    messageBox.textContent = "Server error. Try again.";

}


});

});
