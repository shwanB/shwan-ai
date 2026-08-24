export default async function handler(req, res) {
    // CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const { prompt, history = [], image = null, file = null } = req.body;

    if (!prompt || prompt.trim() === '') {
        return res.status(400).json({ error: 'Prompt is required' });
    }

    try {
        // ====== کەسایەتی Shwan AI ======
        const personality = `تۆ Shwan AI ـیت، AI ـەکی زیرەک و دۆستانە بە زمانی کوردی سۆرانی.
        
زانیاری دەربارەی دروستکەرەکەت (شوان):
- شوان تەمەنی ٣٥ ساڵە
- خەڵکی دوز ـە
- ئێستا لە کەلار دەژیت
- زمانی دایکی کوردی سۆرانییە
- کوردی، عەرەبی و ئینگلیزی دەزانێت
- گەنجێکی زیرەک و داهێنەرە
- حەز دەکات یارمەتی خەڵک بدات
- لە بەتاڵیدا کۆد دەنووسێت و وێنە دەکێشێت
- حەزی لە فێربوونی شتی نوێیە
- ڕقی لە درۆ و دووڕوویی و ماستاوە

پەیامی تایبەتی شوان بۆ هەمووان:
"هیچ شتێک مەحاڵ نییە، تەنها کات دەوێت. تۆ ببە بەخۆت و ڕێز لە کەسایەتی خۆتان بگرن و کەس لە خۆتان بە پیاوتر مەزانن."

تایبەتمەندییەکانی Shwan AI:
1. هەمیشە بە کوردی سۆرانی وەڵام دەدەیتەوە
2. دۆستانە و خۆشەویستیت
3. هەندێک جار گاڵتەی خۆش دەکەیت بەڵام ڕێزدارانە
4. لە کاتی پێویستدا جدی و وردیت
5. لە پرۆگرامسازی و تەکنەلۆژیادا شارەزایت
6. وشەی خۆش وەک "گیانەکەم"، "براکەم"، "خوشکەکەم" بەکار دەهێنیت
7. هەندێک جار ئیمۆجی بەکار دەهێنیت 😊
8. شێوازی قسەکردنت باو و دۆستانەیە

ئەگەر کەسێک پرسیاری کرد کە کێ دروستی کردوویت، بڵێ:
"من لەلایەن شوانەوە دروست کراوم. شوان گەنجێکی زیرەک و داهێنەرە لە دوز، کەلار. حەز دەکات یارمەتی خەڵک بدات و پێی وایە هیچ شتێک مەحاڵ نییە! 💪"`;

        // ====== شیکردنەوەی وێنە ======
        let imageDescription = '';
        if (image) {
            imageDescription = await analyzeImage(image);
        }

        // ====== خوێندنەوەی فایل ======
        let fileContent = '';
        if (file && file.content) {
            fileContent = file.content.substring(0, 1500);
        }

        // ====== دروستکردنی کۆنترێکست ======
        let conversationContext = personality;

        if (history && history.length > 0) {
            const recentHistory = history.slice(-5);
            for (const msg of recentHistory) {
                if (msg.role === 'user') {
                    conversationContext += `\n\nUser: ${msg.content}`;
                } else {
                    conversationContext += `\n\nShwan AI: ${msg.content}`;
                }
            }
        }

        if (imageDescription) {
            conversationContext += `\n\n[وێنەی نێردراو: ${imageDescription}]`;
        }

        if (fileContent) {
            conversationContext += `\n\n[ناوەڕۆکی فایل: ${fileContent}]`;
        }

        conversationContext += `\n\nUser: ${prompt}\n\nShwan AI:`;

        // ====== بانگکردنی Hugging Face ======
        // بە مۆدێلی گەورەتر و باشتر بۆ کوردی
        const apiResponse = await fetch(
            'https://api-inference.huggingface.co/models/mistralai/Mistral-7B-Instruct-v0.3',
            {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${process.env.HUGGINGFACE_API_KEY}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    inputs: conversationContext,
                    parameters: {
                        max_new_tokens: 300,
                        temperature: 0.7,
                        top_p: 0.9,
                        do_sample: true,
                        return_full_text: false
                    }
                })
            }
        );

        if (!apiResponse.ok) {
            console.error('Hugging Face API error:', apiResponse.status);
            // fallback زیرەک بەکار بهێنە
            const fallback = getSmartFallback(prompt, imageDescription, fileContent);
            return res.status(200).json({ 
                response: fallback,
                model: 'fallback',
                personality: 'shwan_ai',
                creator: 'شوان'
            });
        }

        const data = await apiResponse.json();
        let aiResponse = data[0]?.generated_text || '';

        aiResponse = aiResponse.trim();

        if (!aiResponse || aiResponse.length < 5) {
            aiResponse = getSmartFallback(prompt, imageDescription, fileContent);
        }

        return res.status(200).json({ 
            response: aiResponse,
            model: 'mistral-7b',
            personality: 'shwan_ai',
            creator: 'شوان'
        });

    } catch (error) {
        console.error('Error in handler:', error);
        const fallback = getSmartFallback(prompt, '', '');
        return res.status(200).json({ 
            response: fallback,
            model: 'fallback',
            personality: 'shwan_ai',
            creator: 'شوان'
        });
    }
}

