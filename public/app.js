
(() => {
  "use strict";

  const $ = id => document.getElementById(id);
  const state = {
    mode: "voice",
    listening: false,
    busy: false,
    recognition: null,
    history: [],
    apiKey: sessionStorage.getItem("visionbot_key") || ""
  };

  const modes = {
    voice: {
      kicker: "VOICE INTERFACE",
      title: "Speak to J.A.R.V.I.S.",
      description: "Press Tab or tap the core to start voice mode."
    },
    chat: {
      kicker: "CHAT INTERFACE",
      title: "Chat with J.A.R.V.I.S.",
      description: "Type your message and get an AI response."
    },
    writing: {
      kicker: "WRITING INTERFACE",
      title: "Writing Studio",
      description: "Create drafts, emails, and polished text."
    }
  };

  let toastTimer;

  function toast(message) {
    const el = $("toast");
    el.textContent = message;
    el.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => el.classList.remove("show"), 3500);
  }

  function setConnection(text, good = false) {
    $("connectionLabel").textContent = text;
    $("connectionLabel").style.color = good ? "var(--green)" : "";
  }

  function setMode(mode) {
    if (!modes[mode]) return;

    stopVoice(false);
    state.mode = mode;

    document.querySelectorAll(".view").forEach(el =>
      el.classList.add("hidden")
    );
    $(`${mode}View`).classList.remove("hidden");

    document.querySelectorAll(".nav-item").forEach(button => {
      button.classList.toggle("active", button.dataset.mode === mode);
    });

    $("modeKicker").textContent = modes[mode].kicker;
    $("modeTitle").textContent = modes[mode].title;
    $("modeDescription").textContent = modes[mode].description;

    closeSettings();

    if (mode === "chat") setTimeout(() => $("chatInput").focus(), 50);
    if (mode === "writing") setTimeout(() => $("writingTask").focus(), 50);
  }

  function openSettings() {
    stopVoice(false);
    $("settingsOverlay").classList.remove("hidden");
    $("settingsClose").focus();
  }

  function closeSettings() {
    $("settingsOverlay").classList.add("hidden");
  }

  async function checkServer() {
    try {
      const response = await fetch("/api/status", {
        cache: "no-store"
      });

      if (!response.ok) throw new Error("Server unavailable");

      setConnection("SERVER ONLINE", true);
    } catch {
      setConnection("SERVER STATUS UNKNOWN");
    }
  }

  function createRecognition() {
    const SpeechRecognition =
      window.SpeechRecognition || window.webkitSpeechRecognition;

    if (!SpeechRecognition) {
      toast("Voice recognition is unavailable in this browser. Try Chrome or Edge.");
      return null;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = "en-IN";
    recognition.interimResults = true;
    recognition.continuous = false;
    recognition.maxAlternatives = 1;

    recognition.onstart = () => {
      state.listening = true;
      $("voiceView").classList.add("listening");
      $("voiceStatus").textContent = "LISTENING";
      $("sessionState").textContent = "● LISTENING";
      $("voiceCaption").textContent = "I'm listening. Speak now.";
      $("voiceToggle").textContent = "Listening…";
      $("voiceStop").disabled = false;
    };

    recognition.onresult = event => {
      let finalText = "";
      let interimText = "";

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const text = event.results[i][0].transcript;
        if (event.results[i].isFinal) finalText += text;
        else interimText += text;
      }

      const visibleText = (finalText || interimText).trim();

      if (visibleText) {
        $("transcriptText").textContent = visibleText;
      }

      if (finalText.trim()) {
        sendToAI(finalText.trim(), "voice");
      }
    };

    recognition.onerror = event => {
      const errors = {
        "not-allowed": "Allow microphone access in your browser settings.",
        "no-speech": "No speech detected. Press Tab and try again.",
        "audio-capture": "No microphone detected.",
        "network": "Speech recognition needs a working network connection."
      };

      $("voiceCaption").textContent =
        errors[event.error] || `Voice error: ${event.error}`;
    };

    recognition.onend = () => {
      state.listening = false;
      $("voiceView").classList.remove("listening");
      $("voiceStatus").textContent = "VOICE STANDBY";
      $("sessionState").textContent = "● STANDBY";
      $("voiceToggle").textContent = "🎙 Start listening";
      $("voiceStop").disabled = true;
    };

    return recognition;
  }

  function startVoice() {
    if (state.listening) return;

    if (!state.recognition) {
      state.recognition = createRecognition();
    }

    if (!state.recognition) return;

    $("voiceCaption").textContent = "Requesting microphone permission…";

    try {
      state.recognition.start();
    } catch {
      toast("Voice is already starting. Wait a moment and try again.");
    }
  }

  function stopVoice(updateText = true) {
    if (state.recognition && state.listening) {
      try {
        state.recognition.stop();
      } catch {}
    }

    state.listening = false;
    $("voiceView").classList.remove("listening");
    $("voiceStatus").textContent = "VOICE STANDBY";
    $("sessionState").textContent = "● STANDBY";
    $("voiceToggle").textContent = "🎙 Start listening";
    $("voiceStop").disabled = true;

    if (updateText) {
      $("voiceCaption").textContent = "Voice session stopped.";
    }
  }

  function addMessage(type, text) {
    const row = document.createElement("div");
    row.className = `message ${type}`;

    const avatar = document.createElement("b");
    avatar.textContent = type === "user" ? "Y" : "V";

    const content = document.createElement("div");
    const name = document.createElement("small");
    name.textContent = type === "user"
      ? "YOU"
      : "J.A.R.V.I.S. · GEMINI 2.5 FLASH";

    const paragraph = document.createElement("p");
    paragraph.textContent = text;

    content.append(name, paragraph);
    row.append(avatar, content);
    $("chatMessages").appendChild(row);
    $("chatMessages").scrollTop = $("chatMessages").scrollHeight;

    return paragraph;
  }

  async function sendToAI(message, source) {
    message = String(message || "").trim();

    if (!message || state.busy) return;

    state.busy = true;
    let answerElement = null;

    if (source === "chat") {
      addMessage("user", message);
      answerElement = addMessage("assistant", "Thinking…");
      $("chatInput").value = "";
    }

    if (source === "voice") {
      $("voiceCaption").textContent = "Thinking about your request…";
    }

    if (source === "writing") {
      $("writingResult").classList.remove("hidden");
      $("draftText").textContent = "Preparing your draft…";
    }

    const prompt = source === "writing"
      ? "You are J.A.R.V.I.S., assisting in Writing Studio. Create a polished, ready-to-use result for this request. Follow the requested format.\n\nRequest: " + message
      : message;

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: prompt,
          history: state.history.slice(-12),
          provider: "gemini",
          model: "gemini-2.5-flash",
          role: "jarvis",
          ...(state.apiKey ? { apiKey: state.apiKey } : {})
        })
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(data.error || `AI request failed (${response.status})`);
      }

      const answer = String(
        data.answer || data.reply || data.text || ""
      ).trim();

      if (!answer) {
        throw new Error("Empty response received from the server.");
      }

      state.history.push(
        { role: "user", text: message },
        { role: "model", text: answer }
      );
      state.history = state.history.slice(-24);

      if (source === "chat") {
        answerElement.textContent = answer;
      }

      if (source === "writing") {
        $("draftText").textContent = answer;
      }

      if (source === "voice") {
        $("voiceCaption").textContent =
          answer.length > 180 ? answer.slice(0, 177) + "…" : answer;
        speak(answer);
      }

      setConnection("AI RESPONSE RECEIVED", true);

    } catch (error) {
      const messageText = error.message || "Could not connect to AI.";

      if (source === "chat" && answerElement) {
        answerElement.textContent = "Request failed: " + messageText;
      } else if (source === "writing") {
        $("draftText").textContent = "Request failed: " + messageText;
      } else {
        $("voiceCaption").textContent = messageText;
      }

      setConnection("AI REQUEST FAILED");
      toast(messageText);

    } finally {
      state.busy = false;
    }
  }

  function speak(text) {
    if (!("speechSynthesis" in window)) return;

    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = "en-IN";
    utterance.rate = 1;
    window.speechSynthesis.speak(utterance);
  }

  function saveSessionKey() {
    const key = $("apiKeyInput").value.trim();

    if (!key) {
      toast("Paste your Gemini API key first.");
      return;
    }

    state.apiKey = key;
    sessionStorage.setItem("visionbot_key", key);
    $("apiKeyInput").value = "";
    $("keyStatus").textContent = "Saved for this browser tab session.";
    toast("Key saved for this tab session.");
  }

  function bindEvents() {
    $("settingsOpen").addEventListener("click", openSettings);
    $("settingsClose").addEventListener("click", closeSettings);
    $("settingsDone").addEventListener("click", closeSettings);

    $("settingsOverlay").addEventListener("click", event => {
      if (event.target === $("settingsOverlay")) closeSettings();
    });

    document.querySelectorAll("[data-mode]").forEach(button => {
      button.addEventListener("click", () => setMode(button.dataset.mode));
    });

    $("voiceCore").addEventListener("click", () => {
      state.listening ? stopVoice() : startVoice();
    });

    $("voiceToggle").addEventListener("click", () => {
      state.listening ? stopVoice() : startVoice();
    });

    $("voiceStop").addEventListener("click", () => stopVoice());

    $("chatForm").addEventListener("submit", event => {
      event.preventDefault();
      sendToAI($("chatInput").value, "chat");
    });

    $("chatInput").addEventListener("keydown", event => {
      if (event.key === "Enter" && !event.shiftKey) {
        event.preventDefault();
        $("chatForm").requestSubmit();
      }
    });

    $("writingForm").addEventListener("submit", event => {
      event.preventDefault();

      const task = $("writingTask").value.trim();

      if (!task) {
        toast("Enter a writing request first.");
        $("writingTask").focus();
        return;
      }

      sendToAI(task, "writing");
    });

    $("copyDraft").addEventListener("click", async () => {
      const text = $("draftText").textContent;

      try {
        await navigator.clipboard.writeText(text);
        toast("Draft copied.");
      } catch {
        toast("Clipboard access is unavailable. Select the draft and press Ctrl+C.");
      }
    });

    $("saveKey").addEventListener("click", saveSessionKey);

    document.addEventListener("keydown", event => {
      if (event.key === "Escape") {
        if (!$("settingsOverlay").classList.contains("hidden")) {
          closeSettings();
        } else {
          stopVoice();
        }
      }

      const active = document.activeElement;
      const editing = active &&
        (["INPUT", "TEXTAREA", "SELECT"].includes(active.tagName) ||
         active.isContentEditable);

      // Tab activates voice only in Voice Mode and outside text fields.
      if (
        event.key === "Tab" &&
        !event.shiftKey &&
        !event.repeat &&
        !editing &&
        state.mode === "voice" &&
        $("settingsOverlay").classList.contains("hidden")
      ) {
        event.preventDefault();
        startVoice();
      }
    });
  }

  bindEvents();
  setMode("voice");
  checkServer();
})();
