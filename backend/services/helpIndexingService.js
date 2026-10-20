
import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters";
import { helpChunkModel } from "../models/helpChunkModel.js";
import { generateEmbedding } from "./embeddingService.js";

const textSplitter = new RecursiveCharacterTextSplitter({
    chunkSize: 800,
    chunkOverlap: 120,
});

export async function indexHelpArticle(article) {
    const chunks = await textSplitter.splitText(article.content);

    if (chunks.length === 0) {
        throw new Error("Unable to create chunks from the article.");
    }

    const chunksWithEmbeddings = [];

    for (const [chunkIndex, chunkText] of chunks.entries()) {
        const embedding = await generateEmbedding(chunkText);

        chunksWithEmbeddings.push({
            articleId: article._id,
            chunkText,
            chunkIndex,
            embedding,
        });
    }

    const savedChunks = await helpChunkModel.insertMany(
        chunksWithEmbeddings
    );

    return savedChunks.length;
}
