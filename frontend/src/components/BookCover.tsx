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

  // Generate a consistent gradient based on the title with more library-centric tones
  const getGradient = (text: string) => {
    const sets = [
      'from-primary to-maroon-light/20', // Classic Maroon
      'from-mahogany to-parchment/10',    // Deep Wood
      'from-forest to-emerald-400/10',    // Scholarly Green
      'from-[#1e293b] to-slate-400/10',   // Midnight Blue
      'from-secondary to-gold-light/20',  // Antique Gold
    ];
    let hash = 0;
    for (let i = 0; i < text.length; i++) {
      hash = text.charCodeAt(i) + ((hash << 5) - hash);
    }
    return sets[Math.abs(hash) % sets.length];
  };

  const coverUrl = React.useMemo(() => {
    if (coverImage) return coverImage;
    if (isbn) {
      const cleanIsbn = isbn.replace(/-/g, '');
      return `https://covers.openlibrary.org/b/isbn/${cleanIsbn}-L.jpg`; // Use Large for better quality
    }
    return null;
  }, [coverImage, isbn]);

  const CoverWrapper = ({ children }: { children: React.ReactNode }) => (
    <div className={`relative w-full h-full rounded-[2px] overflow-hidden shadow-warm transition-all duration-300 group-hover:shadow-warm-lg group-hover:-translate-y-1 ${className}`}>
      {/* Physical book spine effect */}
      <div className="absolute left-0 top-0 bottom-0 w-[12%] bg-black/20 z-20 border-r border-white/10" />
      <div className="absolute left-[12%] top-0 bottom-0 w-[1px] bg-white/5 z-20" />

      {/* Glossy overlay */}
      <div className="absolute inset-0 bg-gradient-to-tr from-black/20 via-transparent to-white/10 z-10 pointer-events-none" />

      {children}
    </div>
  );

  if (coverUrl && !imgError) {
    return (
      <CoverWrapper>
        <img
          src={coverUrl}
          alt={title}
          className="w-full h-full object-cover"
          onError={() => setImgError(true)}
        />
      </CoverWrapper>
    );
  }

  return (
    <CoverWrapper>
      <div className={`w-full h-full bg-gradient-to-br ${getGradient(title)} p-4 pl-[18%] flex flex-col justify-between text-white overflow-hidden relative`}>
        {/* Decorative pattern overlay */}
        <div className="absolute inset-0 opacity-10 pointer-events-none overflow-hidden">
          <BookOpen className="absolute -right-4 -bottom-4 w-24 h-24 rotate-12" />
        </div>

        <div className="relative z-10 pr-2">
          <h4 className="font-display font-bold text-sm sm:text-base leading-tight line-clamp-4 tracking-tighter">
            {title}
          </h4>
          <div className="h-0.5 w-10 bg-white/30 mt-3 mb-2" />
        </div>

        <div className="relative z-10 pr-2 pb-1">
          <p className="text-[10px] sm:text-xs font-serif italic font-medium opacity-90 truncate">
            {author}
          </p>
        </div>
      </div>
    </CoverWrapper>
  );
};

export default BookCover;
