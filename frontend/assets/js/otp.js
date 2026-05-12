document.getElementById("verifyOtpBtn").addEventListener("click", async function () {
    const otp = document.getElementById("otpInput").value.trim();
    const phone = sessionStorage.getItem("user_phone");

    if (!otp) {
        alert("Please enter the OTP.");
        return;
    }

    try {
        const response = await fetch("http://127.0.0.1:5000/verify-otp", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ phone, otp })
        });

        const data = await response.json();

        if (data.success) {
            window.location.href = "index.html";
        } else {
            alert("Invalid OTP, try again.");
        }

    } catch (error) {
        alert("Server error.");
        console.log(error);
    }
});

