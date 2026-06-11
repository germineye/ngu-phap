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
  if (e.key === 'F12' || 
     (e.ctrlKey && e.shiftKey && (e.key === 'I' || e.key === 'J' || e.key === 'C')) || 
     (e.ctrlKey && e.key === 'U')) {
    e.preventDefault();
  }
});

// Prompt ép con Gemini Nano cục bộ xuất dữ liệu chuẩn format mảng phân tách bằng "---"
const editorPrompt = `
You are an expert multilingual assistant operating on-device.

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

// Khởi tạo các phần tử DOM chính xác theo file index.html của mày
const userInput = document.getElementById("user-input");
const resultContainer = document.getElementById("result");
const statusText = document.getElementById("status");

// --- KHUNG THÔNG BÁO ĐÃ COPY (Giữ nguyên UI ban đầu) ---
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

let aiSession = null;

// Hàm khởi tạo kết nối với Gemini Nano trong Chrome
async function initBuiltInAI() {
    if (!window.ai || !window.ai.languageModel) {
        throw new Error("Trình duyệt chưa bật Chrome Built-in AI flag. Vào chrome://flags bật 'Prompt API for Gemini Nano' với 'Optimization Guide On-Device Model' lên hộ tao cái!");
    }

    const capabilities = await window.ai.languageModel.capabilities();
    if (capabilities.available === 'no') {
        throw new Error("Model Gemini Nano chưa sẵn sàng hoặc phần cứng không hỗ trợ. Thử check lại trang thái tải model ngầm của Chrome.");
    }

    if (!aiSession) {
        aiSession = await window.ai.languageModel.create({
            systemPrompt: editorPrompt,
            temperature: 0.3, // Thấp để nó ra chuẩn xác, không bị biến tấu bậy bạ
            topK: 3
        });
    }
    return aiSession;
}

// Hàm xử lý chính khi người dùng nhấn Enter để chạy AI cục bộ
async function generateText() {
  const text = userInput.value.trim();
  if (!text) return;

  resultContainer.innerHTML = "";
  statusText.textContent = "đang xử lý cục bộ bằng Gemini Nano...";
  statusText.style.opacity = "1";

  try {
    const session = await initBuiltInAI();
    const content = await session.prompt(text);

    statusText.textContent = "";

    // Tách chuỗi theo dấu "---" đồng thời dọn khoảng trống thừa
    const parts = content.split('---').map(p => p.trim()).filter(Boolean);
    if (!parts.length) {
      resultContainer.innerHTML = '<div class="result-block">⚠️ Model trả về kết quả rỗng hoặc không đúng định dạng.</div>';
      return;
    }

    parts.forEach((part, i) => {
      const div = document.createElement("div");
      div.className = "result-block";
      
      // Áp font Gothic trang trọng cho khối thứ 3 nếu có
      if (i === 2) div.classList.add("formal-font");
      div.style.animationDelay = `${i * 0.2}s`;
      div.innerText = part; 

      // SỰ KIỆN CLICK ĐỂ COPY RỒI HIỆN TOAST
      div.addEventListener("click", async () => {
        try {
          await navigator.clipboard.writeText(div.innerText);
          showToast();
        } catch (err) {
          console.error("Lỗi copy:", err);
        }
      });

      resultContainer.appendChild(div);
    });

  } catch (err) {
    console.error(err);
    statusText.textContent = "";
    resultContainer.innerHTML = `<div class="result-block" style="border: 1px solid var(--accent);">⚠️ Lỗi: ${err.message}</div>`;
    alert("Lỗi rồi mày ơi: " + err.message);
  }
}

// BẮT SỰ KIỆN ENTER CHUẨN CHỈ TRÊN TEXTAREA (SHIFT + ENTER LÀ XUỐNG DÒNG)
if (userInput) {
    userInput.addEventListener("keydown", (e) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault(); // Khóa cứng hành vi nhảy xuống dòng mặc định
        generateText(); // Phù phép ra kết quả luôn
      }
    });
}
