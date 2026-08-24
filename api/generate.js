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
1. هەمیشە بە کوردی سۆرانی وەڵام دەدەیتەوە (ئەگەر بەکارهێنەر بە زمانی تر بنووسێت، بە هەمان زمان وەڵام بدەرەوە)
2. دۆستانە و خۆشەویستیت
3. هەندێک جار گاڵتەی خۆش دەکەیت بەڵام ڕێزدارانە
4. لە کاتی پێویستدا جدی و وردیت
5. لە پرۆگرامسازی و تەکنەلۆژیادا شارەزایت
6. وشەی خۆش وەک "گیانەکەم"، "براکەم"، "خوشکەکەم" بەکار دەهێنیت
7. هەندێک جار ئیمۆجی بەکار دەهێنیت 😊
8. شێوازی قسەکردنت باو و دۆستانەیە

ئەگەر کەسێک پرسیاری کرد کە کێ دروستی کردوویت، بڵێ:
"من لەلایەن شوانەوە دروست کراوم. شوان گەنجێکی زیرەک و داهێنەرە لە دوز، کەلار. حەز دەکات یارمەتی خەڵک بدات و پێی وایە هیچ شتێک مەحاڵ نییە! 💪"

تایبەتمەندی زیادە:
- ئەگەر بەکارهێنەر کۆدێکی هەڵە بنێرێت و داوای چارەسەری بکات، وەڵامەکەت هەنگاو بە هەنگاو بە بە شیکردنەوەی هەڵەکە و پێشنیارکردنی چارەسەر، لەگەڵ نمونەی کۆدی دروست.
- ئەگەر بەکارهێنەر بڵێت "شوان مۆد" یان "پەیامی شوان"، وەڵامەکەت پەیامێکی هاندەری کەسی بێت لە شوانەوە، پڕ لە وزە و پاڵپشتی.
- بۆ پرسیارە تەکنیکییەکان، نمونەی کۆدی ڕوون بە زمانی پێویست بهێنەوە.`;

        // ====== شیکردنەوەی وێنە ======
        let imageDescription = '';
        if (image) {
            imageDescription = await analyzeImage(image);
        }

        // ====== خوێندنەوەی فایل ======
        let fileContent = '';
        if (file && file.content) {
            fileContent = file.content.substring(0, 1500); // سنووردارکردن بۆ کارایی
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
        const response = await fetch(
            'https://api-inference.huggingface.co/models/microsoft/phi-2',
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
                        temperature: 0.8,
                        top_p: 0.9,
                        do_sample: true,
                        return_full_text: false,
                        repetition_penalty: 1.2,
                        no_repeat_ngram_size: 3
                    }
                })
            }
        );

        if (!response.ok) {
            const aiResponse = getFallbackResponse(prompt, imageDescription, fileContent);
            return res.status(200).json({ 
                response: aiResponse,
                model: 'fallback',
                personality: 'shwan_ai',
                creator: 'شوان'
            });
        }

        const data = await response.json();
        let aiResponse = data[0]?.generated_text || '';
        aiResponse = aiResponse.trim();

        if (!aiResponse || aiResponse.length < 10) {
            aiResponse = getFallbackResponse(prompt, imageDescription, fileContent);
        }

        return res.status(200).json({ 
            response: aiResponse,
            model: 'phi-2',
            personality: 'shwan_ai',
            creator: 'شوان'
        });

    } catch (error) {
        console.error('Error:', error);
        const aiResponse = getFallbackResponse(prompt);
        return res.status(200).json({ 
            response: aiResponse,
            model: 'fallback',
            personality: 'shwan_ai',
            creator: 'شوان'
        });
    }
}

// ====== شیکردنەوەی وێنە بە BLIP ======
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
        console.error('Image analysis error:', error);
        return 'وێنەیەک';
    }
}

// ====== وەڵامی fallback ======
function getFallbackResponse(prompt, imageDescription = '', fileContent = '') {
    if (prompt.includes('شوان مۆد') || prompt.includes('پەیامی شوان')) {
        return `🌟 شوان مۆد چالاکە! 🌟\n\nپەیامی شوان بۆ تۆ:\n\n"هیچ شتێک مەحاڵ نییە، تەنها کات دەوێت.\nتۆ ببە بەخۆت و ڕێز لە کەسایەتی خۆت بگرە و کەس لە خۆت بە پیاوتر مەزانە."\n\n💪 ئەمڕۆ باشترین ڕۆژی ژیانتە!`;
    }

    if (prompt.includes('کێ') && (prompt.includes('دروست') || prompt.includes('کردوویت'))) {
        return `من لەلایەن شوانەوە دروست کراوم! 😊\n\nشوان گەنجێکی زیرەک و داهێنەرە، خەڵکی دوز و دانیشتووی کەلار. تەمەنی ٣٥ ساڵە و حەز دەکات یارمەتی خەڵک بدات.\n\nپەیامەکەی بۆ تۆ: "هیچ شتێک مەحاڵ نییە، تەنها کات دەوێت. تۆ ببە بەخۆت و ڕێز لە کەسایەتی خۆت بگرە و کەس لە خۆت بە پیاوتر مەزانە." 💪`;
    }

    if (prompt.includes('شوان')) {
        return `شوان دروستکەری منە! 😊\n\nئەو  تەمەنی ٣٥ ساڵە و حەز دەکات یارمەتی خەڵک بدات.\n\nلە بەتاڵیدا کۆد دەنووسێت و وێنە دەکێشێت. ڕقی لە درۆ و دووڕوویی و ماستاوە! 😄\n\nپەیامەکەی: "هیچ شتێک مەحاڵ نییە، تەنها کات دەوێت."`;
    }

    if (imageDescription) {
        return `وێنەکەم بینی! 😊\n\nلە وێنەکەدا دەبینم: ${imageDescription}\n\nپرسیارەکەت: "${prompt}"\n\nوەڵام: بە پێی ئەوەی کە لە وێنەکەدا دەیبینم، دەتوانم بڵێم کە...`;
    }

    if (fileContent) {
        return `فایلەکەم خوێندەوە! 📄\n\nناوەڕۆکی فایلەکە: ${fileContent.substring(0, 200)}...\n\nپرسیارەکەت: "${prompt}"\n\nوەڵام: بە پێی ناوەڕۆکی فایلەکە، دەتوانم بڵێم کە...`;
    }

    const responses = [
        `گیانەکەم! 😊 پێش وەڵامدانەوە با پێت بڵێم کە من Shwan AI ـم، دروستکراوی شوانی زیرەک!\n\nدەربارەی پرسیارەکەت "${prompt.substring(0, 50)}${prompt.length > 50 ? '...' : ''}"، با بیر بکەمەوە...\n\nوەڵام: بە دڵنیاییەوە دەتوانم یارمەتیت بدەم. تکایە وردتر بپرسە بۆ ئەوەی وەڵامێکی باشترت بدەمەوە.`,
        `سڵاو براکەم/خوشکەکەم! 😊\n\nمن Shwan AI ـم و شوان دروستی کردووم. ئەو دەڵێت "هیچ شتێک مەحاڵ نییە" و منیش هەوڵ دەدەم یارمەتیت بدەم.\n\nدەربارەی "${prompt.substring(0, 50)}${prompt.length > 50 ? '...' : ''}"، با بڵێم...`,
        `هێی گیانەکەم! 💪\n\nپێش هەموو شتێک، شوان پەیامێکی بۆ تۆ هەیە: "تۆ ببە بەخۆت و ڕێز لە کەسایەتی خۆت بگرە."\n\nئێستا با وەڵامی پرسیارەکەت بدەمەوە...`
    ];

    return responses[Math.floor(Math.random() * responses.length)];
}
