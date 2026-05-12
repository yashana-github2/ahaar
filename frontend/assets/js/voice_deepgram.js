// voice-deepgram.js
let voiceMode = false;
let stage = null;
let userData = {};

// Start microphone recording and transcription
async function startListening() {
  const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
  const mediaRecorder = new MediaRecorder(stream);
  let chunks = [];

  mediaRecorder.ondataavailable = (e) => chunks.push(e.data);

  mediaRecorder.onstop = async () => {
    const blob = new Blob(chunks, { type: "audio/webm" });
    chunks = [];

    const formData = new FormData();
    formData.append("audio", blob, "input.webm");

    try {
      const res = await fetch("http://localhost:3000/transcribe", {
        method: "POST",
        body: formData
      });

      const data = await res.json();
      const transcript = (data.text || "").toLowerCase().trim();
      console.log("User said:", transcript);

      handleTranscript(transcript);

    } catch (err) {
      console.error("Error sending audio:", err);
    }

    // Continue listening
    mediaRecorder.start();
    setTimeout(() => mediaRecorder.stop(), 3000); // 3 sec chunks
  };

  // Start initial recording
  mediaRecorder.start();
  setTimeout(() => mediaRecorder.stop(), 3000);
}

// Handle transcript text
function handleTranscript(text) {
  // Wake word detection
  if (!voiceMode && text.includes("hey ahaar")) {
    voiceMode = true;
    speak("Welcome to Ahaar. Voice mode activated.");
    goToRegistration();
  }
}

// Automatically redirect to registration page
function goToRegistration() {
  speak("Taking you to the registration page.");
  setTimeout(() => {
    window.location.href = "register.html";
  }, 1500); // short pause for speech to finish
}

// Simple text-to-speech
function speak(text) {
  const speech = new SpeechSynthesisUtterance(text);
  speech.lang = "en-IN";
  speech.rate = 1;
  window.speechSynthesis.speak(speech);
}

// Start listening immediately
startListening();