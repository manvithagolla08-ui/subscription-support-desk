import { helpArticleModel } from '../models/helpArticleModel.js';
import { searchRelevantChunks } from './vectorSearchService.js'; 

export const getRelevantHelpArticles = async (customerQuestion) => {
    try {
        // 1. Pass the question to Sathvika's existing vector search logic
        const searchResults = await searchRelevantChunks(customerQuestion, 5);

        // 2. Return an empty array if no matches are found
        if (!searchResults || searchResults.length === 0) {
            return [];
        }

        // Extract the article IDs from the chunk results
        const articleIds = searchResults.map(chunk => chunk.source.articleId);

        // 3. Query the database for those specific IDs, filtering strictly for PUBLISHED status
        const relevantArticles = await helpArticleModel.find({
            _id: { $in: articleIds },
            status: "PUBLISHED"
        }).select("title version content");

        // 4. Return only the title, version, and content
        return relevantArticles.map(article => ({
            title: article.title,
            version: article.version,
            content: article.content
        }));

    } catch (error) {
        console.error("Error in helpArticleRetrievalService:", error);
        throw new Error("Failed to retrieve relevant help articles");
    }
};