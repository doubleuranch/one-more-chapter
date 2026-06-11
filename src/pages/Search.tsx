import { useState, useCallback } from 'react';
import { useApp } from '../context/AppContext';
import { searchGoogleBooks } from '../lib/googleBooks';
import type { GoogleBook } from '../types';
import Layout from '../components/Layout';
import BookCard from '../components/BookCard';

export default function Search() {
  const { books, addBook } = useApp();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<GoogleBook[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);

  const handleSearch = useCallback(async () => {
    if (!query.trim()) return;
    setLoading(true);
    setSearched(true);

    const localMatches = books.filter(b =>
      b.title.toLowerCase().includes(query.toLowerCase()) ||
      b.author.toLowerCase().includes(query.toLowerCase())
    );
    const googleResults = await searchGoogleBooks(query);
    const localIds = new Set(localMatches.map(b => b.id));
    const remoteResults = googleResults.filter(r => !localIds.has(r.id));

    const combined = [
      ...localMatches.map(b => ({ id: b.id, title: b.title, author: b.author, coverUrl: b.coverUrl, description: b.description, publishedYear: b.publishedYear, pageCount: b.pageCount })),
      ...remoteResults,
    ];

    // Deduplicate: keep only the first result per normalized title+author pair
    const seen = new Set<string>();
    const deduped = combined.filter(r => {
      const key = `${r.title.toLowerCase().replace(/[^a-z0-9]/g, '')}|${r.author.toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 20)}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });

    // Add all results to state immediately so BookDetail can find them on click
    deduped.forEach(gb => {
      if (!books.find(b => b.id === gb.id)) {
        addBook({
          id: gb.id, title: gb.title, author: gb.author,
          coverUrl: gb.coverUrl, description: gb.description ?? '',
          publishedYear: gb.publishedYear ?? 0, genre: 'Fiction', pageCount: gb.pageCount ?? 0,
        });
      }
    });

    setResults(deduped);
    setLoading(false);
  }, [query, books]);

  const trendingBooks = books.slice(0, 8);

  return (
    <Layout title="Search">
      <div className="flex gap-2 mb-6">
        <input
          value={query}
          onChange={e => setQuery(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleSearch()}
          placeholder="Title, author, ISBN..."
          className="flex-1 border border-earth-200 rounded-xl px-4 py-3 text-sm text-earth-800 placeholder-earth-400 focus:outline-none focus:border-terracotta-400 bg-white"
        />
        <button
          onClick={handleSearch}
          disabled={loading}
          className="px-5 py-3 bg-terracotta-500 text-white rounded-xl text-sm font-medium hover:bg-terracotta-600 disabled:opacity-60 transition-colors"
        >
          {loading ? '...' : 'Search'}
        </button>
      </div>

      {!searched ? (
        <>
          <h3 className="font-serif font-semibold text-earth-700 text-base mb-4">Trending in your club</h3>
          <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
            {trendingBooks.map(book => <BookCard key={book.id} book={book} showActions={false} />)}
          </div>
        </>
      ) : loading ? (
        <div className="text-center py-16">
          <div className="inline-block w-8 h-8 border-2 border-earth-300 border-t-terracotta-500 rounded-full animate-spin" />
          <p className="text-earth-400 text-sm mt-3">Searching books…</p>
        </div>
      ) : results.length === 0 ? (
        <div className="text-center py-16">
          <p className="text-3xl mb-2">🔍</p>
          <p className="font-serif text-earth-700">No books found</p>
          <p className="text-earth-400 text-sm mt-1">Try a different title or author</p>
        </div>
      ) : (
        <>
          <p className="text-earth-400 text-sm mb-4">{results.length} results for "{query}"</p>
          <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
            {results.map(gb => {
              const book = books.find(b => b.id === gb.id) ?? {
                id: gb.id, title: gb.title, author: gb.author,
                coverUrl: gb.coverUrl, description: gb.description ?? '',
                publishedYear: gb.publishedYear ?? 0, genre: 'Fiction', pageCount: gb.pageCount ?? 0,
              };
              return <BookCard key={gb.id} book={book} showActions={false} />;
            })}
          </div>
        </>
      )}
    </Layout>
  );
}
