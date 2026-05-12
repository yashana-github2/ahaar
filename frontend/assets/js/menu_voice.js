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

  let speaking = false;
  let voiceMode = true;
  let voices = [];
  let lastCommand = "";
  let lastCommandTime = 0;

  function loadVoices() {
    voices = speechSynthesis.getVoices();
  }

  speechSynthesis.onvoiceschanged = loadVoices;
  loadVoices();

  function normalize(text) {
    return text
      .toLowerCase()
      .replace(/[^\w\s]/g, " ")
      .replace(/\s+/g, " ")
      .trim();
  }

  function speak(text) {
    console.log("Aahaar says:", text);

    speechSynthesis.cancel();

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
      setTimeout(() => {
        try {
          recognition.start();
        } catch (e) {}
      }, 400);
    };

    speechSynthesis.speak(utterance);
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

  function getMenuCategories() {
    const sections = Array.from(document.querySelectorAll(".menu-category"));

    return sections.map(section => {
      const heading = section.querySelector("h2");
      return {
        name: heading ? heading.textContent.trim() : "",
        element: section
      };
    }).filter(cat => cat.name);
  }

  function getVisibleCategories() {
    return getMenuCategories().filter(cat => {
      const style = window.getComputedStyle(cat.element);
      return (
        style.display !== "none" &&
        style.visibility !== "hidden" &&
        cat.element.offsetParent !== null
      );
    });
  }

  function getCategoryNames(visibleOnly = true) {
    const categories = visibleOnly ? getVisibleCategories() : getMenuCategories();
    return categories.map(cat => cat.name);
  }

  function findCategoryByVoice(categorySpoken, visibleOnly = true) {
    const target = normalize(categorySpoken);
    const categories = visibleOnly ? getVisibleCategories() : getMenuCategories();

    for (const cat of categories) {
      const catName = normalize(cat.name);

      if (
        catName === target ||
        catName.includes(target) ||
        target.includes(catName)
      ) {
        return cat;
      }
    }

    const targetWords = target.split(" ").filter(Boolean);

    for (const cat of categories) {
      const catName = normalize(cat.name);
      const matchedWords = targetWords.filter(word => catName.includes(word));

      if (
        (targetWords.length === 1 && matchedWords.length === 1) ||
        matchedWords.length >= 2
      ) {
        return cat;
      }
    }

    return null;
  }

  function getItemsFromCategory(categoryElement) {
    return Array.from(categoryElement.querySelectorAll(".menu-item"))
      .filter(item => {
        const style = window.getComputedStyle(item);
        return (
          style.display !== "none" &&
          style.visibility !== "hidden" &&
          item.offsetParent !== null
        );
      })
      .map(item => item.querySelector("h3")?.textContent?.trim())
      .filter(Boolean);
  }

  function speakCategories(prefix = "The menu categories are") {
    setTimeout(() => {
      const names = getCategoryNames(true);

      if (!names.length) {
        speak("I could not find any visible menu categories.");
        return;
      }

      speak(
        prefix +
          " " +
          names.join(", ") +
          ". You can say read starters."
      );
    }, 500);
  }

  function speakItemsInCategory(categorySpoken) {
    const category = findCategoryByVoice(categorySpoken, true);

    if (!category) {
      speak("I could not find that category.");
      return;
    }

    const items = getItemsFromCategory(category.element);

    if (!items.length) {
      speak("I found " + category.name + ", but there are no visible items in it.");
      return;
    }

    speak(
      "In " + category.name + ", the items are " +
        items.slice(0, 12).join(", ") +
        "."
    );
  }

  function getVisibleMenuItems() {
    return Array.from(document.querySelectorAll(".menu-item")).filter(item => {
      const style = window.getComputedStyle(item);
      return (
        style.display !== "none" &&
        style.visibility !== "hidden" &&
        item.offsetParent !== null
      );
    });
  }

  function findMenuItem(name) {
    const target = normalize(name);
    const items = getVisibleMenuItems();

    for (const item of items) {
      const title = item.querySelector("h3");
      if (!title) continue;

      const itemName = normalize(title.textContent);

      if (
        itemName === target ||
        itemName.includes(target) ||
        target.includes(itemName)
      ) {
        return item;
      }
    }

    const targetWords = target.split(" ").filter(Boolean);

    for (const item of items) {
      const title = item.querySelector("h3");
      if (!title) continue;

      const itemName = normalize(title.textContent);
      const matchedWords = targetWords.filter(word => itemName.includes(word));

      if (
        (targetWords.length === 1 && matchedWords.length === 1) ||
        matchedWords.length >= 2
      ) {
        return item;
      }
    }

    return null;
  }

  function addItemByVoice(name) {
    const item = findMenuItem(name);

    if (!item) {
      speak("I could not find that item.");
      return;
    }

    const title = item.querySelector("h3");
    const actualName = title ? title.textContent.trim() : name;

    const addBtn = item.querySelector(".add-btn");
    const qtyBox = item.querySelector(".qty-box");

    if (addBtn) {
      addBtn.click();
      speak(actualName + " added to cart.");
      return;
    }

    if (qtyBox) {
      speak(actualName + " is already in your cart. Say more " + actualName + " to increase quantity.");
      return;
    }

    speak("I could not add that item.");
  }

  function increaseQuantity(name) {
    const item = findMenuItem(name);

    if (!item) {
      speak("Item not found.");
      return;
    }

    const title = item.querySelector("h3");
    const actualName = title ? title.textContent.trim() : name;

    const qtyBox = item.querySelector(".qty-box");
    if (!qtyBox) {
      speak("That item is not in your cart yet. Say add " + actualName + " first.");
      return;
    }

    const buttons = qtyBox.querySelectorAll("button");
    const plusBtn = buttons[1];

    if (plusBtn) {
      plusBtn.click();
      speak("Added one more " + actualName);
      return;
    }

    speak("I could not increase the quantity.");
  }

  function setVegOnly(enabled) {
    const vegToggle = document.getElementById("vegToggle");
    if (!vegToggle) return false;

    if (vegToggle.checked !== enabled) {
      vegToggle.checked = enabled;
      vegToggle.dispatchEvent(new Event("change", { bubbles: true }));
    }

    return true;
  }

  function extractCategoryCommand(text) {
    const prefixes = [
      "what is in ",
      "what's in ",
      "whats in ",
      "read ",
      "show "
    ];

    for (const prefix of prefixes) {
      if (text.startsWith(prefix)) {
        return text.replace(prefix, "").trim();
      }
    }

    return text.trim();
  }

  function handleVoice(rawTranscript) {
    if (speaking || !voiceMode) return;

    const transcript = normalize(rawTranscript);
    if (!transcript) return;
    if (isDuplicate(transcript)) return;

    console.log("User said:", transcript);

    if (transcript.includes("cart")) {
      speak("Opening cart.");
      setTimeout(() => {
        window.location.href = "cart.html";
      }, 900);
      return;
    }

    if (transcript.includes("checkout")) {
      speak("Opening checkout.");
      setTimeout(() => {
        window.location.href = "checkout.html";
      }, 900);
      return;
    }

    if (
      transcript.includes("what is in the menu") ||
      transcript.includes("what's in the menu") ||
      transcript.includes("whats in the menu") ||
      transcript.includes("read the menu") ||
      transcript.includes("what categories are there") ||
      transcript.includes("menu categories") ||
      transcript.includes("read categories") ||
      transcript.includes("show categories")
    ) {
      speakCategories();
      return;
    }

    if (
      transcript.includes("show veg menu") ||
      transcript.includes("veg menu") ||
      transcript.includes("veg only") ||
      transcript.includes("show veg items")
    ) {
      setVegOnly(true);
      speak("Showing veg menu.");
      setTimeout(() => {
        speakCategories("Visible veg categories are");
      }, 900);
      return;
    }

    if (
      transcript.includes("show all menu") ||
      transcript.includes("show all items") ||
      transcript.includes("remove veg filter") ||
      transcript.includes("all menu")
    ) {
      setVegOnly(false);
      speak("Showing full menu.");
      setTimeout(() => {
        speakCategories("Visible categories are");
      }, 900);
      return;
    }

    if (
      transcript.startsWith("what is in ") ||
      transcript.startsWith("what's in ") ||
      transcript.startsWith("whats in ") ||
      transcript.startsWith("read ") ||
      transcript.startsWith("show ")
    ) {
      const requested = extractCategoryCommand(transcript);

      if (
        requested &&
        requested !== "menu" &&
        requested !== "the menu" &&
        requested !== "categories"
      ) {
        const category = findCategoryByVoice(requested, true);

        if (category) {
          speakItemsInCategory(requested);
          return;
        }
      }
    }

    if (transcript.startsWith("add ")) {
      const itemName = transcript.replace("add ", "").trim();
      addItemByVoice(itemName);
      return;
    }

    if (transcript.startsWith("more ")) {
      const itemName = transcript.replace("more ", "").trim();
      increaseQuantity(itemName);
      return;
    }

    addItemByVoice(transcript);
  }

  recognition.onresult = event => {
    const result = event.results[event.results.length - 1];
    if (!result.isFinal) return;

    const transcript = result[0].transcript;
    handleVoice(transcript);
  };

  recognition.onerror = event => {
    console.log("Speech recognition error:", event.error);

    if (!speaking) {
      setTimeout(() => {
        try {
          recognition.start();
        } catch (e) {}
      }, 800);
    }
  };

  recognition.onend = () => {
    if (!speaking) {
      setTimeout(() => {
        try {
          recognition.start();
        } catch (e) {}
      }, 800);
    }
  };

  setTimeout(() => {
    try {
      recognition.start();
    } catch (e) {}
  }, 800);

  setTimeout(() => {
    const restaurantName =
      document.getElementById("restaurantName")?.textContent?.trim() || "this restaurant";

    speak(
      "Welcome to " +
        restaurantName +
        ". You are on the menu page. You can ask what is in the menu what categories are there"
    );
  }, 1400);
});