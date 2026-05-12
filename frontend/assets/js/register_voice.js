document.addEventListener("DOMContentLoaded", () => {
  const SpeechRecognition =
    window.SpeechRecognition || window.webkitSpeechRecognition;

  let speechUnlocked = false;

  document.addEventListener("click", () => {
    if (!speechUnlocked) {
      const test = new SpeechSynthesisUtterance(" ");
      window.speechSynthesis.speak(test);
      speechUnlocked = true;
      console.log("Speech unlocked");
    }
  });

  if (!SpeechRecognition) {
    console.log("Speech recognition not supported in this browser.");
    return;
  }

  const recognition = new SpeechRecognition();
  recognition.lang = "en-IN";
  recognition.continuous = true;
  recognition.interimResults = false;

  let voices = [];
  let speaking = false;
  let voiceFlowStarted = false;
  let stage = null;

  function loadVoices() {
    voices = window.speechSynthesis.getVoices();
  }

  window.speechSynthesis.onvoiceschanged = loadVoices;
  loadVoices();

  function speak(text, nextStep = null) {
    console.log("Aahaar says:", text);

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = "en-IN";
    utterance.rate = 1;
    utterance.pitch = 1;

    if (voices.length > 0) {
      utterance.voice = voices.find(v => v.lang.includes("en")) || voices[0];
    }

    speaking = true;

    try {
      recognition.stop();
    } catch (e) {}

    utterance.onend = () => {
      speaking = false;

      if (nextStep !== null) {
        stage = nextStep;
      }

      setTimeout(() => {
        try {
          recognition.start();
        } catch (e) {}
      }, 300);
    };

    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(utterance);
  }

  function replaceVoiceSymbols(text) {
    return text
      .toLowerCase()
      .replace(/\b(at|ad|et)\b/g, "@")
      .replace(/\bdot\b/g, ".")
      .replace(/\bunderscore\b/g, "_")
      .replace(/\bhyphen\b|\bdash\b/g, "-")
      .replace(/\bplus\b/g, "+")
      .replace(/\bequals\b/g, "=")
      .replace(/\bcomma\b/g, ",")
      .replace(/\bexclamation\b/g, "!")
      .replace(/\bhash\b|\bhashtag\b/g, "#")
      .replace(/\bdollar\b/g, "$")
      .replace(/\bpercent\b/g, "%")
      .replace(/\bcaret\b/g, "^")
      .replace(/\band\b/g, "&")
      .replace(/\basterisk\b/g, "*");
  }

  function normalizeName(text) {
    const letters = text.trim().split(/\s+/);
    if (letters.every(l => l.length === 1)) {
      return letters.join("");
    }
    return text.trim();
  }

  function normalizePhone(text) {
    const digitWords = {
      zero: "0",
      one: "1",
      two: "2",
      three: "3",
      four: "4",
      five: "5",
      six: "6",
      seven: "7",
      eight: "8",
      nine: "9"
    };

    return text
      .toLowerCase()
      .split(/\s+/)
      .map(word => {
        if (digitWords[word] !== undefined) return digitWords[word];
        return word.replace(/\D/g, "");
      })
      .join("");
  }

  function normalizeEmail(text) {
    return replaceVoiceSymbols(text).replace(/\s+/g, "");
  }

  function normalizePassword(text) {
    const digitWords = {
      zero: "0",
      one: "1",
      two: "2",
      three: "3",
      four: "4",
      five: "5",
      six: "6",
      seven: "7",
      eight: "8",
      nine: "9"
    };

    text = replaceVoiceSymbols(text);

    return text
      .replace(/semicolon/g, "")
      .replace(/:/g, "")
      .replace(/;/g, "")
      .split(/\s+/)
      .map(word => {
        if (digitWords[word] !== undefined) return digitWords[word];
        return word;
      })
      .join("");
  }

  function fillField(id, value) {
    const el = document.getElementById(id);
    if (!el) return;
    el.value = value;
    el.dispatchEvent(new Event("input", { bubbles: true }));
    el.dispatchEvent(new Event("change", { bubbles: true }));
  }

  function focusField(id) {
    const el = document.getElementById(id);
    if (!el) return;
    el.focus();
  }

  function markInvalid(id) {
    const el = document.getElementById(id);
    if (!el) return;
    el.style.border = "2px solid red";
  }

  function markValid(id) {
    const el = document.getElementById(id);
    if (!el) return;
    el.style.border = "2px solid green";
  }

  function isValidName(name) {
    return name.trim().length >= 2;
  }

  function isValidPhone(phone) {
    return /^\d{10}$/.test(phone);
  }

  function isValidEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  }

  function isValidPassword(password) {
    return password.length >= 6;
  }

  function isValidPincode(pincode) {
    return /^\d{6}$/.test(pincode);
  }

  function startVoiceRegistration() {
    if (voiceFlowStarted) return;
    voiceFlowStarted = true;

    const blindCheckbox = document.getElementById("is_blind_user");
    if (blindCheckbox) {
      blindCheckbox.checked = true;
    }

    focusField("name");
    speak(
      "Welcome to Aahaar. Let us complete your registration. Please say your full name.",
      "name"
    );
  }

  function handleVoiceCommand(transcript) {
    if (speaking) return;

    console.log("User said:", transcript);

    if (!voiceFlowStarted) {
      const voiceModeEnabled = sessionStorage.getItem("ahaarVoiceMode") === "on";

      if (
        voiceModeEnabled ||
        transcript.includes("hey") ||
        transcript.includes("hello") ||
        transcript.includes("hi")
      ) {
        startVoiceRegistration();
      }
      return;
    }

    if (stage === "name") {
      const name = normalizeName(transcript);
      fillField("name", name);

      if (!isValidName(name)) {
        markInvalid("name");
        focusField("name");
        speak("The name is too short. Please say your full name again.", "name");
        return;
      }

      markValid("name");
      focusField("phone");
      speak("Please say your 10 digit phone number.", "phone");
      return;
    }

    if (stage === "phone") {
      const phone = normalizePhone(transcript);
      fillField("phone", phone);

      if (!isValidPhone(phone)) {
        markInvalid("phone");
        focusField("phone");
        speak("The mobile number must be exactly 10 digits. Please say your phone number again.", "phone");
        return;
      }

      markValid("phone");
      focusField("email");
      speak("Please say your email address.", "email");
      return;
    }

    if (stage === "email") {
      const email = normalizeEmail(transcript);
      fillField("email", email);

      if (!isValidEmail(email)) {
        markInvalid("email");
        focusField("email");
        speak("The email address is not valid. Please say your email again.", "email");
        return;
      }

      markValid("email");
      focusField("password");
      speak("Please say your password.", "password");
      return;
    }

    if (stage === "password") {
      const password = normalizePassword(transcript);
      fillField("password", password);

      if (!isValidPassword(password)) {
        markInvalid("password");
        focusField("password");
        speak("Password is too short. It must contain at least 6 characters. Please say your password again.", "password");
        return;
      }

      markValid("password");
      focusField("confirm_password");
      speak("Please repeat your password to confirm.", "confirm_password");
      return;
    }

    if (stage === "confirm_password") {
      const confirmPassword = normalizePassword(transcript);
      const originalPassword = document.getElementById("password")?.value || "";

      fillField("confirm_password", confirmPassword);

      if (confirmPassword !== originalPassword) {
        markInvalid("confirm_password");
        focusField("confirm_password");
        speak("Passwords do not match. Please repeat the same password again.", "confirm_password");
        return;
      }

      markValid("confirm_password");
      focusField("address_line1");
      speak("Please say your street or house address.", "address_line1");
      return;
    }

    if (stage === "address_line1") {
      fillField("address_line1", transcript.trim());

      if (transcript.trim().length < 3) {
        markInvalid("address_line1");
        focusField("address_line1");
        speak("The address is too short. Please say your street or house address again.", "address_line1");
        return;
      }

      markValid("address_line1");
      focusField("address_line2");
      speak("Please say your area or landmark, or say skip.", "address_line2");
      return;
    }

    if (stage === "address_line2") {
      if (transcript.includes("skip")) {
        fillField("address_line2", "");
      } else {
        fillField("address_line2", transcript.trim());
      }

      markValid("address_line2");
      focusField("city");
      speak("Please say your city.", "city");
      return;
    }

    if (stage === "city") {
      fillField("city", transcript.trim());

      if (transcript.trim().length < 2) {
        markInvalid("city");
        focusField("city");
        speak("City name is too short. Please say your city again.", "city");
        return;
      }

      markValid("city");
      focusField("pincode");
      speak("Please say your pincode.", "pincode");
      return;
    }

    if (stage === "pincode") {
      const pincode = normalizePhone(transcript);
      fillField("pincode", pincode);

      if (!isValidPincode(pincode)) {
        markInvalid("pincode");
        focusField("pincode");
        speak("The pincode must be exactly 6 digits. Please say your pincode again.", "pincode");
        return;
      }

      markValid("pincode");
      focusField("state");
      speak("Please say your state, or say skip.", "state");
      return;
    }

    if (stage === "state") {
      if (transcript.includes("skip")) {
        fillField("state", "");
      } else {
        fillField("state", transcript.trim());
      }

      markValid("state");
      focusField("delivery_instructions");
      speak("Please say any delivery instructions, or say skip.", "delivery_instructions");
      return;
    }

    if (stage === "delivery_instructions") {
      if (transcript.includes("skip")) {
        fillField("delivery_instructions", "");
      } else {
        fillField("delivery_instructions", transcript.trim());
      }

      markValid("delivery_instructions");

      speak("Submitting your registration now.", "submitted");

      setTimeout(() => {
        document.getElementById("registerBtn")?.click();
      }, 1200);

      return;
    }
  }

  recognition.onresult = function (event) {
    const transcript =
      event.results[event.results.length - 1][0].transcript
        .toLowerCase()
        .trim();

    handleVoiceCommand(transcript);
  };

  recognition.onerror = function () {
    if (!speaking) {
      try {
        recognition.start();
      } catch (e) {}
    }
  };

  recognition.onend = function () {
    if (!speaking) {
      try {
        recognition.start();
      } catch (e) {}
    }
  };

  setTimeout(() => {
    try {
      recognition.start();
    } catch (e) {}
  }, 800);

  const voiceModeEnabled = sessionStorage.getItem("ahaarVoiceMode") === "on";

  if (voiceModeEnabled) {
    setTimeout(() => {
      startVoiceRegistration();
    }, 1200);
  }
});