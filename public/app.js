
(() => {
  const $ = (id) => document.getElementById(id);
  const form = $("commandForm");
  const prompt = $("prompt");
  const messages = $("messages");
  const status = $("status");
  const mic = $("mic");

  let mode = "chat";
  let busy = false;
  let recognition = null;

  function addMessage(text, who = "assistant", error = false) {
    const node = document.createElement("div");
    node.className = "message" +
      (who === "user" ? " user" : "") +
      (error ? " error" : "");
    node.textContent = text;
    messages.appendChild(node);
    node.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }

  function setStatus(text) {
    status.textContent = "● " + text;
  }

  function speak(text) {
    if ($("voiceSelect").value !== "on" ||
        !("speechSynthesis" in window)) return;

    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = "en-IN";
    utterance.rate = 1;
    window.speechSynthesis.speak(utterance);
  }

  async function sendCommand(text) {
    text = text.trim();
    if (!text || busy) return;

    busy = true;
    $("send").disabled = true;
    addMessage(text, "user");
    prompt.value = "";
    setStatus("THINKING");

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: text, mode })
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(data.error || `Server error ${response.status}`);
      }

      const answer =
        data.reply || data.response || data.text ||
        "Server ne response diya, lekin reply field nahi mili.";

      addMessage(answer);
      speak(answer);
      setStatus("JARVIS READY");
    } catch (err) {
      addMessage(
        "Connection error: " + err.message +
        "\nCheck that the backend is running and /api/chat is configured.",
        "assistant",
        true
      );
      setStatus("CONNECTION ERROR");
    } finally {
      busy = false;
      $("send").disabled = false;
      prompt.focus();
    }
  }

  function startVoice() {
    const SpeechRecognition =
      window.SpeechRecognition || window.webkitSpeechRecognition;

    if (!SpeechRecognition) {
      addMessage(
        "Is browser mein speech recognition available nahi hai. " +
        "Chrome ya Edge mein microphone permission ke saath try karein.",
        "assistant",
        true
      );
      return;
    }

    if (recognition) {
      recognition.abort();
      recognition = null;
    }

    recognition = new SpeechRecognition();
    recognition.lang = "en-IN";
    recognition.interimResults = false;
    recognition.continuous = false;

    recognition.onstart = () => setStatus("LISTENING");
    recognition.onresult = (event) => {
      const text = event.results[0][0].transcript;
      prompt.value = text;
      sendCommand(text);
    };
    recognition.onerror = (event) => {
      setStatus("VOICE ERROR");
      addMessage("Voice input error: " + event.error, "assistant", true);
    };
    recognition.onend = () => {
      if (!busy) setStatus("JARVIS READY");
      recognition = null;
    };

    try {
      recognition.start();
    } catch (err) {
      addMessage("Microphone start nahi hua: " + err.message, "assistant", true);
    }
  }

  form.addEventListener("submit", (event) => {
    event.preventDefault();
    sendCommand(prompt.value);
  });

  mic.addEventListener("click", startVoice);

  // Tab activates voice when you're not typing in an input.
  document.addEventListener("keydown", (event) => {
    if (event.key === "Tab" &&
        !event.shiftKey &&
        document.activeElement !== prompt &&
        document.activeElement.tagName !== "INPUT" &&
        document.activeElement.tagName !== "TEXTAREA") {
      event.preventDefault();
      startVoice();
    }

    if (event.key === "Escape") {
      $("settings").style.display = "none";
      if ("speechSynthesis" in window) window.speechSynthesis.cancel();
    }
  });

  $("chatMode").addEventListener("click", () => {
    mode = "chat";
    $("subtitle").textContent = "Chat Mode";
    setStatus("CHAT MODE");
  });

  $("writeMode").addEventListener("click", () => {
    mode = "writing";
    $("subtitle").textContent = "Writing Mode";
    setStatus("WRITING MODE");
    prompt.placeholder = "What should JARVIS write?";
  });

  $("settingsBtn").addEventListener("click", () => {
    const panel = $("settings");
    panel.style.display =
      panel.style.display === "block" ? "none" : "block";
  });

  $("closeSettings").addEventListener("click", () => {
    $("settings").style.display = "none";
  });

  setStatus("JARVIS READY");
})();
