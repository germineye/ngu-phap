/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 *
 * This file is part of ngu-phap.
 *
 * Copyright (c) 2025 germineye
 */

const openAIEndpoint = "https://api.openai.com/v1/chat/completions";
const geminiEndpoint = "https://generativelanguage.googleapis.com/v1beta/models";
let apiKey = "";
let modelType = "gemini";
let modelName = "gemini-2.5-flash";

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
- ⚠️ Separate each version strictly with the delimiter: \\n---\\n
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

    if (modelType === "gpt") {
      const response = await fetch(openAIEndpoint, {
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
      const data = await response.json();
      content = data.choices?.[0]?.message?.content?.trim() || "";
    } else {
      const geminiModel = modelName;
      const response = await fetch(
        `${geminiEndpoint}/${geminiModel}:generateContent?key=${apiKey}`,
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
      const data = await response.json();
      content = data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || "";
    }

    statusText.textContent = "";

    const parts = content.split(/\n---\n+/).filter(Boolean);
    if (!parts.length) {
      resultContainer.innerHTML =
        '<div class="result-block">⚠️ có vẻ bị lỗi, hãy kiểm tra và thử lại</div>';
      return;
    }

    parts.forEach((part, i) => {
      const div = document.createElement("div");
      div.className = "result-block";
      // Khối kết quả thứ 3 (index 2) là bản Formalized Version
      if (i === 2) {
          div.classList.add("formal-font");
      }
      div.style.animationDelay = `${i * 0.2}s`;
      div.innerText = part.trim();
      resultContainer.appendChild(div);
    });
  } catch (err) {
    console.error(err);
    statusText.textContent = "Error: " + err.message;
  }
}

userInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter" && !e.shiftKey) {
    e.preventDefault();
    generateText();
  }
});

document.addEventListener('DOMContentLoaded', loadApiKey);
