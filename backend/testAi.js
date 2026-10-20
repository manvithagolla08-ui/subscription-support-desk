
import "dotenv/config";
import { generateAIAnswer } from "./services/aiService.js";

const answer = await generateAIAnswer(
    "What is the account member limit?",
    "The account member limit is 10 members."
);

console.log("AI answer:", answer);
