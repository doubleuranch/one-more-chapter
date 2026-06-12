import type { GoogleBook } from '../types';

interface GBVolume {
  id: string;
  volumeInfo: {
    title?: string;
    authors?: string[];
    description?: string;
    imageLinks?: { thumbnail?: string; smallThumbnail?: string };
    publishedDate?: string;
    pageCount?: number;
    categories?: string[];
  };
}

export async function searchGoogleBooks(query: string): Promise<GoogleBook[]> {
  if (!query.trim()) return [];
  try {
    const key = import.meta.env.VITE_GOOGLE_BOOKS_API_KEY;
    const keyParam = key ? `&key=${key}` : '';
    const res = await fetch(
      `https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(query)}&maxResults=12&printType=books&langRestrict=en${keyParam}`
    );
    if (!res.ok) return [];
    const data = await res.json();
    if (!data.items) return [];
    return (data.items as GBVolume[])
      .filter(item => item.volumeInfo?.title)
      .map(item => {
        const info = item.volumeInfo;
        let coverUrl = info.imageLinks?.thumbnail || info.imageLinks?.smallThumbnail;
        if (coverUrl) {
          // zoom=2 → 300×450px (vs zoom=1 thumbnail at ~128×170px).
          // 300px is sharp on standard and 2× HiDPI displays.
          coverUrl = coverUrl
            .replace('http://', 'https://')
            .replace(/zoom=\d+/, 'zoom=2')
            .replace(/&edge=curl/, ''); // curl effect looks odd at larger sizes
        }
        return {
          id: item.id,
          title: info.title!,
          author: info.authors?.[0] ?? 'Unknown Author',
          coverUrl,
          description: info.description,
          publishedYear: info.publishedDate ? parseInt(info.publishedDate.slice(0, 4)) : undefined,
          pageCount: info.pageCount,
        };
      });
  } catch {
    return [];
  }
}
