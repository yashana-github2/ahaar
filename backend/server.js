const express = require("express");
const multer = require("multer");
const fetch = require("node-fetch");
const cors = require("cors");
const path = require("path");

const app = express();
const upload = multer();

app.use(cors());
app.use(express.json());

// Serve static frontend files
app.use(express.static(path.join(__dirname, "../frontend")));
app.use("/assets", express.static(path.join(__dirname, "../frontend/assets")));

const DEEPGRAM_API_KEY = ""; // your Deepgram API key

// Routes for HTML pages
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "../frontend/index.html"));
});

app.get("/register", (req, res) => {
  res.sendFile(path.join(__dirname, "../frontend/register.html"));
});

// Deepgram transcription endpoint
app.post("/transcribe", upload.single("audio"), async (req, res) => {
  try {
    const audioBuffer = req.file.buffer;
    const response = await fetch("https://api.deepgram.com/v1/listen", {
      method: "POST",
      headers: {
        Authorization: `Token ${DEEPGRAM_API_KEY}`,
        "Content-Type": "audio/webm",
      },
      body: audioBuffer,
    });

    const data = await response.json();
    const transcript = data.results.channels[0].alternatives[0].transcript;
    res.json({ text: transcript });
  } catch (error) {
    console.error(error);
    res.status(500).send("Error transcribing audio");
  }
});

app.listen(3000, () => {
  console.log("Server running on http://localhost:3000");
});
