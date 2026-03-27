import { GoogleGenerativeAI } from "@google/generative-ai";
import dotenv from "dotenv";
dotenv.config();

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

async function run() {
  const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

  const prompt = "Explain how a for loop works in JavaScript.";

  const result = await model.generateContent(prompt);
  const response = await result.response;
  const text = response.text();

  console.log("Gemini says:\n", text);
}

run();
