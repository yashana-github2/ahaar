document.addEventListener("DOMContentLoaded", () => {

  const SpeechRecognition =
    window.SpeechRecognition || window.webkitSpeechRecognition;

  if (!SpeechRecognition) {
    console.log("Speech recognition not supported.");
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

    try { recognition.stop(); } catch (e) {}

    utterance.onend = () => {
      speaking = false;

      if (nextStep) stage = nextStep;

      setTimeout(() => {
        try { recognition.start(); } catch (e) {}
      }, 300);
    };

    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(utterance);
  }

  /* ---------------- SYMBOL NORMALIZATION ---------------- */

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

  /* ---------------- NORMALIZERS ---------------- */

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
      .split(/\s+/)
      .map(word => {
        if (digitWords[word] !== undefined) return digitWords[word];
        return word;
      })
      .join("");
  }

  /* ---------------- HELPERS ---------------- */

  function fillField(id, value) {
    const el = document.getElementById(id);
    if (!el) return;

    el.value = value;
    el.dispatchEvent(new Event("input", { bubbles: true }));
    el.dispatchEvent(new Event("change", { bubbles: true }));
  }

  /* ---------------- FLOW ---------------- */

  function startVoiceLogin() {
    if (voiceFlowStarted) return;

    voiceFlowStarted = true;

    speak(
      "Registration successful. Please say your phone number to login.",
      "phone"
    );
  }

  function handleVoiceCommand(transcript) {
    if (speaking) return;

    console.log("User said:", transcript);

    if (!voiceFlowStarted) {
      if (
        transcript.includes("hey ahaar") ||
        transcript.includes("hey aahar") ||
        transcript.includes("hey ahar")
      ) {
        startVoiceLogin();
      }
      return;
    }

    if (stage === "phone") {
      const phone = normalizePhone(transcript);
      fillField("phone", phone);

      speak("Please say your password.", "password");
      return;
    }

    if (stage === "password") {
      const password = normalizePassword(transcript);
      fillField("password", password);

      speak("Logging you in now.", "submitted");

      setTimeout(() => {
        document.getElementById("loginBtn")?.click();
      }, 1200);

      return;
    }
  }

  /* ---------------- EVENTS ---------------- */

  recognition.onresult = function (event) {
    const transcript =
      event.results[event.results.length - 1][0].transcript
        .toLowerCase()
        .trim();

    handleVoiceCommand(transcript);
  };

  recognition.onerror = function () {
    if (!speaking) {
      try { recognition.start(); } catch (e) {}
    }
  };

  recognition.onend = function () {
    if (!speaking) {
      try { recognition.start(); } catch (e) {}
    }
  };

  setTimeout(() => {
    try { recognition.start(); } catch (e) {}
  }, 800);

  const voiceModeEnabled =
    sessionStorage.getItem("ahaarVoiceMode") === "on";

  if (voiceModeEnabled) {
    setTimeout(() => {
      startVoiceLogin();
    }, 1200);
  }

});