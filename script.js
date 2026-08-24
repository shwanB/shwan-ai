// ====== Shwan AI - Client-side JavaScript ======

const API_URL = '/api/generate';
let conversationHistory = [];
let currentImage = null;        // base64 string
let currentFile = null;         // { name, content }
let lastAIResponse = '';

// ====== بارکردنی مێژوو لە localStorage ======
function loadHistory() {
    const saved = localStorage.getItem('shwanChatHistory');
    if (saved) {
        try {
            conversationHistory = JSON.parse(saved);
        } catch (e) {
            console.error('هەڵە لە خوێندنەوەی مێژوو:', e);
        }
    }
}

function saveHistory() {
    localStorage.setItem('shwanChatHistory', JSON.stringify(conversationHistory));
}

// ====== ناردنی پەیام ======
async function sendMessage() {
    const input = document.getElementById('userInput');
    const chatBox = document.getElementById('chatBox');
    const typingIndicator = document.getElementById('typingIndicator');
    const sendButton = document.getElementById('sendButton');
    const errorMessage = document.getElementById('errorMessage');

    const message = input.value.trim();
    if (!message && !currentImage && !currentFile) return;

    // پیشاندانی پەیامی بەکارهێنەر
    if (message) {
        addMessage(message, 'user');
        conversationHistory.push({ role: 'user', content: message });
    }

    if (currentImage) {
        addImageMessage(currentImage);
        conversationHistory.push({ role: 'user', content: '[وێنەیەک]' });
    }

    if (currentFile) {
        addFileMessage(currentFile.name);
        conversationHistory.push({ role: 'user', content: `[فایل: ${currentFile.name}]` });
    }

    const promptToSend = message || 'تکایە ئەم وێنە/فایلە شیکاری بکە';

    input.value = '';
    input.style.height = 'auto';
    errorMessage.style.display = 'none';
    typingIndicator.style.display = 'block';
    sendButton.disabled = true;

    try {
        const requestBody = { prompt: promptToSend, history: conversationHistory };
        if (currentImage) requestBody.image = currentImage;
        if (currentFile) requestBody.file = { name: currentFile.name, content: currentFile.content };

        const response = await fetch(API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(requestBody)
        });

        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);

        const data = await response.json();
        lastAIResponse = data.response;

        setTimeout(() => {
            addMessage(data.response, 'ai');
            conversationHistory.push({ role: 'assistant', content: data.response });
            saveHistory();
        }, 400);

    } catch (error) {
        console.error('Error:', error);
        errorMessage.textContent = 'ببورە، کێشەیەک ڕوویدا. Shwan AI هەوڵ دەداتەوە! 😅';
        errorMessage.style.display = 'block';
    } finally {
        setTimeout(() => {
            typingIndicator.style.display = 'none';
            sendButton.disabled = false;
            chatBox.scrollTop = chatBox.scrollHeight;
            clearAttachments();
        }, 400);
    }
}

function clearAttachments() {
    currentImage = null;
    currentFile = null;
    document.getElementById('previewArea').innerHTML = '';
    document.getElementById('galleryInput').value = '';
    document.getElementById('cameraInput').value = '';
    document.getElementById('fileInput').value = '';
}

