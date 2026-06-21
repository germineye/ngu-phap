/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 *
 * This file is part of ngu-phap.
 *
 * Copyright (c) 2025 germineye
 */

// --- TÍNH NĂNG BẢO MẬT: CHẶN CHUỘT PHẢI & PHÍM TẮT SOI CODE ---
// Lưu ý: chặn này chỉ làm người dùng thường khó soi code hơn, không phải bảo mật thật.
document.addEventListener("contextmenu", e => e.preventDefault());
document.addEventListener("keydown", e => {
  const key = e.key.toLowerCase();

  if (
    e.key === "F12" ||
    (e.ctrlKey && e.shiftKey && ["i", "j", "c"].includes(key)) ||
    (e.ctrlKey && key === "u")
  ) {
    e.preventDefault();
  }
});

const BUILTIN_MODEL = "chrome-built-in";
const openAIEndpoint = "https://api.openai.com/v1/chat/completions";
const geminiEndpoint = "https://generativelanguage.googleapis.com/v1beta/models";

let apiKey = "";
let modelType = "gemini";
let modelName = "gemini-3-flash-preview";

const editorPrompt = `
You are an expert multilingual assistant.

DETERMINE THE INPUT LANGUAGE:

1. If the input is in ENGLISH or FRENCH:
  - Act as an EDITOR.
  - Provide exactly 3 versions:
    a) Grammar Correction Only: Fix only grammatical or spelling mistakes while preserving the original tone, mood, and word choice as much as possible.
    b) Natural Paraphrase: Correct grammar and rephrase slightly so the sentence sounds fluent and natural to a native speaker, while keeping the same nuance and intent as the original.
    c) Formalized Version (Conditional): If the text contains slang, abbreviations, or overly casual phrasing, rewrite it into a grammatically correct and moderately formal version (not overly stiff). If the input is already formal enough, skip this version.
  - All versions must be in the SAME language as the input.

2. If the input is in ANY OTHER LANGUAGE (e.g., Vietnamese, Japanese, etc.):
  - Act as a TRANSLATOR to English.
  - Provide exactly 2 versions:
    a) Natural Translation: Sounds fluent and natural to a native speaker.
    b) Professional Translation: Formal and structured English.

RULES:
- Output ONLY the rewritten/translated sentences.
- Separate each version strictly with the delimiter:
---
- DO NOT add any explanation, titles, or introductions.
`;

const apiKeyInput = document.getElementById("api-key");
const modelSelect = document.getElementById("model-select");
const toneSelect = document.getElementById("tone-select");
const lengthSelect = document.getElementById("length-select");
const userInput = document.getElementById("user-input");
const generateBtn = document.getElementById("generate-btn");
const resultContainer = document.getElementById("result");
const statusText = document.getElementById("status");

const STORAGE_KEY = "ngu_phap_api_key";

// --- KHUNG THÔNG BÁO ĐÃ COPY ---
const toast = document.createElement("div");
toast.className = "toast-msg";
toast.innerText = "✨ đã copy!";
document.body.appendChild(toast);

let toastTimeout;

function showToast() {
  toast.classList.add("show");
  clearTimeout(toastTimeout);
  toastTimeout = setTimeout(() => {
    toast.classList.remove("show");
  }, 2000);
}
// --------------------------------

function loadApiKey() {
  const savedKey = localStorage.getItem(STORAGE_KEY);

  if (savedKey) {
    apiKeyInput.value = savedKey;
  }
}

function saveApiKey(key) {
  localStorage.setItem(STORAGE_KEY, key);
}

function isBuiltInMode() {
  return modelSelect.value === BUILTIN_MODEL;
}

function setStatus(message = "") {
  statusText.textContent = message;
  statusText.style.opacity = message ? "1" : "0";
}

function updateModeUI() {
  const builtIn = isBuiltInMode();

  apiKeyInput.classList.toggle("hidden", builtIn);
  toneSelect.classList.toggle("hidden", !builtIn);
  lengthSelect.classList.toggle("hidden", !builtIn);

  userInput.placeholder = builtIn
    ? "nhập câu muốn paraphrase/chỉnh lại bằng Chrome Built-in AI"
    : "muốn nói gì nói đi (bằng tiếng Anh/Pháp, nếu ngôn ngữ khác thì sẽ dịch sang Anh)";

  resultContainer.innerHTML = "";

  if (builtIn) {
    setStatus("local mode: không cần API key, chạy bằng Chrome Built-in AI");
  } else {
    setStatus("cloud mode: cần API key");
  }
}

function createResultBlock(text, index = 0) {
  const div = document.createElement("div");

  div.className = "result-block";
  if (index === 2) div.classList.add("formal-font");

  div.style.animationDelay = `${index * 0.2}s`;
  div.innerText = text.trim();

  div.addEventListener("click", async () => {
    try {
      await navigator.clipboard.writeText(div.innerText);
      showToast();
    } catch (err) {
      console.error("Lỗi copy:", err);
    }
  });

  return div;
}

function renderError(message) {
  resultContainer.innerHTML = "";
  const div = createResultBlock(`⚠️ Lỗi: ${message}`);
  div.classList.add("error-block");
  resultContainer.appendChild(div);
}

