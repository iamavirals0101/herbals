import { GoogleGenerativeAI } from '@google/generative-ai';
import dotenv from 'dotenv';
dotenv.config();

// Ensure the API key is properly loaded
const apiKey = process.env.GEMINI_API_KEY;
if (!apiKey) {
  console.error('Missing GEMINI_API_KEY in environment variables');
  process.exit(1);
}

const genAI = new GoogleGenerativeAI(apiKey);

export const generateGeminiResponse = async (req, res) => {
  try {
    const { prompt } = req.body;
    
    if (!prompt) {
      return res.status(400).json({ error: 'Prompt is required' });
    }
    
    const model = genAI.getGenerativeModel({ model: 'models/gemini-1.5-flash' });
    
    const result = await model.generateContent(prompt);
    const text = result.response.text();
    
    res.status(200).json({ reply: text });
  } catch (err) {
    console.error('Gemini API error:', err);
    res.status(500).json({ error: `Gemini API error: ${err.message}` });
  }
};