// ====== شیکردنەوەی وێنە ======
async function analyzeImage(imageBase64) {
    try {
        const response = await fetch(
            'https://api-inference.huggingface.co/models/Salesforce/blip-image-captioning-large',
            {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${process.env.HUGGINGFACE_API_KEY}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ inputs: imageBase64 })
            }
        );
        if (response.ok) {
            const data = await response.json();
            return data[0]?.generated_text || 'وێنەیەک';
        }
        return 'وێنەیەک (نەتوانرا شیکاری بکرێت)';
    } catch (error) {
        return 'وێنەیەک';
    }
}

// ====== fallback زیرەک ======
function getSmartFallback(prompt, imageDescription = '', fileContent = '') {
    const lowerPrompt = prompt.toLowerCase();

    // پرسیار دەربارەی دروستکەر
    if (lowerPrompt.includes('کێ') && (lowerPrompt.includes('دروست') || lowerPrompt.includes('کردوویت') || lowerPrompt.includes('کردویت'))) {
        return `من لەلایەن شوانەوە دروست کراوم! 😊\n\nشوان گەنجێکی زیرەک و داهێنەرە، خەڵکی دوز و دانیشتووی کەلار. تەمەنی ٣٥ ساڵە و حەز دەکات یارمەتی خەڵک بدات.\n\nپەیامەکەی بۆ تۆ: "هیچ شتێک مەحاڵ نییە، تەنها کات دەوێت. تۆ ببە بەخۆت و ڕێز لە کەسایەتی خۆت بگرە و کەس لە خۆت بە پیاوتر مەزانە." 💪`;
    }

    // پرسیار دەربارەی شوان
    if (lowerPrompt.includes('شوان')) {
        return `شوان دروستکەری منە! 😊\n\nئەو گەنجێکی زیرەک و داهێنەرە لە دوز، ئێستا لە کەلار دەژیت. تەمەنی ٣٥ ساڵە و حەز دەکات یارمەتی خەڵک بدات.\n\nلە بەتاڵیدا کۆد دەنووسێت و وێنە دەکێشێت. ڕقی لە درۆ و دووڕوویی و ماستاوە! 😄\n\nپەیامەکەی: "هیچ شتێک مەحاڵ نییە، تەنها کات دەوێت."`;
    }

    // شوان مۆد
    if (lowerPrompt.includes('شوان مۆد') || lowerPrompt.includes('پەیامی شوان')) {
        return `🌟 شوان مۆد چالاکە! 🌟\n\nپەیامی شوان بۆ تۆ:\n\n"هیچ شتێک مەحاڵ نییە، تەنها کات دەوێت.\nتۆ ببە بەخۆت و ڕێز لە کەسایەتی خۆت بگرە و کەس لە خۆت بە پیاوتر مەزانە."\n\n💪 ئەمڕۆ باشترین ڕۆژی ژیانتە!`;
    }

    // سڵاو
    if (lowerPrompt.includes('سڵاو') || lowerPrompt.includes('سلاو') || lowerPrompt.includes('هێی') || lowerPrompt.includes('هی')) {
        return `سڵاو گیانەکەم! 😊 چۆنی؟ هیوادارم باش بیت. چیم لێ دەپرسیت؟`;
    }

    // چۆنی
    if (lowerPrompt.includes('چۆنی') || lowerPrompt.includes('چونی') || lowerPrompt.includes('باشی')) {
        return `زۆر باشم، سوپاس! 😊 من هەمیشە ئامادەم بۆ یارمەتیدانت. تۆ چۆنی؟`;
    }

    // یارمەتی
    if (lowerPrompt.includes('یارمەتی') || lowerPrompt.includes('یارمه‌تی') || lowerPrompt.includes('help')) {
        return `بە دڵنیاییەوە! من دەتوانم یارمەتیت بدەم لە:\n\n• پرسیارە گشتییەکان\n• کۆدی پرۆگرامسازی\n• چارەسەری هەڵەکان\n• شیکردنەوەی وێنە\n• خوێندنەوەی فایل\n\nتکایە بڵێ لە چی یارمەتیت بدەم؟ 😊`;
    }

    // سوپاس
    if (lowerPrompt.includes('سوپاس') || lowerPrompt.includes('سوپاس') || lowerPrompt.includes('دەست خۆش')) {
        return `شایەنی نییە گیانەکەم! 😊 هەر کات پێویستت بە من بوو، لێرەم.`;
    }

    // کۆد
    if (lowerPrompt.includes('کۆد') || lowerPrompt.includes('کۆدە') || lowerPrompt.includes('پرۆگرام') || lowerPrompt.includes('هەڵە')) {
        return `بۆ یارمەتی کۆد، تکایە کۆدەکەت بنێرە و بڵێ چ هەڵەیەک دەدات. من هەوڵ دەدەم هەنگاو بە هەنگاو شیکاری بکەم و نمونەی دروستت بدەم. 😊`;
    }

    // وێنە
    if (imageDescription) {
        return `وێنەکەم بینی! 😊\n\nلە وێنەکەدا دەبینم: ${imageDescription}\n\nپرسیارەکەت: "${prompt}"\n\nوەڵام: بە پێی وێنەکە، پێم وایە کە...`;
    }

    // فایل
    if (fileContent) {
        return `فایلەکەم خوێندەوە! 📄\n\nناوەڕۆکی فایلەکە: ${fileContent.substring(0, 200)}...\n\nپرسیارەکەت: "${prompt}"\n\nوەڵام: بە پێی ناوەڕۆکی فایلەکە، دەتوانم بڵێم کە...`;
    }

    // وەڵامی گشتی - هەوڵ بدە شتێکی زیاتر بڵێیت نەک تەنها "وردتر بپرسە"
    const generalResponses = [
        `گیانەکەم! 😊 دەربارەی "${prompt}"، من هەوڵ دەدەم یارمەتیت بدەم. بەڵام بۆ وەڵامێکی وردتر، تکایە زیاتر ڕوونی بکەرەوە یان نمونەیەکم بدە.`,
        `من Shwan AI ـم! دەربارەی "${prompt}"، ئەمە زۆر بە بایەخە. بەڵام من پێویستم بە زانیاری زیاترە بۆ ئەوەی وەڵامێکی دروست بدەم.`,
        `بە پێی زانیارییەکانم، "${prompt}" پرسیارێکی گرنگە. من ئامادەم وەڵامی بدەم، بەڵام تکایە ئاماژە بدە بە وردەکاری زیاتر.`
    ];
    return generalResponses[Math.floor(Math.random() * generalResponses.length)];
}