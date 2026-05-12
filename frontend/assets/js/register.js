document.addEventListener("DOMContentLoaded", () => {

const registerBtn = document.getElementById("registerBtn");
const messageBox = document.getElementById("message");

const passwordField = document.getElementById("password");
const confirmField = document.getElementById("confirm_password");
const matchMsg = document.getElementById("password_match_msg");

/* -------- Password match UI feedback -------- */

function checkPasswordMatch() {

const password = passwordField.value;
const confirmPassword = confirmField.value;

if (!confirmPassword) {
    matchMsg.textContent = "";
    confirmField.classList.remove("error","success");
    return;
}

if (password === confirmPassword) {
    matchMsg.style.color = "green";
    matchMsg.textContent = "Passwords match";
    confirmField.classList.add("success");
    confirmField.classList.remove("error");
} else {
    matchMsg.style.color = "red";
    matchMsg.textContent = "Passwords do not match";
    confirmField.classList.add("error");
    confirmField.classList.remove("success");
}


}

passwordField.addEventListener("input", checkPasswordMatch);
confirmField.addEventListener("input", checkPasswordMatch);

/* -------- Register Button -------- */

registerBtn.addEventListener("click", async () => {


const name = document.getElementById("name").value.trim();
const phone = document.getElementById("phone").value.trim();
const email = document.getElementById("email").value.trim();

const password = passwordField.value.trim();
const confirmPassword = confirmField.value.trim();

const isBlindUser = document.getElementById("is_blind_user")?.checked || false;

const addressLine1 = document.getElementById("address_line1")?.value.trim() || "";
const addressLine2 = document.getElementById("address_line2")?.value.trim() || "";
const city = document.getElementById("city")?.value.trim() || "";
const state = document.getElementById("state")?.value.trim() || "";
const pincode = document.getElementById("pincode")?.value.trim() || "";
const deliveryInstructions = document.getElementById("delivery_instructions")?.value.trim() || "";

messageBox.textContent = "";

if (!name) {
    messageBox.style.color = "red";
    messageBox.textContent = "Please enter your name.";
    return;
}

if (!phone || phone.length !== 10) {
    messageBox.style.color = "red";
    messageBox.textContent = "Enter a valid 10 digit phone number.";
    return;
}

if (!email || !email.includes("@")) {
    messageBox.style.color = "red";
    messageBox.textContent = "Enter a valid email.";
    return;
}

if (password.length < 4) {
    messageBox.style.color = "red";
    messageBox.textContent = "Password must be at least 4 characters.";
    return;
}

if (password !== confirmPassword) {
    messageBox.style.color = "red";
    messageBox.textContent = "Passwords do not match.";
    return;
}

try {

    const response = await fetch("http://localhost:5000/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
            name,
            phone_number: phone,
            email,
            password,
            is_blind_user: isBlindUser,
            address_line1: addressLine1,
            address_line2: addressLine2,
            city,
            state,
            pincode,
            delivery_instructions: deliveryInstructions
        })
    });

    const data = await response.json();

    if (response.ok) {

        messageBox.style.color = "green";
        messageBox.textContent = "Registration successful! Redirecting to login...";

        setTimeout(() => {
            window.location.href = "login.html";
        }, 1500);

    } else {

        messageBox.style.color = "red";
        messageBox.textContent = data.error || "Registration failed.";

    }

} catch (err) {

    messageBox.style.color = "red";
    messageBox.textContent = "Server error. Please try again.";

}


});

});
