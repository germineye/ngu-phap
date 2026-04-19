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
document.addEventListener('contextmenu', e => e.preventDefault());
document.addEventListener('keydown', e => {
  // Chặn F12, Ctrl+Shift+I (Inspector), Ctrl+Shift+J (Console), Ctrl+U (View Source)
  if (e.key === 'F12' || 
     (e.ctrlKey && e.shiftKey && (e.key === 'I' || e.key === 'J' || e.key === 'C')) || 
     (e.ctrlKey && e.key === 'U')) {
    e.preventDefault();
  }
});

const openAIEndpoint = "https://api.openai.com/v1/chat/completions";
const geminiEndpoint = "https://generativelanguage.googleapis.com/v1beta/models";
let apiKey = "";
let modelType = "gemini";
let modelName = "gemini-3-flash-preview"; // Default theo model mới nhất trong ảnh

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
- ⚠️ Output ONLY the rewritten/translated sentences.
- ⚠️ Separate each version strictly with the delimiter:
---
- ⚠️ DO NOT add any explanation, titles, or introductions.
`;

const apiKeyInput = document.getElementById("api-key");
const modelSelect = document.getElementById("model-select");
const userInput = document.getElementById("user-input");
const resultContainer = document.getElementById("result");
const statusText = document.getElementById("status");

const STORAGE_KEY = 'ngu_phap_api_key';

function loadApiKey() {
  const savedKey = localStorage.getItem(STORAGE_KEY);
  if (savedKey) {
    apiKeyInput.value = savedKey;
  }
}

function saveApiKey(key) {
  localStorage.setItem(STORAGE_KEY, key);
}

async function generateText() {
  const text = userInput.value.trim();
  apiKey = apiKeyInput.value.trim();

  if (!apiKey) {
    alert("API key đâu?");
    apiKeyInput.focus();
    return;
  }
  
  saveApiKey(apiKey);
  if (!text) return;

  modelName = modelSelect.value;
  modelType = modelName.startsWith("gemini") ? "gemini" : "gpt";

  resultContainer.innerHTML = "";
  statusText.textContent = "đang xử lý...";
  statusText.style.opacity = "1";

  try {
    let content = "";
    let response;

    if (modelType === "gpt") {
      response = await fetch(openAIEndpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: modelName,
          messages: [
            { role: "system", content: editorPrompt },
            { role: "user", content: text },
          ],
          temperature: 0.7,
        }),
      });
    } else {
      response = await fetch(
        `${geminiEndpoint}/${modelName}:generateContent?key=${apiKey}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [
              { role: "user", parts: [{ text: `${editorPrompt}\n\nUser input:\n${text}` }] },
            ],
          }),
        }
      );
    }

    const data = await response.json();

    // Bắt lỗi rành mạch từ API (Sai key, hết hạn, model không tồn tại...)
    if (!response.ok) {
        throw new Error(data.error?.message || data.error?.code || `HTTP Error ${response.status}`);
    }

    if (modelType === "gpt") {
        content = data.choices?.[0]?.message?.content?.trim() || "";
    } else {
        content = data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || "";
    }

    statusText.textContent = "";

    // Fix regex chia đoạn để nhận diện mượt hơn
    const parts = content.split(/\n+---\n+/).filter(Boolean);
    if (!parts.length) {
      resultContainer.innerHTML = '<div class="result-block">⚠️ Model trả về kết quả rỗng hoặc không đúng định dạng.</div>';
      return;
    }

    parts.forEach((part, i) => {
      const div = document.createElement("div");
      div.className = "result-block";
      // Version thứ 3 là Formal Font
      if (i === 2) div.classList.add("formal-font");
      div.style.animationDelay = `${i * 0.2}s`;
      div.innerText = part.trim(); // innerText để chống XSS
      resultContainer.appendChild(div);
    });

  } catch (err) {
    console.error(err);
    statusText.textContent = "";
    resultContainer.innerHTML = `<div class="result-block" style="border: 1px solid var(--accent);">⚠️ Lỗi: ${err.message}</div>`;
  }
}

// Vá lỗi UX: Bấm Enter ở ô API Key sẽ nhảy xuống ô nhập liệu
apiKeyInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter") {
    e.preventDefault();
    userInput.focus();
  }
});

userInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter" && !e.shiftKey) {
    e.preventDefault();
    generateText();
  }
});

document.addEventListener('DOMContentLoaded', loadApiKey);
