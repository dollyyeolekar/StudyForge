require("dotenv").config();

const { GoogleGenerativeAI } = require("@google/generative-ai");

async function test() {
  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

  const model = genAI.getGenerativeModel({
     model: "gemini-1.5-flash-latest",
  });

  const result = await model.generateContent(
    "Say hello in one sentence."
  );

  console.log(result.response.text());
}

test();