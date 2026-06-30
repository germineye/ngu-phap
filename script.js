/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 *
 * This file is part of ngu-phap.
 *
 * Copyright (c) 2025 germineye
 */

const CHROME_ENGINE = "chrome-built-in";
const GEMINI_ENGINE = "gemini";
const GEMINI_ENDPOINT = "https://generativelanguage.googleapis.com/v1beta/models";
const API_KEY_STORAGE_KEY = "ngu_phap_gemini_api_key";

const LANGUAGE_OPTIONS = {
  auto: {
    code: null,
    promptName: "the input language",
    uiName: "Tự nhận diện"
  },
  vi: {
    code: "vi",
    promptName: "Vietnamese",
    uiName: "Tiếng Việt"
  },
  en: {
    code: "en",
    promptName: "English",
    uiName: "English"
  },
  ja: {
    code: "ja",
    promptName: "Japanese",
    uiName: "日本語"
  },
  fr: {
    code: "fr",
    promptName: "French",
    uiName: "Français"
  },
  zh: {
    code: "zh",
    promptName: "Mandarin Chinese",
    uiName: "官话"
  }
};

const TONE_PROMPTS = {
  "as-is": "Keep the original style and tone unless a change is needed to fix awkward wording.",
  "more-casual": "Make the text sound more natural, fluent, and conversational.",
  "more-formal": "Make the text more formal and polished without making it stiff."
};

const LENGTH_PROMPTS = {
  "as-is": "Keep roughly the same length.",
  shorter: "Make the text shorter while preserving the core meaning.",
  longer: "Make the text longer only if it improves clarity and flow."
};

const engineSelect = document.getElementById("engine-select");
const geminiModelSelect = document.getElementById("gemini-model-select");
const apiKeyInput = document.getElementById("api-key");
const languageSelect = document.getElementById("language-select");
const toneSelect = document.getElementById("tone-select");
const lengthSelect = document.getElementById("length-select");
const userInput = document.getElementById("user-input");
const generateBtn = document.getElementById("generate-btn");
const resultContainer = document.getElementById("result");
const statusText = document.getElementById("status");
const modeStatus = document.getElementById("mode-status");
const networkStatus = document.getElementById("network-status");
const chromeHelp = document.getElementById("chrome-help");
const geminiHelp = document.getElementById("gemini-help");
const toast = document.getElementById("toast");
const geminiOnlyElements = document.querySelectorAll(".gemini-only");

let toastTimeout;

function isChromeMode() {
  return engineSelect.value === CHROME_ENGINE;
}

function isGeminiMode() {
  return engineSelect.value === GEMINI_ENGINE;
}

function getSelectedLanguage() {
  return LANGUAGE_OPTIONS[languageSelect.value] || LANGUAGE_OPTIONS.auto;
}

function setStatus(message = "") {
  statusText.textContent = message;
  statusText.classList.toggle("visible", Boolean(message));
}

function showToast() {
  toast.classList.add("show");
  clearTimeout(toastTimeout);
  toastTimeout = setTimeout(() => {
    toast.classList.remove("show");
  }, 1600);
}

function loadApiKey() {
  const savedKey = localStorage.getItem(API_KEY_STORAGE_KEY);
  if (savedKey) {
    apiKeyInput.value = savedKey;
  }
}

function saveApiKey(key) {
  localStorage.setItem(API_KEY_STORAGE_KEY, key);
}

function updateNetworkStatus() {
  networkStatus.textContent = navigator.onLine ? "online" : "offline";
}

function updateModeUI() {
  const geminiMode = isGeminiMode();

  geminiOnlyElements.forEach(element => {
    element.classList.toggle("hidden", !geminiMode);
  });

  chromeHelp.classList.toggle("hidden", geminiMode);
  geminiHelp.classList.toggle("hidden", !geminiMode);

  modeStatus.textContent = geminiMode ? "Gemini" : "Chrome AI";
  userInput.placeholder = geminiMode
    ? "nhập câu cần sửa bằng Gemini, app sẽ giữ nguyên ngôn ngữ gốc"
    : "nhập câu cần sửa bằng Chrome AI, app sẽ giữ nguyên ngôn ngữ gốc";

  resultContainer.innerHTML = "";
  setStatus(geminiMode ? "Gemini: cần mạng và API key." : "Chrome AI: chạy trên máy nếu trình duyệt hỗ trợ.");
}

