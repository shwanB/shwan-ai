
export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') return res.status(200).end();
    if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' });

    const { prompt } = req.body;
    if (!prompt) return res.status(400).json({ error: 'Prompt required' });

    try {
        const personality = `تۆ Shwan AI ـیت، AI ـەکی زیرەک و دۆستانە بە زمانی کوردی سۆرانی. دروستکەرەکەت شوانە. هەمیشە بە کوردی سۆرانی وەڵام بدەرەوە.`;

        const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${process.env.GROQ_API_KEY}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                model: 'llama-3.1-8b-instant',
                messages: [
                    { role: 'system', content: personality },
                    { role: 'user', content: prompt }
                ],
                max_tokens: 500,
                temperature: 0.7
            })
        });

        if (!response.ok) {
            const errText = await response.text();
            console.error('Groq error:', response.status, errText);
            return res.status(500).json({ error: 'Groq API failed', details: errText });
        }

        const data = await response.json();
        const aiResponse = data.choices?.[0]?.message?.content?.trim() || 'ببورە، وەڵام نەدۆزرایەوە.';

        return res.status(200).json({ response: aiResponse });

    } catch (error) {
        console.error('Handler error:', error);
        return res.status(500).json({ error: 'Internal error' });
    }
}