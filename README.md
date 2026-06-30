# ngu-phap

`ngu-phap` là web sửa ngữ pháp / paraphrase đa ngôn ngữ.

- Không dịch.
- Không OpenAI.
- Một lần bấm = một kết quả.
- Nhập ngôn ngữ nào, app cố giữ nguyên ngôn ngữ đó.

## Chế độ

### Chrome AI

Chạy bằng AI có sẵn trong Chrome nếu trình duyệt và máy hỗ trợ. Không cần mã Gemini.

Nếu Chrome AI chưa chạy được, bật các flag sau rồi khởi động lại Chrome:

```txt
chrome://flags/#optimization-guide-on-device-model
chrome://flags/#prompt-api-for-gemini-nano-multimodal-input
chrome://flags/#writer-api-for-gemini-nano
chrome://flags/#rewriter-api-for-gemini-nano
```

Chrome AI có thể cần mạng ở lần đầu để tải model. Sau khi model đã có trên máy, app có thể chạy offline nếu thiết bị vẫn đáp ứng điều kiện của Chrome.

### Gemini

Dùng Gemini qua mạng. Người dùng cần mã truy cập từ Google AI Studio.

Model Gemini trong app:

- Gemini 3.5 Flash
- Gemini 3.1 Flash-Lite
- Gemini 3.1 Pro Preview

## Ngôn ngữ

Danh sách chọn trong app:

- Tự nhận diện
- Tiếng Việt
- English
- 日本語
- Français
- 官话

## Tuỳ chọn sửa câu

Phong cách:

- Không đổi
- Tự nhiên hơn
- Trang trọng hơn

Độ dài:

- Không đổi
- Ngắn hơn
- Dài hơn

## Offline

App có service worker để cache các file tĩnh:

- `index.html`
- `style.css`
- `script.js`
- `manifest.json`
- `favicon-96x96.png`

Gemini vẫn cần mạng. Chrome AI có thể chạy offline sau khi Chrome đã tải model.
