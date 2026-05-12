document.addEventListener("DOMContentLoaded", () => {
  const SpeechRecognition =
    window.SpeechRecognition || window.webkitSpeechRecognition;

  if (!SpeechRecognition) {
    console.log("Speech recognition not supported");
    return;
  }

  const recognition = new SpeechRecognition();
  recognition.lang = "en-IN";
  recognition.continuous = true;
  recognition.interimResults = false;
  recognition.maxAlternatives = 1;

  let voices = [];
  let speaking = false;
  let voiceMode = true;
  let lastCommand = "";
  let lastCommandTime = 0;
  let welcomed = false;

  function loadVoices() {
    voices = window.speechSynthesis.getVoices();
  }

  window.speechSynthesis.onvoiceschanged = loadVoices;
  loadVoices();

  function normalize(text) {
    return (text || "")
      .toLowerCase()
      .replace(/[^\w\s]/g, " ")
      .replace(/\s+/g, " ")
      .trim();
  }

  function speak(text, callback) {
    console.log("Aahaar says:", text);

    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = "en-IN";
    utterance.rate = 1;
    utterance.pitch = 1;

    if (voices.length > 0) {
      utterance.voice =
        voices.find(v => v.lang && v.lang.toLowerCase().includes("en-in")) ||
        voices.find(v => v.lang && v.lang.toLowerCase().includes("en")) ||
        voices[0];
    }

    speaking = true;

    try {
      recognition.stop();
    } catch (e) {}

    utterance.onend = () => {
      speaking = false;

      if (typeof callback === "function") {
        callback();
      }

      setTimeout(() => {
        try {
          recognition.start();
        } catch (e) {}
      }, 500);
    };

    window.speechSynthesis.speak(utterance);
  }

  function isDuplicate(command) {
    const now = Date.now();
    if (command === lastCommand && now - lastCommandTime < 1800) {
      return true;
    }
    lastCommand = command;
    lastCommandTime = now;
    return false;
  }

  function getRestaurantCards() {
    return Array.from(document.querySelectorAll("#restaurantList .restaurant-card"));
  }

  function getRestaurantName(card) {
    return card.querySelector("h3")?.innerText?.trim() || "";
  }

  function getSearchInput() {
    return document.getElementById("searchInput");
  }

  function getSearchButton() {
    return (
      document.getElementById("searchBtn") ||
      document.getElementById("searchFood")
    );
  }

  function getVegToggle() {
    return document.getElementById("vegToggle");
  }

  function getRestaurantCount() {
    return getRestaurantCards().length;
  }

  function readRenderedRestaurants(prefix = "Available restaurants are") {
    const cards = getRestaurantCards();

    if (!cards.length) {
      speak("I could not find any restaurants at the moment.");
      return;
    }

    const names = cards
      .map(card => getRestaurantName(card))
      .filter(Boolean)
      .slice(0, 8);

    if (!names.length) {
      speak("I found restaurants, but I could not read their names.");
      return;
    }

    speak(prefix + " " + names.join(", ") + ".");
  }

  function waitAndReadRestaurants(prefix, retries = 8) {
    setTimeout(() => {
      const count = getRestaurantCount();

      if (count > 0) {
        readRenderedRestaurants(prefix);
        return;
      }

      if (retries > 0) {
        waitAndReadRestaurants(prefix, retries - 1);
        return;
      }

      speak("I could not find any restaurants at the moment.");
    }, 350);
  }

  function speakHelp() {
    speak(
      "You can say open restaurant name to start ordering."
    );
  }

  function welcomeUser() {
    if (welcomed) return;
    welcomed = true;

    const cards = getRestaurantCards();
    const names = cards
      .map(card => getRestaurantName(card))
      .filter(Boolean)
      .slice(0, 4);

    if (names.length) {
      speak(
        "Welcome to Aahaar. Some restaurants available are " +
          names.join(", ") +
          ".",
        () => {
          setTimeout(() => {
            speakHelp();
          }, 300);
        }
      );
    } else {
      speak(
        "Welcome to Aahaar.",
        () => {
          setTimeout(() => {
            speakHelp();
          }, 300);
        }
      );
    }
  }

  function setVeg(enabled) {
    const vegToggle = getVegToggle();
    if (!vegToggle) return false;

    if (vegToggle.checked !== enabled) {
      vegToggle.checked = enabled;
      vegToggle.dispatchEvent(new Event("change", { bubbles: true }));
    } else {
      vegToggle.dispatchEvent(new Event("change", { bubbles: true }));
    }

    return true;
  }

  function setSearch(query) {
    const input = getSearchInput();
    if (!input) return false;

    input.value = query;
    input.dispatchEvent(new Event("input", { bubbles: true }));
    input.dispatchEvent(new Event("change", { bubbles: true }));

    const btn = getSearchButton();
    if (btn) {
      btn.click();
    }

    return true;
  }

  function clearSearch() {
    const input = getSearchInput();
    if (!input) return false;

    input.value = "";
    input.dispatchEvent(new Event("input", { bubbles: true }));
    input.dispatchEvent(new Event("change", { bubbles: true }));

    const btn = getSearchButton();
    if (btn) {
      btn.click();
    }

    return true;
  }

  function openRestaurant(nameSpoken) {
    const target = normalize(nameSpoken);
    const cards = getRestaurantCards();

    if (!target) {
      speak("Please say the restaurant name again.");
      return;
    }

    for (const card of cards) {
      const actualName = getRestaurantName(card);
      const normalizedName = normalize(actualName);

      if (
        normalizedName === target ||
        normalizedName.includes(target) ||
        target.includes(normalizedName)
      ) {
        speak("Opening " + actualName);
        setTimeout(() => {
          card.click();
        }, 900);
        return;
      }
    }

    const targetWords = target.split(" ").filter(Boolean);

    for (const card of cards) {
      const actualName = getRestaurantName(card);
      const normalizedName = normalize(actualName);
      const matchedWords = targetWords.filter(word => normalizedName.includes(word));

      if (
        (targetWords.length === 1 && matchedWords.length === 1) ||
        matchedWords.length >= 2
      ) {
        speak("Opening " + actualName);
        setTimeout(() => {
          card.click();
        }, 900);
        return;
      }
    }

    speak("I could not find that restaurant in the current list.");
  }

  function extractSearchQuery(text) {
    const prefixes = [
      "search for ",
      "search ",
      "find ",
      "show me ",
      "i want ",
      "get me ",
      "order "
    ];

    for (const prefix of prefixes) {
      if (text.startsWith(prefix)) {
        return text.replace(prefix, "").trim();
      }
    }

    return text.trim();
  }

  function handleCommand(rawText) {
    if (speaking || !voiceMode) return;

    const text = normalize(rawText);
    if (!text) return;
    if (isDuplicate(text)) return;

    console.log("Voice heard:", text);

    if (
      text.includes("stop voice") ||
      text.includes("disable voice") ||
      text.includes("turn off voice")
    ) {
      voiceMode = false;
      speak("Voice mode turned off.");
      return;
    }

    if (
      text.includes("start voice") ||
      text.includes("turn on voice") ||
      text.includes("enable voice")
    ) {
      voiceMode = true;
      speakHelp();
      return;
    }

    if (
      text.includes("repeat") ||
      text.includes("help") ||
      text.includes("options") ||
      text.includes("what can i say")
    ) {
      speakHelp();
      return;
    }

    if (
      text.includes("show restaurants") ||
      text.includes("restaurant list") ||
      text.includes("list restaurants") ||
      text.includes("which restaurants") ||
      text.includes("what restaurants")
    ) {
      readRenderedRestaurants("Available restaurants are");
      return;
    }

    if (
      text.includes("show veg restaurants") ||
      text.includes("veg restaurants") ||
      text.includes("pure veg") ||
      text.includes("veg only")
    ) {
      const ok = setVeg(true);

      if (!ok) {
        speak("Veg filter is not available.");
        return;
      }

      speak("Showing veg restaurants.");
      waitAndReadRestaurants("Veg restaurants are");
      return;
    }

    if (
      text.includes("show all restaurants") ||
      text.includes("all restaurants") ||
      text.includes("remove veg filter")
    ) {
      const ok = setVeg(false);

      if (!ok) {
        speak("Restaurant filter is not available.");
        return;
      }

      speak("Showing all restaurants.");
      waitAndReadRestaurants("All available restaurants are");
      return;
    }

    if (
      text.includes("clear search") ||
      text.includes("remove search")
    ) {
      clearSearch();
      speak("Search cleared.");
      waitAndReadRestaurants("Available restaurants are");
      return;
    }

    if (
      text.startsWith("open restaurant ") ||
      text.startsWith("open ") ||
      text.startsWith("go to restaurant ") ||
      text.startsWith("go to ")
    ) {
      const name = text
        .replace("open restaurant ", "")
        .replace("open ", "")
        .replace("go to restaurant ", "")
        .replace("go to ", "")
        .trim();

      openRestaurant(name);
      return;
    }

    if (
      text.startsWith("search ") ||
      text.startsWith("search for ") ||
      text.startsWith("find ") ||
      text.startsWith("show me ") ||
      text.startsWith("i want ") ||
      text.startsWith("get me ") ||
      text.startsWith("order ")
    ) {
      const query = extractSearchQuery(text);

      if (!query) {
        speak("Please say what you want to search for.");
        return;
      }

      const ok = setSearch(query);

      if (!ok) {
        speak("Search is not available.");
        return;
      }

      speak("Searching for " + query + ".");
      waitAndReadRestaurants("Search results include");
      return;
    }

    speak("Sorry, I did not understand. Say repeat options to hear the available commands.");
  }

  recognition.onresult = event => {
    const result = event.results[event.results.length - 1];
    if (!result.isFinal) return;

    const transcript = result[0].transcript;
    handleCommand(transcript);
  };

  recognition.onerror = event => {
    console.log("Speech recognition error:", event.error);
    if (!speaking && voiceMode) {
      setTimeout(() => {
        try {
          recognition.start();
        } catch (e) {}
      }, 1000);
    }
  };

  recognition.onend = () => {
    if (!speaking && voiceMode) {
      setTimeout(() => {
        try {
          recognition.start();
        } catch (e) {}
      }, 1000);
    }
  };

  setTimeout(() => {
    try {
      recognition.start();
    } catch (e) {}
  }, 1000);

  setTimeout(() => {
    welcomeUser();
  }, 1800);

  const startVoiceBtn = document.getElementById("startVoice");
  if (startVoiceBtn) {
    startVoiceBtn.addEventListener("click", () => {
      voiceMode = true;
      welcomeUser();
    });
  }
});