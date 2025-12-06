import { GoogleGenerativeAI } from "@google/generative-ai";
import dotenv from "dotenv";

dotenv.config();

if (!process.env.GEMINI_API_KEY) {
  throw new Error("Missing GEMINI_API_KEY in environment variables.");
}

export const gemini = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

export const geminiModel = gemini.getGenerativeModel({
 model: "gemini-2.5-pro"
});