// ====== زیادکردنی پەیامەکان ======
function addMessage(text, type) {
    const chatBox = document.getElementById('chatBox');
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${type}-message`;

    if (type === 'ai') {
        const avatar = document.createElement('div');
        avatar.className = 'ai-avatar';
        avatar.textContent = '🤖';
        messageDiv.appendChild(avatar);
    }

    const contentDiv = document.createElement('div');
    contentDiv.className = 'message-content';
    contentDiv.textContent = text;
    messageDiv.appendChild(contentDiv);
    chatBox.appendChild(messageDiv);
    chatBox.scrollTop = chatBox.scrollHeight;
}

function addImageMessage(imageSrc) {
    const chatBox = document.getElementById('chatBox');
    const messageDiv = document.createElement('div');
    messageDiv.className = 'message user-message';
    const img = document.createElement('img');
    img.src = imageSrc;
    img.className = 'attached-image';
    messageDiv.appendChild(img);
    chatBox.appendChild(messageDiv);
    chatBox.scrollTop = chatBox.scrollHeight;
}

function addFileMessage(fileName) {
    const chatBox = document.getElementById('chatBox');
    const messageDiv = document.createElement('div');
    messageDiv.className = 'message user-message';
    const contentDiv = document.createElement('div');
    contentDiv.className = 'message-content';
    contentDiv.textContent = '📄 فایل: ' + fileName;
    messageDiv.appendChild(contentDiv);
    chatBox.appendChild(messageDiv);
    chatBox.scrollTop = chatBox.scrollHeight;
}

// ====== بەڕێوەبردنی وێنە ======
function handleImageUpload(event) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function(e) {
        currentImage = e.target.result;
        const previewArea = document.getElementById('previewArea');
        previewArea.innerHTML = '';
        const div = document.createElement('div');
        div.className = 'preview-item';
        div.innerHTML = `
            <img src="${currentImage}" alt="وێنە">
            <button onclick="clearAttachments()">✕</button>
        `;
        previewArea.appendChild(div);
    };
    reader.readAsDataURL(file);
    event.target.value = '';
}

// ====== بەڕێوەبردنی فایل ======
function handleFileUpload(event) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function(e) {
        currentFile = {
            name: file.name,
            content: e.target.result
        };
        const previewArea = document.getElementById('previewArea');
        previewArea.innerHTML = '';
        const div = document.createElement('div');
        div.className = 'preview-item';
        div.innerHTML = `
            <span>📄 ${file.name}</span>
            <button onclick="clearAttachments()">✕</button>
        `;
        previewArea.appendChild(div);
    };
    reader.readAsText(file);
    event.target.value = '';
}

// ====== فلتەری وێنە ======
function applyImageFilter(filterType) {
    if (!currentImage) return;

    const img = new Image();
    img.onload = function() {
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0);

        if (filterType === 'grayscale') {
            const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
            const data = imageData.data;
            for (let i = 0; i < data.length; i += 4) {
                const avg = (data[i] + data[i+1] + data[i+2]) / 3;
                data[i] = avg;
                data[i+1] = avg;
                data[i+2] = avg;
            }
            ctx.putImageData(imageData, 0, 0);
        }

        currentImage = canvas.toDataURL();

        const previewArea = document.getElementById('previewArea');
        previewArea.innerHTML = '';
        const div = document.createElement('div');
        div.className = 'preview-item';
        div.innerHTML = `
            <img src="${currentImage}" alt="وێنە">
            <button onclick="clearAttachments()">✕</button>
        `;
        previewArea.appendChild(div);
    };
    img.src = currentImage;
}

// ====== دەنگ: خوێندنەوەی وەڵام ======
function speakLastResponse() {
    if (!lastAIResponse) return;

    if ('speechSynthesis' in window) {
        const utterance = new SpeechSynthesisUtterance(lastAIResponse);
        utterance.lang = 'ckb'; // کوردی سۆرانی (گەر پشتگیری بکرێت)
        utterance.rate = 0.95;
        window.speechSynthesis.cancel();
        window.speechSynthesis.speak(utterance);
    } else {
        alert('وێبگەڕەکەت پشتگیری دەنگ ناکات.');
    }
}

// ====== دەنگ: ناسینەوەی قسە ======
function startVoiceInput() {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
        alert('وێبگەڕەکەت پشتگیری ناسینەوەی دەنگ ناکات.');
        return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = 'ckb'; // کوردی سۆرانی
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    recognition.onresult = function(event) {
        const transcript = event.results[0][0].transcript;
        document.getElementById('userInput').value = transcript;
    };

    recognition.onerror = function(event) {
        alert('هەڵە لە ناسینەوەی دەنگ: ' + event.error);
    };

    recognition.start();
}

// ====== پێشنیارەکان ======
function useSuggestion(element) {
    document.getElementById('userInput').value = element.textContent;
    sendMessage();
}

// ====== ڕێکخستنی textarea ======
function setupTextarea() {
    const textarea = document.getElementById('userInput');
    if (!textarea) return;

    textarea.addEventListener('input', function() {
        this.style.height = 'auto';
        this.style.height = Math.min(this.scrollHeight, 120) + 'px';
    });

    textarea.addEventListener('keydown', function(e) {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendMessage();
        }
    });
}

// ====== دەستپێکردن ======
document.addEventListener('DOMContentLoaded', function() {
    loadHistory();
    setupTextarea();
});