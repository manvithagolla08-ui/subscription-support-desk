
import { generateEmbedding } from "./services/embeddingService.js";

try {
  const text = "How can I reset my subscription password?";

  console.log("Generating embedding...");

  const embedding = await generateEmbedding(text);

  console.log("Embedding generated successfully!");
  console.log("Vector dimensions:", embedding.length);
  console.log("First 5 values:", embedding.slice(0, 5));
} catch (error) {
  console.error("Embedding test failed:", error.message);
}
