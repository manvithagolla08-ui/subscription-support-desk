import React, { useState, useEffect } from 'react';
import PageHeader from '../components/common/PageHeader';
import Card from '../components/common/Card';
import Button from '../components/common/Button';
import api from '../services/api';

const Support = () => {
    const [articles, setArticles] = useState([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    // Fetch all published articles when the page first loads
    useEffect(() => {
        fetchAllArticles();
    }, []);

    const fetchAllArticles = async () => {
        setIsLoading(true);
        try {
            const response = await api.get('/help');
            setArticles(response.data || response); 
        } catch (error) {
            console.error("Error fetching published articles:", error);
        } finally {
            setIsLoading(false);
        }
    };

    // Triggered when the user clicks Search
    const handleSearch = async (e) => {
        e.preventDefault();
        
        if (!searchQuery.trim()) {
            return fetchAllArticles(); 
        }

        setIsLoading(true);
        try {
            const response = await api.post('/help/search', { query: searchQuery });
           setArticles(response.data?.data || response.data || []);
        } catch (error) {
            console.error("Error searching articles:", error);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="support-page" style={{ padding: '20px', maxWidth: '800px', margin: '0 auto' }}>
            <PageHeader
                title="Help Center"
                description="Search our published articles to find the answers you need."
            />

            <Card className="search-card" style={{ marginBottom: '20px', padding: '20px' }}>
                <form onSubmit={handleSearch} style={{ display: 'flex', gap: '10px' }}>
                    <input
                        type="text"
                        placeholder="e.g., How to publish an article..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        style={{ 
                            flex: 1, 
                            padding: '10px', 
                            borderRadius: '4px', 
                            border: '1px solid #ccc',
                            fontFamily: 'inherit'
                        }}
                    />
                    <Button type="submit" disabled={isLoading}>
                        {isLoading ? 'Searching...' : 'Search'}
                    </Button>
                </form>
            </Card>

            <div className="articles-list" style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                {isLoading ? (
                    <p style={{ textAlign: 'center' }}>Loading...</p>
                ) : articles.length === 0 ? (
                    <Card style={{ padding: '20px', textAlign: 'center' }}>
                        <p>No articles found.</p>
                    </Card>
                ) : (
                    articles.map((article, index) => (
                        <Card key={index} className="article-card" style={{ padding: '20px' }}>
                            <h3 style={{ margin: '0 0 10px 0', color: '#333' }}>{article.title}</h3>
                            <span style={{ 
                                fontSize: '12px', 
                                backgroundColor: '#eee', 
                                padding: '3px 8px', 
                                borderRadius: '12px' 
                            }}>
                                Version: {article.version}
                            </span>
                            <p style={{ marginTop: '15px', lineHeight: '1.5', color: '#555' }}>
                                {article.content}
                            </p>
                        </Card>
                    ))
                )}
            </div>
        </div>
    );
};

export default Support;