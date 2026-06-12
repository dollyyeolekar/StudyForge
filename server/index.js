const express = require("express");
const cors = require("cors");
const multer = require("multer");
const pdfParse = require("pdf-parse");
const fs = require("fs");
require("dotenv").config();
console.log("API KEY LOADED:", process.env.GEMINI_API_KEY?.slice(0, 10));

const { GoogleGenerativeAI } = require("@google/generative-ai");

const app = express();

app.use(cors());
app.use(express.json());

app.get("/", (req, res) => {
  res.send("Backend is running!");
});

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, "uploads/");
  },

  filename: function (req, file, cb) {
    cb(null, Date.now() + "-" + file.originalname);
  },
});

const upload = multer({ storage });

function getCleanSentences(text) {
  return text
    .replace(/\s+/g, " ")
    .split(/[.!?]/)
    .map((sentence) => sentence.trim())
    .filter((sentence) => sentence.length > 35);
}

function createLocalSummary(text, summaryLength = "short") {
  let maxPoints = 5;

  if (summaryLength === "medium") maxPoints = 8;
  if (summaryLength === "detailed") maxPoints = 12;

  const sentences = getCleanSentences(text).slice(0, maxPoints);

  return `
# Quick Summary

${sentences.map((sentence) => `- ${sentence}.`).join("\n")}
`;
}

function createLocalNotes(text) {
  const sentences = getCleanSentences(text).slice(0, 20);

  return `
# Extracted Study Notes

## Important Points

${sentences.map((sentence) => `- ${sentence}.`).join("\n")}

---

**Note:** AI service was busy, so notes were generated from extracted PDF text.
`;
}

function createLocalQuiz(text, count = 10) {
  const sentences = getCleanSentences(text).slice(0, count);

  return sentences.map((sentence, index) => {
    const correct =
      sentence.length > 90 ? sentence.slice(0, 90) + "..." : sentence;

    return {
      question: `Which statement is related to the uploaded study material?`,
      options: [
        correct,
        "This topic is not related to the uploaded PDF.",
        "This is only a formatting instruction.",
        "This is unrelated general information.",
      ],
      answer: correct,
    };
  });
}

function createLocalFlashcards(text, count = 10) {
  const sentences = getCleanSentences(text).slice(0, count);

  return sentences.map((sentence) => {
    const question =
      sentence.length > 60 ? sentence.slice(0, 60) + "..." : sentence;

    return {
      question,
      answer: sentence,
    };
  });
}
async function generateWithFallback(prompt) {
  const models = [
    "gemini-2.5-flash",
    "gemini-2.0-flash",
    "gemini-2.0-flash-lite",
  ];

  let lastError = null;

  for (const modelName of models) {
    try {
      console.log("Trying model:", modelName);

      const model = genAI.getGenerativeModel({
        model: modelName,
      });

      const result = await model.generateContent(prompt);
      return result.response.text();
    } catch (error) {
      lastError = error;
      console.log(`${modelName} failed:`, error.message);
    }
  }

  throw lastError;
}

function cleanJSONResponse(responseText) {
  return responseText
    .replace(/```json/g, "")
    .replace(/```/g, "")
    .trim();
}

function getFriendlyAIError(error) {
  if (error.message && error.message.includes("429")) {
    return "AI daily limit reached. Showing locally generated content instead.";
  }

  if (error.message && error.message.includes("503")) {
    return "AI service is busy. Showing locally generated content instead.";
  }

  return "AI unavailable. Showing locally generated content instead.";
}

