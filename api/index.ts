const express = require("express");
const { GoogleGenerativeAI } = require("@google/generative-ai");
const app = express();

app.use(express.json());

// Initialize Gemini AI
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

app.get("/", ( _req: any , res: { send: (arg0: string) => any; }) => res.send("Code Error Detection API - Ready"));

app.post("/analyze-intent", async (req: { body: { prompt: any; }; }, res: { status: (arg0: number) => { (): any; new(): any; json: { (arg0: { error: string; rawResponse?: any; message?: any; }): void; new(): any; }; }; json: (arg0: { success: boolean; prompt: any; analysis: any; timestamp: string; }) => void; }) => {
  try {
    const { prompt } = req.body;

    if (!prompt) {
      return res.status(400).json({ error: "Prompt is required" });
    }

    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

    const analysisPrompt = `
You are an expert code analysis assistant. Analyze the following user prompt related to code error detection and debugging.

User Prompt: "${prompt}"

Analyze this prompt and return a JSON response with the following structure (respond ONLY with valid JSON, no markdown or explanation):

{
  "intent": {
    "primary": "string - main intent (e.g., 'find_errors', 'understand_bug', 'get_suggestions', 'check_syntax', 'improve_code', 'security_check', 'performance_check', 'explain_error')",
    "secondary": ["array of related intents"],
    "confidence": "number 0-1 - how confident you are about the primary intent"
  },
  "errorType": {
    "categories": ["array of suspected error categories: 'syntax', 'runtime', 'logical', 'semantic', 'security', 'performance', 'memory', 'concurrency', 'type', 'null_pointer', 'undefined', 'unknown'"],
    "expectedSeverity": "string - expected severity ('critical', 'high', 'medium', 'low', 'unknown')",
    "confidence": "number 0-1"
  },
  "context": {
    "language": "string or null - programming language mentioned or implied",
    "framework": "string or null - framework mentioned (e.g., 'react', 'express', 'django')",
    "environment": "string or null - environment mentioned ('frontend', 'backend', 'mobile', 'fullstack')",
    "specificTechnology": ["array of specific technologies mentioned"]
  },
  "scope": {
    "targetArea": "string - what to analyze ('entire_codebase', 'specific_module', 'specific_function', 'file_type', 'unknown')",
    "filePattern": "string or null - file pattern if mentioned (e.g., '*.js', 'components/*')",
    "inclusionCriteria": ["array of what to include in analysis"],
    "exclusionCriteria": ["array of what to exclude from analysis"]
  },
  "actionRequired": {
    "type": "string - primary action ('scan_and_report', 'deep_analysis', 'quick_check', 'explain_issue', 'suggest_fix', 'validate_code')",
    "priority": "string - urgency ('immediate', 'normal', 'low')",
    "outputFormat": "string - desired output ('detailed_report', 'summary', 'list', 'annotated_code', 'unknown')"
  },
  "userExpertiseLevel": {
    "estimated": "string - estimated level ('beginner', 'intermediate', 'advanced', 'expert', 'unknown')",
    "indicators": ["array of clues that indicate expertise level"],
    "confidence": "number 0-1"
  },
  "keywords": {
    "technical": ["array of technical terms found"],
    "actionVerbs": ["array of action verbs used"],
    "errorIndicators": ["array of words indicating errors/problems"]
  },
  "ambiguityScore": "number 0-1 - how ambiguous the prompt is (0=clear, 1=very ambiguous)",
  "suggestedClarifications": ["array of questions to ask user for better understanding"],
  "overallConfidence": "number 0-1 - overall confidence in understanding the intent"
}

Provide accurate analysis based on the prompt content.`;

    const result = await model.generateContent(analysisPrompt);
    const response = await result.response;
    const text = response.text();

    // Parse the JSON response from Gemini
    let intentAnalysis;
    try {
      // Remove markdown code blocks if present
      const cleanedText = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      intentAnalysis = JSON.parse(cleanedText);
    } catch (parseError) {
      console.error("Error parsing Gemini response:", parseError);
      return res.status(500).json({ 
        error: "Failed to parse AI response", 
        rawResponse: text 
      });
    }

    // Return the structured intent analysis
    res.json({
      success: true,
      prompt: prompt,
      analysis: intentAnalysis,
      timestamp: new Date().toISOString()
    });

  } catch (error:any) {
    console.error("Error analyzing intent:", error);
    res.status(500).json({ 
      error: "Failed to analyze intent", 
      message: error?.message??"" 
    });
  }
});

app.listen(3000, () => console.log("Server ready on port 3000."));

module.exports = app;