function createResultBlock(text, isError = false) {
  const div = document.createElement("div");
  div.className = "result-block";
  div.classList.toggle("error-block", isError);

  const textSpan = document.createElement("span");
  textSpan.innerText = text.trim();
  div.appendChild(textSpan);

  if (!isError) {
    const copyBtn = document.createElement("button");
    copyBtn.className = "copy-btn";
    copyBtn.type = "button";
    copyBtn.innerText = "Copy";
    copyBtn.setAttribute("aria-label", "Copy text");

    copyBtn.addEventListener("click", async event => {
      event.stopPropagation();
      try {
        await navigator.clipboard.writeText(text.trim());
        showToast();
      } catch (err) {
        console.error(err);
      }
    });

    div.appendChild(copyBtn);
  }

  return div;
}

function renderError(message) {
  resultContainer.innerHTML = "";
  resultContainer.appendChild(createResultBlock(`Lỗi: ${message}`, true));
}

function renderResult(content) {
  setStatus("");
  resultContainer.innerHTML = "";

  const result = content.trim();

  if (!result) {
    renderError("AI trả về kết quả rỗng.");
    return;
  }

  resultContainer.appendChild(createResultBlock(result));
}

function buildInstruction() {
  const language = getSelectedLanguage();
  const languageRule = language.code
    ? `The text is in ${language.promptName}. The output must stay in ${language.promptName}.`
    : "Detect the input language and keep the output in that same language.";

  return [
    "Rewrite the user's text in the same language.",
    languageRule,
    "Fix grammar, spelling, punctuation, word choice, and awkward phrasing.",
    "Preserve the original meaning.",
    "Do not translate.",
    TONE_PROMPTS[toneSelect.value],
    LENGTH_PROMPTS[lengthSelect.value],
    "Return exactly one version.",
    "Return only the rewritten text. Do not add labels, explanations, quotes, or markdown fences."
  ].join("\n");
}

function buildChromeSharedContext() {
  const language = getSelectedLanguage();
  const languageContext = language.code
    ? `Input and output language: ${language.promptName}.`
    : "Detect the input language and keep the output in the same language.";

  return [
    "Rewrite multilingual text for grammar, clarity, and natural phrasing.",
    languageContext,
    "Preserve meaning. Do not translate. Return only one clean rewritten version."
  ].join(" ");
}

function getRewriterOptions() {
  const language = getSelectedLanguage();
  const options = {
    tone: toneSelect.value,
    format: "plain-text",
    length: lengthSelect.value,
    sharedContext: buildChromeSharedContext()
  };

  if (language.code) {
    options.expectedInputLanguages = [language.code];
    options.expectedContextLanguages = ["en", language.code];
    options.outputLanguage = language.code;
  }

  return options;
}

function getChromeFailureMessage() {
  return [
    "Chrome AI chưa dùng được trên trình duyệt hoặc thiết bị này.",
    "Hãy bật các Chrome flags bên dưới rồi mở lại Chrome, hoặc chuyển sang Gemini nếu bạn có API key."
  ].join(" ");
}

async function generateWithRewriter(text) {
  if (!("Rewriter" in self)) {
    throw new Error("Chrome chưa hỗ trợ công cụ sửa câu chính.");
  }

  const options = getRewriterOptions();
  const availability = await Rewriter.availability(options);

  if (availability === "unavailable") {
    throw new Error("Công cụ sửa câu chính chưa khả dụng.");
  }

  const rewriter = await Rewriter.create({
    ...options,
    monitor(monitor) {
      monitor.addEventListener("downloadprogress", event => {
        const loaded = typeof event.loaded === "number" ? event.loaded : 0;
        const total = typeof event.total === "number" && event.total > 0 ? event.total : 1;
        const percent = Math.min(100, Math.round((loaded / total) * 100));
        setStatus(`đang tải AI trên máy... ${percent}%`);
      });
    }
  });

  try {
    return await rewriter.rewrite(text, {
      context: buildInstruction()
    });
  } finally {
    if (typeof rewriter.destroy === "function") {
      rewriter.destroy();
    }
  }
}

