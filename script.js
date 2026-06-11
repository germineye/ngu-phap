// ==========================================================================
// 🛡️ 1. HỆ THỐNG BẢO MẬT & TRẢI NGHIỆM NGƯỜI DÙNG (Giữ nguyên từ bản gốc của mày)
// ==========================================================================

// Chặn click chuột phải
document.addEventListener('contextmenu', event => event.preventDefault());

// Chặn F12 và các tổ hợp phím soi code
document.addEventListener('keydown', function(e) {
    if (e.key === "F12" || 
        (e.ctrlKey && e.shiftKey && (e.key === "I" || e.key === "J" || e.key === "C")) || 
        (e.ctrlKey && e.key === "U")) {
        e.preventDefault();
        return false;
    }
});

// Hàm hiển thị thông báo Toast khi copy thành công
function showToast(message = "✨ đã copy!") {
    let toast = document.getElementById('toast');
    if (!toast) {
        toast = document.createElement('div');
        toast = document.body.appendChild(toast);
        toast.id = 'toast';
        // Style cơ bản cho toast nếu CSS cũ chưa có
        toast.style.position = 'fixed';
        toast.style.bottom = '20px';
        toast.style.right = '20px';
        toast.style.background = '#FFA8BC';
        toast.style.color = '#49494B';
        toast.style.padding = '10px 20px';
        toast.style.borderRadius = '8px';
        toast.style.fontFamily = 'Be Vietnam Pro';
        toast.style.fontWeight = 'bold';
        toast.style.zIndex = '9999';
    }
    toast.innerText = message;
    toast.style.display = 'block';
    setTimeout(() => { toast.style.display = 'none'; }, 2000);
}

// ==========================================================================
// 🧠 2. PHẦN XỬ LÝ AI BẰNG CHROME BUILT-IN API (Cắt máu ăn thề với Gemini Nano)
// ==========================================================================

// Cấu hình System Prompt tối thượng để ép Gemini Nano ra đúng format ban đầu của app
const SYSTEM_PROMPT = `
Mày là một chuyên gia ngôn ngữ học tối thượng, hoạt động độc lập trên thiết bị. Nhiệm vụ của mày là kiểm tra chuỗi văn bản đầu vào và xử lý theo đúng quy tắc nghiêm ngặt sau:

1. NẾU ĐẦU VÀO LÀ TIẾNG ANH (ENGLISH) HOẶC TIẾNG PHÁP (FRENCH):
Sửa lỗi ngữ pháp và trả về CHÍNH XÁC 3 phần, phân tách nhau bằng duy nhất dòng "---". Không thêm bất kỳ lời giải thích hay chữ thừa thãi nào ngoài 3 phần này:
Phần 1: Bản sửa lỗi ngữ pháp thuần túy (Grammar Correction Only).
---
Phần 2: Bản diễn đạt tự nhiên, bản xứ (Natural Paraphrase).
---
Phần 3: Bản văn phong trang trọng, cổ điển (Formalized Version).

2. NẾU ĐẦU VÀO LÀ BẤT KỲ NGÔN NGỮ NÀO KHÁC (Tiếng Việt, Tiếng Nhật, v.v.):
Dịch chuỗi đó sang tiếng Anh và trả về CHÍNH XÁC 2 phần, phân tách nhau bằng duy nhất dòng "---". Không thêm lời giải thích nào khác:
Phần 1: Bản dịch tự nhiên văn phong giao tiếp (Natural Translation).
---
Phần 2: Bản dịch chuyên nghiệp, trang trọng (Professional Translation).

LƯU Ý: Tuyệt đối tuân thủ dấu phân tách "---". Không kèm tiêu đề kiểu "Phần 1:", không kèm markdown bôi đậm tự chế. Chỉ xuất ra nội dung text và dấu phân tách.
`;

let aiSession = null;

