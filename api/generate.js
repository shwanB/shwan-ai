export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') return res.status(200).end();
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

    const { prompt } = req.body;
    if (!prompt || prompt.trim() === '') {
        return res.status(400).json({ error: 'Prompt is required' });
    }

    const personality = `تۆ Shwan AI ـیت، AI ـەکی زیرەک و دۆستانە بە زمانی کوردی سۆرانی.
    دروستکەرەکەت شوانە، گەنجێکی زیرەک و داهێنەر لە دوز، کەلار.
    هەمیشە بە کوردی سۆرانی وەڵام بدەرەوە، دۆستانە بە، و هەندێک جار گاڵتەی خۆش بکە.`;

    // لیستی مۆدێلەکان بۆ هەوڵدان
    const models = [
        { name: 'gemini-1.5-flash', version: 'v1beta' },
        { name: 'gemini-1.5-pro', version: 'v1beta' },
        { name: 'gemini-1.5-flash', version: 'v1' },
        { name: 'gemini-1.5-pro', version: 'v1' },
        { name: 'gemini-pro', version: 'v1beta' },
        { name: 'gemini-pro', version: 'v1' }
    ];

    let lastError = '';

    for (const model of models) {
        try {
            const url = `https://generativelanguage.googleapis.com/${model.version}/models/${model.name}:generateContent?key=${process.env.GEMINI_API_KEY}`;
            
            const response = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    contents: [
                        {
                            parts: [
                                { text: personality + "\n\nUser: " + prompt }
                            ]
                        }
                    ],
                    generationConfig: {
                        temperature: 0.7,
                        maxOutputTokens: 500,
                        topP: 0.9
                    }
                })
            });

            if (response.ok) {
                const data = await response.json();
                let aiResponse = 'ببورە، وەڵام نەدۆزرایەوە.';
                if (data.candidates && data.candidates.length > 0) {
                    aiResponse = data.candidates[0].content.parts[0].text.trim();
                }
                return res.status(200).json({ 
                    response: aiResponse,
                    model: model.name,
                    version: model.version
                });
            } else {
                const errText = await response.text();
                lastError = `${model.name} (${model.version}): ${response.status} - ${errText}`;
                console.error(lastError);
            }
        } catch (error) {
            lastError = `${model.name} (${model.version}): ${error.message}`;
            console.error(lastError);
        }
    }

    return res.status(500).json({ 
        error: 'All Gemini models failed',
        details: lastError
    });
}