import { helpArticleModel } from '../models/helpArticleModel.js';
import { searchRelevantChunks } from './vectorSearchService.js'; 

export const getRelevantHelpArticles = async (customerQuestion) => {
    try {
        // 1. Pass the question to the existing vector search logic
        const searchResults = await searchRelevantChunks(customerQuestion, 5);

        // 2. Return an empty array if no matches are found
        if (!searchResults || searchResults.length === 0) {
            return [];
        }

        // Extract the article IDs in their ranked, sorted order
        const articleIds = searchResults.map(chunk => chunk.source.articleId);

        // 3. Query the database for those specific IDs, filtering for PUBLISHED status
        const relevantArticles = await helpArticleModel.find({
            _id: { $in: articleIds },
            status: "PUBLISHED"
        }).select("title version content");

        // FIX: Re-sort the fetched articles to match the exact ranked order of articleIds
        const sortedArticles = articleIds
            .map(id => relevantArticles.find(article => article._id.toString() === id.toString()))
            .filter(article => article != null); // Remove undefined if a chunk's article isn't PUBLISHED

        // 4. Return only the title, version, and content in the corrected order
        return sortedArticles.map(article => ({
            title: article.title,
            version: article.version,
            content: article.content
        }));

    } catch (error) {
        console.error("Error in helpArticleRetrievalService:", error);
        throw new Error("Failed to retrieve relevant help articles");
    }
};