async function generateWithPromptApiFallback(text) {
  if (!("LanguageModel" in self)) {
    throw new Error("Chrome chưa có chế độ sửa dự phòng.");
  }

  const availability = await LanguageModel.availability();

  if (availability === "unavailable") {
    throw new Error("Chế độ sửa dự phòng chưa khả dụng.");
  }

  const session = await LanguageModel.create({
    systemPrompt: buildInstruction(),
    monitor(monitor) {
      monitor.addEventListener("downloadprogress", event => {
        const loaded = typeof event.loaded === "number" ? event.loaded : 0;
        const total = typeof event.total === "number" && event.total > 0 ? event.total : 1;
        const percent = Math.min(100, Math.round((loaded / total) * 100));
        setStatus(`đang tải AI trên máy... ${percent}%`);
      });
    }
  });

  try {
    return await session.prompt(`Text:\n${text}`);
  } finally {
    if (typeof session.destroy === "function") {
      session.destroy();
    }
  }
}

async function generateWithChromeAI(text) {
  try {
    return await generateWithRewriter(text);
  } catch (rewriterError) {
    console.warn(rewriterError);
    setStatus("Cách sửa chính chưa chạy được, đang thử cách khác bằng Chrome AI...");
  }

  try {
    return await generateWithPromptApiFallback(text);
  } catch (fallbackError) {
    console.warn(fallbackError);
    throw new Error(getChromeFailureMessage());
  }
}

async function generateWithGemini(text) {
  if (!navigator.onLine) {
    throw new Error("Gemini cần mạng. Thiết bị đang offline.");
  }

  const apiKey = apiKeyInput.value.trim();

  if (!apiKey) {
    apiKeyInput.focus();
    throw new Error("Nhập Gemini API key trước đã.");
  }

  saveApiKey(apiKey);

  const modelName = geminiModelSelect.value;
  const response = await fetch(`${GEMINI_ENDPOINT}/${modelName}:generateContent?key=${apiKey}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [
        {
          role: "user",
          parts: [
            {
              text: `${buildInstruction()}\n\nText:\n${text}`
            }
          ]
        }
      ],
      generationConfig: {
        temperature: 0.3
      }
    })
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error?.message || data.error?.code || `HTTP Error ${response.status}`);
  }

  return data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || "";
}

async function generateText() {
  const text = userInput.value.trim();
  if (!text) return;

  resultContainer.innerHTML = "";
  setStatus(isChromeMode() ? "đang xử lý bằng Chrome AI..." : "đang xử lý bằng Gemini...");
  generateBtn.disabled = true;

  try {
    const content = isChromeMode()
      ? await generateWithChromeAI(text)
      : await generateWithGemini(text);

    renderResult(content);
  } catch (err) {
    console.error(err);
    setStatus("");
    renderError(err.message);
  } finally {
    generateBtn.disabled = false;
  }
}

function registerServiceWorker() {
  if (!("serviceWorker" in navigator)) return;

  window.addEventListener("load", () => {
    navigator.serviceWorker.register("service-worker.js").catch(err => {
      console.warn("Service worker registration failed:", err);
    });
  });
}

apiKeyInput.addEventListener("keydown", event => {
  if (event.key === "Enter") {
    event.preventDefault();
    userInput.focus();
  }
});

userInput.addEventListener("keydown", event => {
  if (event.key === "Enter" && !event.shiftKey) {
    event.preventDefault();
    generateText();
  }
});

generateBtn.addEventListener("click", generateText);
engineSelect.addEventListener("change", updateModeUI);
window.addEventListener("online", updateNetworkStatus);
window.addEventListener("offline", updateNetworkStatus);

document.addEventListener("DOMContentLoaded", () => {
  loadApiKey();
  updateNetworkStatus();
  updateModeUI();
  registerServiceWorker();
});
