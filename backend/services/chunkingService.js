
import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters";

const textSplitter = new RecursiveCharacterTextSplitter({
  chunkSize: 800,
  chunkOverlap: 120,
});

export async function splitArticleIntoChunks(content) {
  if (typeof content !== "string" || content.trim() === "") {
    const error = new Error("Article content must be a non-empty string");
    error.statusCode = 400;
    throw error;
  }

  const chunks = await textSplitter.splitText(content.trim());

  return chunks.map((chunk, index) => ({
    chunkText: chunk,
    chunkIndex: index,
  }));
}
