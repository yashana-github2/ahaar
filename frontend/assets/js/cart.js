const API_BASE = "http://localhost:5000";

document.addEventListener("DOMContentLoaded", async function () {
  async function getCart() {
    try {
      const res = await fetch(`${API_BASE}/cart`, { credentials: "include" });
      if (res.status === 401) return { items: [], loggedIn: false };
      const items = await res.json();
      return { items: Array.isArray(items) ? items : [], loggedIn: true };
    } catch (_) {
      return { items: [], loggedIn: false };
    }
  }

  async function renderCart() {
    const container = document.getElementById("cartItems");
    const billSection = document.getElementById("billSection");
    const { items: cart, loggedIn } = await getCart();

    container.innerHTML = "";

    if (!loggedIn) {
      container.innerHTML = "<p>Please <a href='login.html'>log in</a> to see your cart.</p>";
      billSection.style.display = "none";
      return;
    }

    if (cart.length === 0) {
      container.innerHTML = "<p>Your cart is empty.</p>";
      billSection.style.display = "none";
      return;
    }

    let itemTotal = 0;

    cart.forEach(item => {
      const price = typeof item.price === "number" ? item.price : parseFloat(item.price) || 0;
      const qty = item.quantity || 1;
      itemTotal += price * qty;

      const div = document.createElement("div");
      div.className = "cart-item";
      div.setAttribute("data-item-id", item.item_id);
      div.setAttribute("data-item-name", item.item_name || item.name || "Item");
      div.innerHTML = `
        <div>
          <h3>${item.item_name || item.name || "Item"}</h3>
          <p>₹${price}</p>
        </div>
        <div class="qty-controls">
          <button onclick="decreaseQty(${item.item_id})">-</button>
          <span class="qty-value">${qty}</span>
          <button onclick="increaseQty(${item.item_id})">+</button>
        </div>
      `;
      container.appendChild(div);
    });

   const gst = Math.round(itemTotal * 0.05);
const delivery = 30;
const platform = 5;
const grandTotal = itemTotal + gst + delivery + platform;

document.getElementById("itemTotal").textContent = "₹" + itemTotal;
document.getElementById("gstAmount").textContent = "₹" + gst;
document.getElementById("grandTotal").textContent = "₹" + grandTotal;
billSection.style.display = "block";
  }

  window.increaseQty = async function (id) {
    const { items } = await getCart();
    const row = items.find(i => i.item_id === id);
    const newQty = row ? row.quantity + 1 : 1;

    await fetch(`${API_BASE}/cart/update`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ item_id: id, quantity: newQty }),
      credentials: "include"
    });

    await renderCart();
  };

  window.decreaseQty = async function (id) {
    const { items } = await getCart();
    const row = items.find(i => i.item_id === id);
    if (!row) return;

    const newQty = row.quantity - 1;

    if (newQty <= 0) {
      await fetch(`${API_BASE}/cart/remove`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ item_id: id }),
        credentials: "include"
      });
    } else {
      await fetch(`${API_BASE}/cart/update`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ item_id: id, quantity: newQty }),
        credentials: "include"
      });
    }

    await renderCart();
  };

  window.checkout = function () {
    window.location.href = "checkout.html";
  };

  window.goBack = function () {
    window.history.back();
  };

  await renderCart();

  /* ---------------- VOICE ---------------- */

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
    return (text || "")
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

  function getCartItemCards() {
    return Array.from(document.querySelectorAll(".cart-item"));
  }

  function getCartItemName(card) {
    return card.querySelector("h3")?.innerText?.trim() || "";
  }

  function getCartItemQty(card) {
    return card.querySelector(".qty-value")?.innerText?.trim() || "0";
  }

  function findCartItemByVoice(nameSpoken) {
    const target = normalize(nameSpoken);
    const cards = getCartItemCards();

    for (const card of cards) {
      const actualName = getCartItemName(card);
      const normalizedName = normalize(actualName);

      if (
        normalizedName === target ||
        normalizedName.includes(target) ||
        target.includes(normalizedName)
      ) {
        return card;
      }
    }

    const targetWords = target.split(" ").filter(Boolean);

    for (const card of cards) {
      const actualName = getCartItemName(card);
      const normalizedName = normalize(actualName);
      const matchedWords = targetWords.filter(word => normalizedName.includes(word));

      if (
        (targetWords.length === 1 && matchedWords.length === 1) ||
        matchedWords.length >= 2
      ) {
        return card;
      }
    }

    return null;
  }

  function readCartItems() {
    const cards = getCartItemCards();

    if (!cards.length) {
      speak("Your cart is empty.");
      return;
    }

    const lines = cards.slice(0, 8).map(card => {
      const name = getCartItemName(card);
      const qty = getCartItemQty(card);
      return `${name}, quantity ${qty}`;
    });

    speak("Your cart has " + lines.join(". ") + ".");
  }

  function readBill() {
    const itemTotal = document.getElementById("itemTotal")?.innerText?.trim() || "₹0";
    const grandTotal = document.getElementById("grandTotal")?.innerText?.trim() || "₹0";

    speak(
      "Item total is " +
      itemTotal.replace("₹", "rupees ") +
      ". Delivery fee is rupees 30. Platform fee is rupees 5. Grand total is " +
      grandTotal.replace("₹", "rupees ") +
      "."
    );
  }

  async function increaseItemByVoice(itemName) {
    const card = findCartItemByVoice(itemName);

    if (!card) {
      speak("I could not find that item in your cart.");
      return;
    }

    const id = Number(card.getAttribute("data-item-id"));
    const actualName = getCartItemName(card);

    await window.increaseQty(id);
    speak("Added one more " + actualName + ".");
  }

  async function decreaseItemByVoice(itemName) {
    const card = findCartItemByVoice(itemName);

    if (!card) {
      speak("I could not find that item in your cart.");
      return;
    }

    const id = Number(card.getAttribute("data-item-id"));
    const actualName = getCartItemName(card);

    await window.decreaseQty(id);

    const updatedCard = findCartItemByVoice(actualName);
    if (updatedCard) {
      speak("Reduced quantity of " + actualName + ".");
    } else {
      speak(actualName + " removed from cart.");
    }
  }

  function proceedToCheckoutByVoice() {
    speak("Proceeding to checkout.");
    setTimeout(() => {
      window.checkout();
    }, 900);
  }

  function extractItemName(text, prefixes) {
    for (const prefix of prefixes) {
      if (text.startsWith(prefix)) {
        return text.replace(prefix, "").trim();
      }
    }
    return "";
  }

  function handleVoice(rawTranscript) {
    if (speaking || !voiceMode) return;

    const transcript = normalize(rawTranscript);
    if (!transcript) return;
    if (isDuplicate(transcript)) return;

    console.log("User said:", transcript);

    if (
      transcript.includes("read cart") ||
      transcript.includes("what is in my cart") ||
      transcript.includes("cart items") ||
      transcript.includes("read items")
    ) {
      readCartItems();
      return;
    }

    if (
      transcript.includes("read bill") ||
      transcript.includes("bill summary") ||
      transcript.includes("read total") ||
      transcript.includes("grand total")
    ) {
      readBill();
      return;
    }

    if (
      transcript.startsWith("increase ") ||
      transcript.startsWith("add one more ") ||
      transcript.startsWith("more ")
    ) {
      const itemName = extractItemName(transcript, [
        "increase ",
        "add one more ",
        "more "
      ]);

      if (!itemName) {
        speak("Please say the item name.");
        return;
      }

      increaseItemByVoice(itemName);
      return;
    }

    if (
      transcript.startsWith("decrease ") ||
      transcript.startsWith("remove one ") ||
      transcript.startsWith("less ")
    ) {
      const itemName = extractItemName(transcript, [
        "decrease ",
        "remove one ",
        "less "
      ]);

      if (!itemName) {
        speak("Please say the item name.");
        return;
      }

      decreaseItemByVoice(itemName);
      return;
    }

    if (
      transcript.includes("check out") ||
      transcript.includes("proceed to check out") ||
      transcript.includes("continue to check out")
    ) {
      proceedToCheckoutByVoice();
      return;
    }

    if (
      transcript.includes("go back") ||
      transcript === "back"
    ) {
      speak("Going back.");
      setTimeout(() => {
        window.goBack();
      }, 900);
      return;
    }

    speak("Please say read cart, read bill, increase item name, decrease item name, or checkout.");
  }

  recognition.onresult = (event) => {
    const result = event.results[event.results.length - 1];
    if (!result.isFinal) return;

    const transcript = result[0].transcript;
    handleVoice(transcript);
  };

  recognition.onerror = () => {
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
    const cards = getCartItemCards();

    if (!cards.length) {
      speak("You are on cart page. Your cart is empty.");
      return;
    }

    speak(
      "You are on cart page. You can say read cart, read bill, increase item name, decrease item name, or checkout."
    );
  }, 1400);
});