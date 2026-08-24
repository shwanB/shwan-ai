export default async function handler(req, res) {
    // CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') return res.status(200).end();
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

    const { prompt } = req.body;
    if (!prompt || prompt.trim() === '') {
        return res.status(400).json({ error: 'Prompt is required' });
    }

    try {
        const personality = `تۆ Shwan AI ـیت، AI ـەکی زیرەک و دۆستانە بە زمانی کوردی سۆرانی.
        دروستکەرەکەت شوانە، گەنجێکی زیرەک و داهێنەر لە دوز، کەلار.
        هەمیشە بە کوردی سۆرانی وەڵام بدەرەوە، دۆستانە بە، و هەندێک جار گاڵتەی خۆش بکە.`;

        // بەکارهێنانی مۆدێلی gemini-flash-latest
        const response = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent?key=${process.env.GEMINI_API_KEY}`,
            {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
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
            }
        );

        if (!response.ok) {
            const errorText = await response.text();
            console.error('Gemini API error:', response.status, errorText);
            return res.status(500).json({ 
                error: 'Gemini API failed', 
                details: errorText.substring(0, 500)
            });
        }

        const data = await response.json();
        
        let aiResponse = 'ببورە، وەڵام نەدۆزرایەوە.';
        if (data.candidates && data.candidates.length > 0) {
            aiResponse = data.candidates[0].content.parts[0].text.trim();
        }

        return res.status(200).json({ 
            response: aiResponse,
            model: 'gemini-flash-latest'
        });

    } catch (error) {
        console.error('Handler error:', error);
        return res.status(500).json({ 
            error: 'Internal server error',
            details: error.message
        });
    }
}