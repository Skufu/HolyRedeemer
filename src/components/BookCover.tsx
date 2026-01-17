import React from 'react';
import { BookOpen } from 'lucide-react';

interface BookCoverProps {
  title: string;
  author: string;
  coverImage?: string;
  isbn?: string;
  className?: string;
}

const BookCover: React.FC<BookCoverProps> = ({ title, author, coverImage, isbn, className = '' }) => {
  const [imgError, setImgError] = React.useState(false);

  // Generate a consistent gradient based on the title
  const getGradient = (text: string) => {
    const colors = [
      'from-blue-500 to-cyan-400',
      'from-purple-500 to-pink-400',
      'from-amber-400 to-orange-500',
      'from-emerald-400 to-teal-500',
      'from-rose-400 to-red-500',
      'from-indigo-500 to-blue-400',
    ];
    let hash = 0;
    for (let i = 0; i < text.length; i++) {
      hash = text.charCodeAt(i) + ((hash << 5) - hash);
    }
    return colors[Math.abs(hash) % colors.length];
  };

  const coverUrl = React.useMemo(() => {
    if (coverImage) return coverImage;
    if (isbn) {
      const cleanIsbn = isbn.replace(/-/g, '');
      return `https://covers.openlibrary.org/b/isbn/${cleanIsbn}-M.jpg`;
    }
    return null;
  }, [coverImage, isbn]);

  if (coverUrl && !imgError) {
    return (
      <img
        src={coverUrl}
        alt={title}
        className={`w-full h-full object-cover transition-transform duration-300 group-hover:scale-105 ${className}`}
        onError={() => setImgError(true)}
      />
    );
  }

  return (
    <div className={`w-full h-full bg-gradient-to-br ${getGradient(title)} p-4 flex flex-col justify-between text-white overflow-hidden relative ${className}`}>
      {/* Decorative pattern overlay */}
      <div className="absolute inset-0 opacity-10 pointer-events-none overflow-hidden">
        <BookOpen className="absolute -right-4 -bottom-4 w-24 h-24 rotate-12" />
      </div>

      <div className="relative z-10">
        <h4 className="font-display font-bold text-sm sm:text-base leading-tight line-clamp-3">
          {title}
        </h4>
        <div className="h-0.5 w-8 bg-white/40 mt-2 mb-1" />
      </div>

      <div className="relative z-10">
        <p className="text-[10px] sm:text-xs font-medium opacity-90 truncate">
          {author}
        </p>
      </div>
    </div>
  );
};

export default BookCover;
