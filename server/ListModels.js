import fetch from "node-fetch";
import dotenv from "dotenv";

dotenv.config();

const API_KEY = process.env.GEMINI_API_KEY;

async function listModels() {
  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models?key=${API_KEY}`
    );

    const data = await response.json();

    if (data.models) {
      console.log("✅ Available Gemini Models:");
      data.models.forEach((model) => {
        console.log(`- ${model.name}`);
      });
    } else {
      console.error("❌ Error fetching models:", data);
    }
  } catch (err) {
    console.error("❌ Network error:", err.message);
  }
}

listModels();
