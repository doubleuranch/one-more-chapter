import { useState, useCallback } from 'react';
import { useApp } from '../context/AppContext';
import { searchGoogleBooks } from '../lib/googleBooks';
import type { GoogleBook } from '../types';
import Layout from '../components/Layout';
import BookCard from '../components/BookCard';
import { SkeletonBookCard } from '../components/Skeleton';

// Strip a title down to its core for comparison.
// Removes: leading articles, subtitles, edition/series info in parens/brackets.
function normalizeTitle(title: string): string {
  return title
    .toLowerCase()
    .replace(/\s*:.*$/, '')                   // "Secret Garden: A Novel" → "Secret Garden"
    .replace(/\s*[\(\[][^\)\]]+[\)\]]/g, '')  // "Secret Garden (Classics)" → "Secret Garden"
    .replace(/^(the|a|an)\s+/i, '')           // "The Secret Garden" → "Secret Garden"
    .replace(/[^a-z0-9]/g, '')
    .slice(0, 30);
}

// Full dedup key: title + first 20 chars of author (no punctuation).
function dedupeKey(title: string, author: string): string {
  const a = author.toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 20);
  return `${normalizeTitle(title)}|${a}`;
}

export default function Search() {
  const { books, addBook, feedItems } = useApp();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<GoogleBook[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);

  const handleSearch = useCallback(async () => {
    if (!query.trim()) return;
    setLoading(true);
    setSearched(true);

    const rawLocalMatches = books.filter(b =>
      b.title.toLowerCase().includes(query.toLowerCase()) ||
      b.author.toLowerCase().includes(query.toLowerCase())
    );

    // Pre-dedup local results by title alone — the DB may have stored multiple
    // editions of the same book (different IDs, slightly different author strings).
    const titleSeen = new Set<string>();
    const localMatches = rawLocalMatches.filter(b => {
      const key = normalizeTitle(b.title);
      if (titleSeen.has(key)) return false;
      titleSeen.add(key);
      return true;
    });

    const googleResults = await searchGoogleBooks(query);
    const localIds = new Set(localMatches.map(b => b.id));
    const remoteResults = googleResults.filter(r => !localIds.has(r.id));

    const combined = [
      ...localMatches.map(b => ({ id: b.id, title: b.title, author: b.author, coverUrl: b.coverUrl, description: b.description, publishedYear: b.publishedYear, pageCount: b.pageCount })),
      ...remoteResults,
    ];

    // Deduplicate: keep only the first result per normalized title+author pair.
    // Local DB results come first so they win over fresh Google results.
    const seen = new Set<string>();
    const deduped = combined.filter(r => {
      const key = dedupeKey(r.title, r.author);
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

  // Trending = books with the most recent club activity (feedItems is sorted newest-first).
  // Deduplicates by normalized title so multiple DB editions of the same book count as one.
  const trendingBooks = (() => {
    const idSeen   = new Set<string>();
    const titleSeen = new Set<string>();
    const out: typeof books = [];

    for (const item of feedItems) {
      if (idSeen.has(item.bookId)) continue;
      const book = books.find(b => b.id === item.bookId);
      if (!book) continue;
      const tk = normalizeTitle(book.title);
      if (titleSeen.has(tk)) continue;
      idSeen.add(item.bookId);
      titleSeen.add(tk);
      out.push(book);
      if (out.length >= 8) break;
    }
    // Pad with remaining books if fewer than 8 from feed
    for (const book of books) {
      if (out.length >= 8) break;
      const tk = normalizeTitle(book.title);
      if (!titleSeen.has(tk)) { titleSeen.add(tk); out.push(book); }
    }
    return out;
  })();

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
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-3">
            {trendingBooks.map(book => <BookCard key={book.id} book={book} showActions={false} />)}
          </div>
        </>
      ) : loading ? (
        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-3">
          {Array.from({ length: 8 }).map((_, i) => <SkeletonBookCard key={i} />)}
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
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-3">
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
