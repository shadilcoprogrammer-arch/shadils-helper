const express = require('express');
const cors = require('cors');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static('public')); // serve frontend files

const PORT = 3000;

app.post('/api/generate', async (req, res) => {
    try {
        const { topic, purpose } = req.body;
        
        let difficultyStr = "- Make it suitable for a Class 10 student";
        if (purpose === 'JEE/NEET') {
            difficultyStr = "- Make it extremely tough, suitable for Indian JEE Advanced or NEET competitive exams.";
        } else if (purpose === 'Target') {
            difficultyStr = "- Make it suitable for Class 12 board exams.";
        }

        const prompt = `Generate 20 questions on the topic: "${topic}". Rules:
- Start from very easy and go to very difficult
- Divide into 5 levels (4 questions each)
- Include: MCQs, Short answers, Conceptual questions
- Provide answers also
${difficultyStr}
- Return STRICTLY a valid JSON object with a single "levels" array containing objects with "level" (1 to 5), and "questions" (an array of objects containing "question", "type", "options" (if MCQ, else null), and "answer").`;

        const apiKey = process.env.GEMINI_API_KEY;
        // Use native fetch
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                contents: [{ parts: [{ text: prompt }] }],
                generationConfig: {
                    responseMimeType: "application/json"
                }
            })
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`API error: ${errorText}`);
        }

        const data = await response.json();
        const output = data.candidates[0].content.parts[0].text;
        
        const questionsJson = JSON.parse(output);

        res.json({ success: true, data: questionsJson });

    } catch (error) {
        console.error('Error generating questions:', error);
        res.status(500).json({ success: false, error: 'Failed to generate questions.' });
    }
});

app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));