app.post("/upload", upload.single("pdf"), async (req, res) => {
  try {
    const pdfBuffer = fs.readFileSync(req.file.path);
    const data = await pdfParse(pdfBuffer);

    const extractedText = data.text || "";
    const limitedText = extractedText.slice(0, 5000);
    const summaryLength = req.body.summaryLength || "short";
    const localBackup = req.body.localBackup === "true";

    let summary = "";
    let formattedNotes = "";
    let aiAvailable = true;

    try {
      const summaryPrompt = `
Create a SHORT and clear study summary from the following material.

Rules:
- Summary length should be: ${summaryLength}.
- If short: maximum 5 bullet points.
- If medium: maximum 8 bullet points.
- If detailed: maximum 12 bullet points with slightly more explanation.
- Do NOT explain in detail.
- Do NOT copy full paragraphs.
- Focus only on key exam points.
- Use simple language.
- Make it look like a real summary, not notes.

Format:

# Quick Summary

- point 1
- point 2
- point 3

Study Material:

${limitedText}
`;

      const notesPrompt = `
Convert the following extracted PDF text into clean, structured, easy-to-read study notes.

Rules:
- Add proper headings and subheadings.
- Use bullet points.
- Remove unnecessary broken lines.
- Make it exam-oriented.
- Keep the language simple.
- Do not add information outside the provided text.

PDF Text:

${limitedText}
`;

      summary = await generateWithFallback(summaryPrompt);
      formattedNotes = await generateWithFallback(notesPrompt);
    } catch (aiError) {
      console.error("AI Error:", aiError.message);

      aiAvailable = false;
      if (localBackup) {
  summary = createLocalSummary(extractedText, summaryLength);
  formattedNotes = createLocalNotes(extractedText);
} else {
  return res.status(500).json({
    message: "AI is unavailable and local backup is turned off.",
  });
}
    }

    res.json({
      message: aiAvailable
        ? "PDF uploaded and formatted successfully!"
        : "PDF uploaded. AI was unavailable, so local study content was generated.",
      text: extractedText,
      summary,
      formattedNotes,
      quiz: "",
      aiAvailable,
    });
  } catch (error) {
    console.error("PDF Error:", error.message);

    res.status(500).json({
      message: "Error processing PDF",
      error: error.message,
    });
  }
});

app.post("/generate-quiz", async (req, res) => {
 const { text, quizCount, localBackup } = req.body;
const count = quizCount || 10;

  try {
    if (!text || text.trim() === "") {
      return res.status(400).json({
        message: "No text provided",
      });
    }

    const prompt = `
Generate ${count} multiple-choice questions

Return ONLY valid JSON.

Format:

[
  {
    "question": "Question text",
    "options": [
      "Option A",
      "Option B",
      "Option C",
      "Option D"
    ],
    "answer": "Correct Option"
  }
]

Rules:
- Exactly ${count} questions.
- Exactly 4 options per question.
- Answer must exactly match one option.
- Return JSON only.
- No markdown.
- No explanations.
- No extra text.

Study Material:

${text.slice(0, 4000)}
`;

    let responseText = await generateWithFallback(prompt);

    responseText = cleanJSONResponse(responseText);

    const quiz = JSON.parse(responseText);

    res.json({
      quiz,
      aiAvailable: true,
    });
  } catch (error) {
    console.error("Quiz Error:", error.message);

   if (localBackup) {
  return res.json({
    message: getFriendlyAIError(error),
    quiz: createLocalQuiz(text || "", count),
    aiAvailable: false,
  });
}

return res.status(500).json({
  message: "Quiz generation failed because AI is unavailable and local backup is turned off.",
});
  }
});

app.post("/generate-flashcards", async (req, res) => {
  const { text, flashcardCount, localBackup } = req.body;
const count = flashcardCount || 10;

  try {
    if (!text || text.trim() === "") {
      return res.status(400).json({
        message: "No text provided",
      });
    }

    const prompt = `
Generate ${count} study flashcards

Return ONLY valid JSON.

Format:

[
  {
    "question": "Actual topic/question name",
    "answer": "Short answer"
  }
]

Rules:
- Exactly ${count} flashcards.
- DO NOT use generic names like:
  "Point 1"
  "Important Point 2"
  "Topic 3"
  "Concept 4"
- The question field must contain the REAL topic name.

Examples:

{
  "question": "What is Network Forensics?",
  "answer": "Network forensics is the process of monitoring and analyzing network traffic to investigate cyber incidents."
}

{
  "question": "What is Wireshark?",
  "answer": "Wireshark is a packet analysis tool used in network forensics."
}

{
  "question": "What are Open Source Security Tools?",
  "answer": "Security tools whose source code is publicly available."
}

- Keep answers short.
- Make them exam-oriented.
- Return JSON only.
- No markdown.
- No explanations.

Study Material:

${text.slice(0, 4000)}
`;

    let responseText = await generateWithFallback(prompt);

    responseText = cleanJSONResponse(responseText);

    const flashcards = JSON.parse(responseText);

    res.json({
      flashcards,
      aiAvailable: true,
    });
  } catch (error) {
    console.error("Flashcard Error:", error.message);

    if (localBackup) {
  return res.json({
    message: getFriendlyAIError(error),
    flashcards: createLocalFlashcards(text || "", count),
    aiAvailable: false,
  });
}

return res.status(500).json({
  message: "Flashcard generation failed because AI is unavailable and local backup is turned off.",
});
  }
});

app.listen(5000, () => {
  console.log("Server running on port 5000");
});