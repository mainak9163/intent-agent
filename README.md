https://intent-agent.vercel.app/analyze-intent

request example:
{
"prompt":"detect errors"
}

response example:
{
  "success": true,
  "prompt": "detect errors",
  "analysis": {
    "intent": {
      "primary": "find_errors",
      "secondary": [
        "check_syntax",
        "improve_code",
        "understand_bug"
      ],
      "confidence": 0.95
    },
    "errorType": {
      "categories": [
        "syntax",
        "runtime",
        "logical",
        "semantic",
        "unknown"
      ],
      "expectedSeverity": "unknown",
      "confidence": 0.1
    },
    "context": {
      "language": null,
      "framework": null,
      "environment": null,
      "specificTechnology": []
    },
    "scope": {
      "targetArea": "unknown",
      "filePattern": null,
      "inclusionCriteria": [],
      "exclusionCriteria": []
    },
    "actionRequired": {
      "type": "scan_and_report",
      "priority": "normal",
      "outputFormat": "unknown"
    },
    "userExpertiseLevel": {
      "estimated": "unknown",
      "indicators": [
        "brevity",
        "lack of technical detail"
      ],
      "confidence": 0.4
    },
    "keywords": {
      "technical": [
        "errors"
      ],
      "actionVerbs": [
        "detect"
      ],
      "errorIndicators": [
        "errors"
      ]
    },
    "ambiguityScore": 0.95,
    "suggestedClarifications": [
      "Please provide the code you want me to check for errors.",
      "What programming language is the code written in?",
      "Are you seeing any specific error messages or unexpected behavior?",
      "What kind of errors are you looking for (e.g., syntax errors, logical bugs, security vulnerabilities)?"
    ],
    "overallConfidence": 0.3
  },
  "timestamp": "2025-10-26T10:16:53.002Z"
}