function renderResults(content) {
  setStatus("");
  resultContainer.innerHTML = "";

  const parts = content
    .split(/\n+---\n+/)
    .map(part => part.trim())
    .filter(Boolean);

  if (!parts.length) {
    const div = createResultBlock("⚠️ Model trả về kết quả rỗng hoặc không đúng định dạng.");
    div.classList.add("error-block");
    resultContainer.appendChild(div);
    return;
  }

  parts.forEach((part, index) => {
    resultContainer.appendChild(createResultBlock(part, index));
  });
}

function getRewriterOptions() {
  return {
    tone: toneSelect.value,
    format: "plain-text",
    length: lengthSelect.value,
    sharedContext:
      "Rewrite the user's text. Fix grammar if needed, preserve the original meaning, and make the result natural. Return only the rewritten text."
  };
}

async function generateWithRewriter(text) {
  if (!("Rewriter" in self)) {
    throw new Error("Rewriter API chưa được bật. Bật chrome://flags/#rewriter-api-for-gemini-nano rồi relaunch Chrome.");
  }

  const options = getRewriterOptions();
  const availability = await Rewriter.availability(options);

  if (availability === "unavailable") {
    throw new Error("Rewriter API đang unavailable trên Chrome/máy này.");
  }

  const rewriter = await Rewriter.create({
    ...options,
    monitor(monitor) {
      monitor.addEventListener("downloadprogress", event => {
        const loaded = typeof event.loaded === "number" ? event.loaded : 0;
        const total = typeof event.total === "number" && event.total > 0 ? event.total : 1;
        const percent = Math.min(100, Math.round((loaded / total) * 100));
        setStatus(`đang tải model... ${percent}%`);
      });
    }
  });

  try {
    return await rewriter.rewrite(text, {
      context: "Return only one polished rewritten version. No explanation, no title."
    });
  } finally {
    if (typeof rewriter.destroy === "function") {
      rewriter.destroy();
    }
  }
}

async function generateWithPromptApiFallback(text) {
  if (!("LanguageModel" in self)) {
    throw new Error("Chrome này chưa có Prompt API/LanguageModel để fallback.");
  }

  const availability = await LanguageModel.availability();

  if (availability === "unavailable") {
    throw new Error("Prompt API đang unavailable trên Chrome/máy này.");
  }

  const session = await LanguageModel.create({
    systemPrompt: editorPrompt,
    monitor(monitor) {
      monitor.addEventListener("downloadprogress", event => {
        const loaded = typeof event.loaded === "number" ? event.loaded : 0;
        const total = typeof event.total === "number" && event.total > 0 ? event.total : 1;
        const percent = Math.min(100, Math.round((loaded / total) * 100));
        setStatus(`đang tải model... ${percent}%`);
      });
    }
  });

  try {
    return await session.prompt(`User input:\n${text}`);
  } finally {
    if (typeof session.destroy === "function") {
      session.destroy();
    }
  }
}

async function generateWithChromeBuiltInAI(text) {
  try {
    return await generateWithRewriter(text);
  } catch (rewriterError) {
    console.warn("Rewriter failed, trying Prompt API fallback:", rewriterError);
    setStatus("Rewriter fail, đang thử Prompt API fallback...");
    return await generateWithPromptApiFallback(text);
  }
}

async function generateWithCloudApi(text) {
  apiKey = apiKeyInput.value.trim();

  if (!apiKey) {
    alert("API key đâu?");
    apiKeyInput.focus();
    return "";
  }

  saveApiKey(apiKey);

  modelName = modelSelect.value;
  modelType = modelName.startsWith("gemini") ? "gemini" : "gpt";

  let content = "";
  let response;

  if (modelType === "gpt") {
    response = await fetch(openAIEndpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: modelName,
        messages: [
          { role: "system", content: editorPrompt },
          { role: "user", content: text }
        ],
        temperature: 0.7
      })
    });
  } else {
    response = await fetch(`${geminiEndpoint}/${modelName}:generateContent?key=${apiKey}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [
          {
            role: "user",
            parts: [{ text: `${editorPrompt}\n\nUser input:\n${text}` }]
          }
        ]
      })
    });
  }

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error?.message || data.error?.code || `HTTP Error ${response.status}`);
  }

  if (modelType === "gpt") {
    content = data.choices?.[0]?.message?.content?.trim() || "";
  } else {
    content = data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || "";
  }

  return content;
}

async function generateText() {
  const text = userInput.value.trim();

  if (!text) return;

  resultContainer.innerHTML = "";
  setStatus(isBuiltInMode() ? "đang xử lý local bằng Chrome Built-in AI..." : "đang xử lý cloud...");
  generateBtn.disabled = true;

  try {
    const content = isBuiltInMode()
      ? await generateWithChromeBuiltInAI(text)
      : await generateWithCloudApi(text);

    if (content) renderResults(content);
  } catch (err) {
    console.error(err);
    setStatus("");
    renderError(err.message);
  } finally {
    generateBtn.disabled = false;
  }
}

apiKeyInput.addEventListener("keydown", e => {
  if (e.key === "Enter") {
    e.preventDefault();
    userInput.focus();
  }
});

userInput.addEventListener("keydown", e => {
  if (e.key === "Enter" && !e.shiftKey) {
    e.preventDefault();
    generateText();
  }
});

generateBtn.addEventListener("click", generateText);
modelSelect.addEventListener("change", updateModeUI);

document.addEventListener("DOMContentLoaded", () => {
  loadApiKey();
  updateModeUI();
});
