import React, { useState, useEffect, useRef } from 'react';
import LockScreen from './components/LockScreen';
import Hero from './components/Hero';
import Stats from './components/Stats';
import BookGrid, { getBookStatus, getBookFileName } from './components/BookGrid';
import BookShelf from './components/BookShelf';
import BookDetailModal from './components/BookDetailModal';
import AddBookModal from './components/AddBookModal';
import ExploreAddModal from './components/ExploreAddModal';
import Toast from './components/Toast';
import PdfReaderModal from './components/PdfReaderModal';
import { supabase, hasSupabase } from './supabaseClient';
import { DEFAULT_BOOKS } from './defaultBooks';

export default function App() {
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [books, setBooks] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  
  // Filters & Search
  const [activeFilter, setActiveFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  
  // Modals state
  const [selectedBook, setSelectedBook] = useState(null);
  const [activeReadingBook, setActiveReadingBook] = useState(null);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [exploreBookTitle, setExploreBookTitle] = useState('');
  
  // Particles state
  const [bgParticles, setBgParticles] = useState([]);
  const [bgPetals, setBgPetals] = useState([]);
  
  // Toast state
  const [toastMessage, setToastMessage] = useState('');

  const libraryRef = useRef(null);

  // Check session unlock status on mount
  useEffect(() => {
    if (sessionStorage.getItem('her_library_unlocked') === 'yes') {
      setIsUnlocked(true);
    }
  }, []);

  // Fetch / Sync books list
  useEffect(() => {
    async function loadBooks() {
      setIsLoading(true);
      
      if (hasSupabase) {
        try {
          const { data, error } = await supabase
            .from('books')
            .select('*')
            .order('id', { ascending: true });
            
          if (error) throw error;
          
          if (data && data.length > 0) {
            setBooks(data);
          } else {
            // DB is empty, auto-seed with DEFAULT_BOOKS
            const { error: seedError } = await supabase.from('books').insert(DEFAULT_BOOKS);
            if (seedError) throw seedError;
            
            const { data: reloaded } = await supabase
              .from('books')
              .select('*')
              .order('id', { ascending: true });
            if (reloaded) setBooks(reloaded);
          }
        } catch (err) {
          console.error('Supabase fetch failed, falling back to LocalStorage:', err);
          loadLocalBooks();
        }
      } else {
        loadLocalBooks();
      }
      setIsLoading(false);
    }

    loadBooks();
  }, []);

  // Background particles generator
  useEffect(() => {
    if (isUnlocked) {
      const pt = Array.from({ length: 30 }, (_, i) => ({
        id: i,
        left: `${Math.random() * 100}%`,
        size: `${Math.random() * 3 + 1}px`,
        colorClass: Math.random() > 0.5 ? 'particle-gold' : 'particle-rose',
        duration: `${Math.random() * 15 + 10}s`,
        delay: `${Math.random() * 8}s`,
      }));
      setBgParticles(pt);

      const pe = Array.from({ length: 15 }, (_, i) => ({
        id: i,
        left: `${Math.random() * 100}%`,
        duration: `${Math.random() * 12 + 8}s`,
        delay: `${Math.random() * 6}s`,
        opacity: Math.random() * 0.4 + 0.2,
        scale: Math.random() * 0.8 + 0.4,
      }));
      setBgPetals(pe);
    }
  }, [isUnlocked]);

  const loadLocalBooks = () => {
    const cached = localStorage.getItem('her_library_books');
    if (cached) {
      setBooks(JSON.parse(cached));
    } else {
      localStorage.setItem('her_library_books', JSON.stringify(DEFAULT_BOOKS));
      setBooks(DEFAULT_BOOKS);
    }
  };

  const syncBooksState = (updatedBooks) => {
    setBooks(updatedBooks);
    if (!hasSupabase) {
      localStorage.setItem('her_library_books', JSON.stringify(updatedBooks));
    }
  };

  const showToast = (msg) => {
    setToastMessage(msg);
  };

  // Scroll smooth helper
  const scrollToLibrary = () => {
    if (libraryRef.current) {
      libraryRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  };

  // DB Handlers
  const handleSaveProgress = async (id, current, total) => {
    const updated = books.map((b) => {
      if (b.id === id) {
        let newStatus = b.status;
        if (current === 0) {
          newStatus = 'want';
        } else if (current >= total) {
          newStatus = 'read';
        } else {
          newStatus = 'reading';
        }
        return { ...b, current_page: current, pages: total, status: newStatus };
      }
      return b;
    });

    syncBooksState(updated);
    
    // Recalculate percent for toast message
    const pct = Math.min(100, Math.round((current / total) * 100));
    showToast(`✨ Saved! Page ${current} of ${total} — ${pct}% done`);

    // Sync active reading book state in real-time if open in the reader
    if (activeReadingBook && activeReadingBook.id === id) {
      setActiveReadingBook(prev => ({
        ...prev,
        current_page: current,
        pages: total,
        status: current === 0 ? 'want' : (current >= total ? 'read' : 'reading')
      }));
    }

    // Supabase update
    if (hasSupabase) {
      let newStatus = 'want';
      if (current === 0) newStatus = 'want';
      else if (current >= total) newStatus = 'read';
      else newStatus = 'reading';

      try {
        await supabase
          .from('books')
          .update({ current_page: current, pages: total, status: newStatus })
          .eq('id', id);
      } catch (err) {
        console.error('Supabase save progress failed:', err);
      }
    }
  };

  const handleToggleHide = async (id) => {
    const targetBook = books.find(b => b.id === id);
    if (!targetBook) return;

    const nextHidden = !targetBook.is_hidden;
    const updated = books.map((b) => {
      if (b.id === id) {
        return { ...b, is_hidden: nextHidden };
      }
      return b;
    });

    syncBooksState(updated);
    showToast(nextHidden ? "Book has been hidden from the list 🙈" : "Book is now visible in the library 👁️");
    
    // Close modal if hidden
    setSelectedBook(null);

    // Supabase update
    if (hasSupabase) {
      try {
        await supabase
          .from('books')
          .update({ is_hidden: nextHidden })
          .eq('id', id);
      } catch (err) {
        console.error('Supabase toggle hide failed:', err);
      }
    }
  };

  const handleDeleteBook = async (id, title) => {
    if (confirm(`Are you sure you want to delete "${title}"?`)) {
      const updated = books.map((b) => {
        if (b.id === id) {
          return { ...b, is_deleted: true };
        }
        return b;
      });

      syncBooksState(updated);
      showToast(`"${title}" has been deleted from your library 🗑️`);
      setSelectedBook(null);

      // Supabase update
      if (hasSupabase) {
        try {
          await supabase
            .from('books')
            .update({ is_deleted: true })
            .eq('id', id);
        } catch (err) {
          console.error('Supabase delete failed:', err);
        }
      }
    }
  };

  const handleAddBook = async (newBookData) => {
    const tempId = Date.now();
    const fullNewBook = { ...newBookData, id: tempId };
    
    const updated = [...books, fullNewBook];
    syncBooksState(updated);
    showToast(`✨ Added "${newBookData.title}" to your library!`);

    // Supabase update
    if (hasSupabase) {
      try {
        const { data, error } = await supabase
          .from('books')
          .insert([newBookData])
          .select();
        if (data && data[0]) {
          // Replace tempId with the real database generated ID
          const syncIdList = books.map((b) => b.id === tempId ? data[0] : b);
          setBooks(syncIdList);
        }
      } catch (err) {
        console.error('Supabase add failed:', err);
      }
    }
  };

  // Recommendation chip handler
  const handleRecommendClick = (title) => {
    const found = books.find(
      (b) => b.title.toLowerCase() === title.toLowerCase() && !b.is_deleted
    );
    if (found) {
      setSelectedBook(found);
    } else {
      setExploreBookTitle(title);
    }
  };

  // Sync recommendation pre-fill for add
  const handleAddBookFromRecommendation = () => {
    setExploreBookTitle('');
    setIsAddOpen(true);
  };

  // Filter book operations
  const activeBooks = books.filter((b) => !b.is_deleted);
  
  const filteredBooks = activeBooks.filter((book) => {
    // 1. Search Query Match
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchSearch =
        book.title.toLowerCase().includes(q) ||
        book.author.toLowerCase().includes(q) ||
        (book.tags && book.tags.some((t) => t.toLowerCase().includes(q))) ||
        (book.genres && book.genres.some((g) => g.toLowerCase().includes(q)));
      
      if (!matchSearch) return false;
    }

    // 2. Tab Filter Match
    if (activeFilter === 'hidden') {
      return book.is_hidden;
    } else {
      if (book.is_hidden) return false; // Default: hide hidden books
      if (activeFilter === 'all') return true;
      if (activeFilter === 'read' || activeFilter === 'reading') {
        return getBookStatus(book) === activeFilter;
      }
      return book.genres && book.genres.includes(activeFilter);
    }
  });

  // Calculate statistics (using non-deleted active books)
  const statsTotal = activeBooks.filter(b => !b.is_hidden).length;
  const statsRead = activeBooks.filter(b => !b.is_hidden && getBookStatus(b) === 'read').length;
  const statsReading = activeBooks.filter(b => !b.is_hidden && getBookStatus(b) === 'reading').length;

  if (!isUnlocked) {
    return <LockScreen onUnlock={() => setIsUnlocked(true)} />;
  }

  return (
    <div className="relative min-h-screen text-[#e8dcc8] bg-[#0d1117] font-lora">
      
      {/* Background Sparkles */}
      <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
        {bgParticles.map((p) => (
          <div 
            key={p.id}
            className={`absolute pointer-events-none animate-[float-particle_linear_infinite] ${p.colorClass}`}
            style={{
              left: p.left,
              width: p.size,
              height: p.size,
              animationDuration: p.duration,
              animationDelay: p.delay,
              bottom: '-20px'
            }}
          />
        ))}
        {bgPetals.map((p) => (
          <div 
            key={p.id}
            className="absolute pointer-events-none petal-floating"
            style={{
              left: p.left,
              animationDuration: p.duration,
              animationDelay: p.delay,
              opacity: p.opacity,
              transform: `scale(${p.scale})`,
              bottom: '-20px',
              width: '8px',
              height: '12px'
            }}
          />
        ))}
      </div>

      {/* Database Mode Sleek Status Badge */}
      <div className="absolute top-4 left-4 z-40 font-sans text-[10px] tracking-wider bg-white/[0.03] border border-white/5 text-[#a89880]/80 rounded-full px-3 py-1 flex items-center gap-1.5 backdrop-blur-sm select-none">
        <span className={`w-1.5 h-1.5 rounded-full ${hasSupabase ? 'bg-emerald-400' : 'bg-amber-400'}`} />
        {hasSupabase ? 'Supabase Database Active' : 'LocalStorage Mock Mode'}
      </div>

      {/* Hero Header */}
      <Hero onEnterLibrary={scrollToLibrary} />

      {/* Stats counter bar */}
      <Stats total={statsTotal} read={statsRead} reading={statsReading} />

      {/* Main Library Collections */}
      <main ref={libraryRef} id="library" className="relative z-10 max-w-6xl mx-auto px-6 py-16 flex flex-col">
        {/* Title */}
        <div className="text-center mb-10">
          <div className="font-sans text-[0.72rem] tracking-[0.22em] uppercase text-[#c4869a] mb-2">
            📚 The Collection
          </div>
          <h2 className="font-playfair text-3xl font-semibold text-[#e8dcc8]">
            Her <em className="text-[#d4a853] not-italic">Reading World</em>
          </h2>
          <div className="w-[60px] h-[2px] bg-gradient-to-r from-transparent via-[#d4a853] to-transparent mx-auto mt-4" />
        </div>

        {/* Search Input bar */}
        <div className="flex justify-center mb-8">
          <input 
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search a book, author, genre..."
            className="w-full max-w-[400px] bg-white/[0.04] border border-[#d4a853]/20 focus:border-[#c4869a] rounded-full px-6 py-2.5 text-[#e8dcc8] font-lora text-sm outline-none transition-colors shadow-inner"
          />
        </div>

        {/* Categories filters scroll list */}
        <div className="flex justify-center flex-wrap gap-2 mb-10 select-none">
          {[
            { id: 'all', label: 'All Books' },
            { id: 'read', label: 'Read ✓' },
            { id: 'reading', label: 'Currently Reading' },
            { id: 'romance', label: 'Romance 💕' },
            { id: 'thriller', label: 'Thriller 🔪' },
            { id: 'self-help', label: 'Self Help 🌱' },
            { id: 'literary', label: 'Literary 📜' },
            { id: 'hindi', label: 'Hindi Lit 🇮🇳' },
            { id: 'hidden', label: 'Hidden 🙈' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveFilter(tab.id)}
              className={`font-sans text-xs font-medium tracking-wide px-4 py-2 rounded-full border transition-all cursor-pointer
                ${activeFilter === tab.id 
                  ? 'bg-[#d4a853]/15 border-[#d4a853] text-[#d4a853] shadow-md shadow-[#d4a853]/5' 
                  : 'bg-transparent border-[#d4a853]/25 text-[#a89880] hover:bg-[#d4a853]/5 hover:text-[#d4a853]'}`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Add Book trigger button row */}
        <div className="flex justify-center mb-12">
          <button 
            onClick={() => setIsAddOpen(true)}
            className="flex items-center gap-2 bg-[#d4a853]/10 border border-[#d4a853]/45 hover:bg-[#d4a853]/15 py-2.5 px-6 rounded-full text-[#d4a853] font-sans font-semibold text-xs tracking-wide cursor-pointer transition-all shadow-md active:scale-95"
          >
            ➕ Add a Book
          </button>
        </div>

        {/* Books Card Grid layout */}
        {isLoading ? (
          <div className="text-center font-lora italic text-[#a89880] py-16 text-base animate-pulse">
            Opening your pages... 📖
          </div>
        ) : (
          <BookGrid books={filteredBooks} onBookSelect={setSelectedBook} />
        )}

        {/* Spine Shelf View */}
        <BookShelf books={activeBooks} onBookSelect={setSelectedBook} />
      </main>

      {/* Birthday Footer */}
      <footer className="relative z-10 text-center py-16 px-6 bg-[radial-gradient(ellipse_at_50%_70%,#1f0a1a_0%,var(--midnight)_80%)] border-t border-white/[0.03] select-none">
        <div className="text-xl mb-4">🌹💕📚✨🎂</div>
        <div className="font-playfair text-[#e8dcc8] font-bold text-2xl tracking-wide">
          Happy Birthday, <span className="text-[#c4869a]">my love</span>
        </div>
        <div className="font-lora text-[0.88rem] leading-relaxed text-[#a89880] italic max-w-md mx-auto mt-5">
          "She is too fond of books, and it has turned her brain." — Louisa May Alcott
          <br /><br />
          May every chapter of your life be as beautiful as the books you've read. 🌸
        </div>
        <div className="text-[10px] text-[#a89880]/60 uppercase tracking-[0.12em] font-sans mt-12">
          made with 💛 just for you
        </div>
      </footer>

      {/* Modals stack */}
      {selectedBook && (
        <BookDetailModal 
          book={selectedBook}
          onClose={() => setSelectedBook(null)}
          onSaveProgress={handleSaveProgress}
          onToggleHide={handleToggleHide}
          onDeleteBook={handleDeleteBook}
          onRecommendClick={handleRecommendClick}
          onReadBook={() => {
            setActiveReadingBook(selectedBook);
            setSelectedBook(null);
          }}
          isHidden={selectedBook.is_hidden}
        />
      )}

      {activeReadingBook && (
        <PdfReaderModal 
          book={activeReadingBook}
          onClose={() => setActiveReadingBook(null)}
          onSaveProgress={handleSaveProgress}
          onShowToast={showToast}
        />
      )}

      <AddBookModal 
        isOpen={isAddOpen}
        onClose={() => setIsAddOpen(false)}
        onAddBook={handleAddBook}
        onShowToast={showToast}
      />

      <ExploreAddModal 
        isOpen={!!exploreBookTitle}
        bookTitle={exploreBookTitle}
        onClose={() => setExploreBookTitle('')}
        onAddBookClick={handleAddBookFromRecommendation}
      />

      {/* Success/Action Feedback Toast messages */}
      <Toast message={toastMessage} onClose={() => setToastMessage('')} />
    </div>
  );
}
