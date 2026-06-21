# ngu-phap Chrome Built-in AI patch

Copy these files over your repo root:

- index.html
- script.js
- style.css

Then run locally:

```bash
python -m http.server 5173
```

Open:

```txt
http://localhost:5173
```

Chrome flags needed for local Rewriter API testing:

```txt
chrome://flags/#optimization-guide-on-device-model
chrome://flags/#prompt-api-for-gemini-nano-multimodal-input
chrome://flags/#writer-api-for-gemini-nano
chrome://flags/#rewriter-api-for-gemini-nano
```