// Hàm khởi tạo và kiểm tra AI trong trình duyệt (Tránh lợn què)
async function initBuiltInAI() {
    if (!window.ai || !window.ai.languageModel) {
        throw new Error("Trình duyệt của mày chưa bật Chrome Built-in AI flag. Vào chrome://flags để bật đi tao xem nào!");
    }

    const capabilities = await window.ai.languageModel.capabilities();
    if (capabilities.available === 'no') {
        throw new Error("Model Gemini Nano chưa được tải về máy hoặc phần cứng không hỗ trợ.");
    }

    // Nếu chưa tạo session hoặc session cũ bị chết, tạo mới với System Prompt định hình phong cách
    if (!aiSession) {
        aiSession = await window.ai.languageModel.create({
            systemPrompt: SYSTEM_PROMPT,
            temperature: 0.3, // Để kết quả ra chuẩn xác, ít bị "ngáo" văn phong
            topK: 3
        });
    }
    return aiSession;
}

// Hàm xử lý chính khi người dùng nhấn nút Submit (hoặc Trigger dịch thuật)
async function handleProcessLanguage(inputText) {
    const resultContainer = document.getElementById('result-container'); // Thay ID này bằng ID vùng chứa kết quả của mày
    if (!inputText.trim()) return;

    try {
        if (resultContainer) resultContainer.innerHTML = "<em>Đang rặn chữ cục bộ bằng Gemini Nano... Wait a sec...</em>";

        // Khởi chạy AI cục bộ
        const session = await initBuiltInAI();
        
        // Bắn prompt cho Nano xử lý
        const rawResponse = await session.prompt(inputText);
        
        // Xóa sạch container cũ để render các block mới
        if (resultContainer) {
            resultContainer.innerHTML = "";
            
            // Tách các khối bằng dấu "---" như Nano đã được ép format
            const blocks = rawResponse.split('---');
            
            blocks.forEach((blockText, index) => {
                const trimmedText = blockText.trim();
                if (!trimmedText) return;

                // Tạo thẻ bọc nội dung tương thích với style.css cũ của mày
                const blockDiv = document.createElement('div');
                blockDiv.className = `result-block block-${index + 1}`;
                blockDiv.innerText = trimmedText;
                
                // Giữ nguyên font Gothic độc quyền cho block thứ 3 nếu là edit tiếng Anh/Pháp
                if (index === 2) {
                    blockDiv.style.fontFamily = "'UnifrakturMaguntia', serif";
                    blockDiv.style.fontSize = "1.5rem";
                } else {
                    blockDiv.style.fontFamily = "'Be Vietnam Pro', sans-serif";
                }

                // Tính năng Click-to-copy bá đạo ban đầu của mày
                blockDiv.style.cursor = 'pointer';
                blockDiv.addEventListener('click', () => {
                    navigator.clipboard.writeText(trimmedText);
                    showToast();
                });

                resultContainer.appendChild(blockDiv);
            });
        }

    } catch (error) {
        console.error("Lỗi AI rồi mày ơi:", error);
        if (resultContainer) {
            resultContainer.innerHTML = `<div style="color: #FFA8BC; padding: 10px;">
                ❌ Lỗi: ${error.message}<br>
                Mở Console (nếu mày lách được trình chặn của chính mày) để xem chi tiết.
            </div>`;
        }
    }
}

// Logic bắt sự kiện từ nút bấm trên HTML gốc của mày
// (Hãy đảm bảo ID của nút bấm và ô Textarea khớp với các dòng dưới đây)
// Ép trực tiếp từ cấp độ document, chấp mọi loại selector hay ID!
document.addEventListener('keydown', function (e) {
    // 1. Kiểm tra xem có đúng là mày đang gõ trong một thẻ TEXTAREA nào đó không
    if (e.target && e.target.tagName === 'TEXTAREA') {
        
        // 2. Nếu bấm Enter và KHÔNG giữ phím Shift
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault(); // CHẶN ĐỨNG HOÀN TOÀN hành vi xuống dòng mặc định

            // Chạy hàm xử lý AI luôn và ngay
            handleProcessLanguage(e.target.value);
        }
    }
});

// Vẫn giữ nút bấm Submit cho chuột click
document.addEventListener('click', function (e) {
    // Nếu click trúng nút button hoặc submit trên trang
    if (e.target && (e.target.tagName === 'BUTTON' || e.target.id === 'submit-btn')) {
        const textarea = document.querySelector('textarea');
        if (textarea) {
            handleProcessLanguage(textarea.value);
        }
    }
});
