import React, { useState, useEffect, useRef } from 'react';
import LockScreen from './components/LockScreen';
import Hero from './components/Hero';
import Stats from './components/Stats';
import BookGrid, { getBookStatus, getBookFileName, BookCard } from './components/BookGrid';
import BookShelf from './components/BookShelf';
import BookDetailModal from './components/BookDetailModal';
import AddBookModal from './components/AddBookModal';
import ExploreAddModal from './components/ExploreAddModal';
import Toast from './components/Toast';
import ChatbotWidget from './components/ChatbotWidget';
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

  // Custom tags, Series delete and add states
  const [customTags, setCustomTags] = useState(() => {
    const cached = localStorage.getItem('her_library_custom_tags');
    return cached ? JSON.parse(cached) : [];
  });
  const [deletedDefaultTags, setDeletedDefaultTags] = useState(() => {
    const cached = localStorage.getItem('her_library_deleted_default_tags');
    return cached ? JSON.parse(cached) : [];
  });
  const [seriesToDelete, setSeriesToDelete] = useState(null);
  const [seriesForAddingBook, setSeriesForAddingBook] = useState(null);
  const [tagForAddingBook, setTagForAddingBook] = useState(null);

  // Modals state
  const [selectedBook, setSelectedBook] = useState(null);
  const [activeReadingBook, setActiveReadingBook] = useState(null);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [exploreBookTitle, setExploreBookTitle] = useState('');
  const [bookToEdit, setBookToEdit] = useState(null);

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

  const handleToggleSeriesHide = async (seriesName, hide) => {
    const updated = books.map((b) => {
      const matchSeries = b.series_name === seriesName || 
        (!b.series_name && seriesName === "Unnamed Series" && b.tags?.some(t => t.toLowerCase() === 'series'));
      if (matchSeries) {
        return { ...b, is_hidden: hide };
      }
      return b;
    });

    syncBooksState(updated);
    showToast(hide ? `Series "${seriesName}" hidden from all lists 🙈` : `Series "${seriesName}" is now visible in all lists 👁️`);

    // Close details modal if open on a book in this series
    setSelectedBook(null);

    // Supabase update
    if (hasSupabase) {
      try {
        await supabase
          .from('books')
          .update({ is_hidden: hide })
          .eq('series_name', seriesName);
      } catch (err) {
        console.error('Supabase toggle series hide failed:', err);
      }
    }
  };

  const handleCreateTag = (name) => {
    const trimmed = name.trim();
    if (!trimmed) return;
    setCustomTags((prev) => {
      if (prev.some(t => t.toLowerCase() === trimmed.toLowerCase())) return prev;
      const updated = [...prev, trimmed];
      localStorage.setItem('her_library_custom_tags', JSON.stringify(updated));
      return updated;
    });
    showToast(`Tag "${trimmed}" created! 🏷️`);
  };

  const handleDeleteTag = async (tagId, label) => {
    const cleanLabel = label.replace(/[^\w\s\u00C0-\u017F]/g, '').trim();
    if (!confirm(`Are you sure you want to delete the tag "${cleanLabel || label}"? This will remove the tag from all books.`)) {
      return;
    }

    const updatedBooks = books.map((b) => {
      if (b.tags) {
        const newTags = b.tags.filter(t => {
          const normT = t.toLowerCase();
          const cleanT = t.replace(/[^\w\s\u00C0-\u017F]/g, '').trim().toLowerCase();
          const cleanTagId = tagId.replace(/[^\w\s\u00C0-\u017F]/g, '').trim().toLowerCase();
          return normT !== tagId.toLowerCase() && cleanT !== cleanTagId && normT !== label.toLowerCase() && cleanT !== cleanLabel.toLowerCase();
        });
        return { ...b, tags: newTags };
      }
      return b;
    });

    syncBooksState(updatedBooks);

    const isCustom = customTags.some(t => t.toLowerCase() === tagId.toLowerCase() || t.toLowerCase() === label.toLowerCase());
    if (isCustom) {
      const updatedCustom = customTags.filter(t => t.toLowerCase() !== tagId.toLowerCase() && t.toLowerCase() !== label.toLowerCase());
      setCustomTags(updatedCustom);
      localStorage.setItem('her_library_custom_tags', JSON.stringify(updatedCustom));
    } else {
      const updatedDeleted = [...deletedDefaultTags, tagId];
      setDeletedDefaultTags(updatedDeleted);
      localStorage.setItem('her_library_deleted_default_tags', JSON.stringify(updatedDeleted));
    }

    if (hasSupabase) {
      try {
        for (const book of updatedBooks) {
          const originalBook = books.find(b => b.id === book.id);
          if (originalBook && originalBook.tags?.length !== book.tags?.length) {
            await supabase
              .from('books')
              .update({ tags: book.tags })
              .eq('id', book.id);
          }
        }
      } catch (err) {
        console.error('Supabase update after deleting tag failed:', err);
      }
    }

    setActiveFilter('all');
    showToast(`Tag "${cleanLabel || label}" deleted successfully! 🗑️`);
  };

  const handleDeleteSeries = async (seriesName, option) => {
    if (option === 'metadata_only') {
      const updated = books.map((b) => {
        const match = b.series_name === seriesName || 
          (!b.series_name && seriesName === "Unnamed Series" && b.tags?.some(t => t.toLowerCase() === 'series'));
        if (match) {
          const updatedTags = (b.tags || []).filter(t => t.toLowerCase() !== 'series');
          return { ...b, series_name: null, tags: updatedTags };
        }
        return b;
      });
      syncBooksState(updated);
      showToast(`Series metadata removed. Books kept! 📦`);
      
      if (hasSupabase) {
        try {
          const booksToUpdate = books.filter(b => b.series_name === seriesName || (!b.series_name && seriesName === "Unnamed Series" && b.tags?.some(t => t.toLowerCase() === 'series')));
          for (const book of booksToUpdate) {
            const updatedTags = (book.tags || []).filter(t => t.toLowerCase() !== 'series');
            await supabase
              .from('books')
              .update({ series_name: null, tags: updatedTags })
              .eq('id', book.id);
          }
        } catch (err) {
          console.error(err);
        }
      }
    } else if (option === 'all_books') {
      const updated = books.filter((b) => {
        const match = b.series_name === seriesName || 
          (!b.series_name && seriesName === "Unnamed Series" && b.tags?.some(t => t.toLowerCase() === 'series'));
        return !match;
      });
      syncBooksState(updated);
      showToast(`Series and all its books deleted successfully! 🗑️`);
      
      if (hasSupabase) {
        try {
          const booksToDelete = books.filter((b) => {
            return b.series_name === seriesName || 
              (!b.series_name && seriesName === "Unnamed Series" && b.tags?.some(t => t.toLowerCase() === 'series'));
          });
          const deleteIds = booksToDelete.map(b => b.id);
          if (deleteIds.length > 0) {
            await supabase
              .from('books')
              .delete()
              .in('id', deleteIds);
          }
        } catch (err) {
          console.error(err);
        }
      }
    }
  };

  const handleAddBookToSeries = async (bookId, seriesName) => {
    const updated = books.map((b) => {
      if (b.id === bookId) {
        const currentTags = b.tags || [];
        const hasSeriesTag = currentTags.some(t => t.toLowerCase() === 'series');
        const updatedTags = hasSeriesTag ? currentTags : [...currentTags, 'Series'];
        return { ...b, series_name: seriesName, tags: updatedTags };
      }
      return b;
    });

    syncBooksState(updated);
    showToast("Book added to series successfully! 📦✨");

    if (hasSupabase) {
      try {
        const updatedBook = updated.find(b => b.id === bookId);
        if (updatedBook) {
          await supabase
            .from('books')
            .update({ series_name: seriesName, tags: updatedBook.tags })
            .eq('id', bookId);
        }
      } catch (err) {
        console.error('Supabase add book to series failed:', err);
      }
    }
  };

  const handleAddBookToTag = async (bookId, tagName) => {
    const updated = books.map((b) => {
      if (b.id === bookId) {
        const currentTags = b.tags || [];
        let updatedTags = [...currentTags];
        let updatedStatus = b.status;
        let updatedPage = b.current_page;
        
        const normTag = tagName.toLowerCase();
        if (normTag === 'favourites') {
          if (!currentTags.some(t => t.toLowerCase() === 'favourites')) {
            updatedTags.push('Favourites');
          }
        } else if (normTag === 'read') {
          updatedStatus = 'read';
          updatedPage = b.pages;
        } else if (normTag === 'reading') {
          updatedStatus = 'reading';
          if (b.current_page === 0) updatedPage = 1;
        } else {
          if (!currentTags.some(t => t.toLowerCase() === normTag)) {
            updatedTags.push(tagName);
          }
        }
        return { ...b, tags: updatedTags, status: updatedStatus, current_page: updatedPage };
      }
      return b;
    });
    
    syncBooksState(updated);
    showToast(`Book added to "${tagName}"! 📚✨`);
    
    if (hasSupabase) {
      try {
        const updatedBook = updated.find(item => item.id === bookId);
        if (updatedBook) {
          await supabase
            .from('books')
            .update({ tags: updatedBook.tags, status: updatedBook.status, current_page: updatedBook.current_page })
            .eq('id', bookId);
        }
      } catch (err) {
        console.error(err);
      }
    }
  };

  const handleToggleFavourite = async (id) => {
    const updated = books.map((b) => {
      if (b.id === id) {
        const currentTags = b.tags || [];
        const isFav = currentTags.some(t => t.toLowerCase() === 'favourites');
        const updatedTags = isFav 
          ? currentTags.filter(t => t.toLowerCase() !== 'favourites')
          : [...currentTags, 'Favourites'];
        return { ...b, tags: updatedTags };
      }
      return b;
    });

    syncBooksState(updated);
    
    setSelectedBook(prev => {
      if (prev && prev.id === id) {
        const isFav = prev.tags?.some(t => t.toLowerCase() === 'favourites');
        const updatedTags = isFav 
          ? prev.tags.filter(t => t.toLowerCase() !== 'favourites')
          : [...(prev.tags || []), 'Favourites'];
        return { ...prev, tags: updatedTags };
      }
      return prev;
    });

    if (hasSupabase) {
      try {
        const updatedBook = updated.find(b => b.id === id);
        if (updatedBook) {
          await supabase
            .from('books')
            .update({ tags: updatedBook.tags })
            .eq('id', id);
        }
      } catch (err) {
        console.error('Supabase toggle favourite failed:', err);
      }
    }
  };

  const handleDeleteBook = async (id, title) => {
    if (confirm(`Are you sure you want to delete "${title}"?`)) {
      // Physically remove from local state
      const updated = books.filter((b) => b.id !== id);

      syncBooksState(updated);
      showToast(`"${title}" has been deleted from your library 🗑️`);
      setSelectedBook(null);

      // Supabase update
      if (hasSupabase) {
        try {
          const bookToDelete = books.find(b => b.id === id);
          if (bookToDelete) {
            // Delete cover from covers storage if it's a Supabase URL
            if (bookToDelete.custom_cover && bookToDelete.custom_cover.includes('/storage/v1/object/public/covers/')) {
              const fileName = bookToDelete.custom_cover.split('/covers/').pop();
              if (fileName) {
                await supabase.storage.from('covers').remove([fileName]);
              }
            }
            // Delete PDF from books storage if it's a Supabase URL
            if (bookToDelete.pdf_url && bookToDelete.pdf_url.includes('/storage/v1/object/public/books/')) {
              const fileName = bookToDelete.pdf_url.split('/books/').pop();
              if (fileName) {
                await supabase.storage.from('books').remove([fileName]);
              }
            }
          }

          const { error } = await supabase
            .from('books')
            .delete()
            .eq('id', id);

          if (error) throw error;
        } catch (err) {
          console.error('Supabase delete failed:', err);
          showToast('⚠️ Failed to delete book from cloud database.');
        }
      }
    }
  };

  const handleAddBook = async (newBookData, coverFile, pdfFile) => {
    const tempId = Date.now() + Math.floor(Math.random() * 100000);
    const fullNewBook = { ...newBookData, id: tempId };

    // Optimistically add to state using functional updater to avoid stale state issues
    setBooks((prev) => {
      const updated = [...prev, fullNewBook];
      if (!hasSupabase) {
        localStorage.setItem('her_library_books', JSON.stringify(updated));
      }
      return updated;
    });
    showToast(`✨ Adding "${newBookData.title}" to your library...`);

    // Supabase update
    if (hasSupabase) {
      try {
        let customCoverUrl = newBookData.custom_cover;
        let pdfUrl = null;

        // Upload helper
        const uploadFile = async (bucket, file) => {
          const fileExt = file.name.split('.').pop();
          const sanitizedTitle = newBookData.title.toLowerCase().replace(/[^a-z0-9]/g, '_');
          const fileName = `${sanitizedTitle}_${Date.now()}.${fileExt}`;

          const { data, error } = await supabase.storage
            .from(bucket)
            .upload(fileName, file, {
              cacheControl: '3600',
              upsert: false
            });

          if (error) throw error;

          const { data: publicUrlData } = supabase.storage
            .from(bucket)
            .getPublicUrl(fileName);

          return publicUrlData.publicUrl;
        };

        // 1. Upload cover if provided
        if (coverFile) {
          showToast(`📸 Uploading cover image for "${newBookData.title}"...`);
          try {
            customCoverUrl = await uploadFile('covers', coverFile);
          } catch (coverErr) {
            console.error('Cover image upload failed:', coverErr);
            showToast('⚠️ Cover upload failed, using fallback.');
          }
        }

        // 2. Upload PDF if provided
        if (pdfFile) {
          showToast(`📁 Uploading PDF file for "${newBookData.title}"...`);
          try {
            pdfUrl = await uploadFile('books', pdfFile);
          } catch (pdfErr) {
            console.error('PDF upload failed:', pdfErr);
            showToast('⚠️ PDF upload failed.');
          }
        }

        // Create the updated row payload
        const finalBookData = {
          ...newBookData,
          custom_cover: customCoverUrl,
          pdf_url: pdfUrl
        };

        const { data, error } = await supabase
          .from('books')
          .insert([finalBookData])
          .select();

        if (error) throw error;

        if (data && data[0]) {
          // Replace tempId with the real database generated ID and updated remote URLs
          setBooks((prev) => prev.map((b) => (b.id === tempId ? data[0] : b)));
          showToast(`✨ "${newBookData.title}" successfully added and synced!`);
        }
      } catch (err) {
        console.error('Supabase add failed:', err);
        showToast('⚠️ Failed to add book to cloud database.');
      }
    } else {
      showToast(`✨ Added "${newBookData.title}" to local library!`);
    }
  };

  const handleEditBook = async (id, updatedBookData, coverFile, pdfFile) => {
    const targetBook = books.find((b) => b.id === id);
    if (!targetBook) return;

    let localCover = updatedBookData.custom_cover;
    let localPdf = targetBook.pdf_url;

    let fullUpdatedBook = {
      ...targetBook,
      ...updatedBookData,
      custom_cover: localCover,
      pdf_url: localPdf
    };

    setBooks((prev) => prev.map((b) => (b.id === id ? fullUpdatedBook : b)));
    showToast(`✨ Saving changes for "${updatedBookData.title}"...`);

    if (hasSupabase) {
      try {
        let customCoverUrl = targetBook.custom_cover;
        let pdfUrl = targetBook.pdf_url;

        const uploadFile = async (bucket, file) => {
          const fileExt = file.name.split('.').pop();
          const sanitizedTitle = updatedBookData.title.toLowerCase().replace(/[^a-z0-9]/g, '_');
          const fileName = `${sanitizedTitle}_${Date.now()}.${fileExt}`;

          const { data, error } = await supabase.storage
            .from(bucket)
            .upload(fileName, file, {
              cacheControl: '3600',
              upsert: false
            });

          if (error) throw error;

          const { data: publicUrlData } = supabase.storage
            .from(bucket)
            .getPublicUrl(fileName);

          return publicUrlData.publicUrl;
        };

        if (coverFile) {
          showToast(`📸 Uploading new cover image for "${updatedBookData.title}"...`);
          try {
            const oldCover = targetBook.custom_cover;
            customCoverUrl = await uploadFile('covers', coverFile);

            if (oldCover && oldCover.includes('/storage/v1/object/public/covers/')) {
              const oldFileName = oldCover.split('/covers/').pop();
              if (oldFileName) {
                await supabase.storage.from('covers').remove([oldFileName]);
              }
            }
          } catch (coverErr) {
            console.error('Cover image upload failed:', coverErr);
            showToast('⚠️ Cover upload failed.');
          }
        }

        if (pdfFile) {
          showToast(`📁 Uploading new PDF file for "${updatedBookData.title}"...`);
          try {
            const oldPdf = targetBook.pdf_url;
            pdfUrl = await uploadFile('books', pdfFile);

            if (oldPdf && oldPdf.includes('/storage/v1/object/public/books/')) {
              const oldFileName = oldPdf.split('/books/').pop();
              if (oldFileName) {
                await supabase.storage.from('books').remove([oldFileName]);
              }
            }
          } catch (pdfErr) {
            console.error('PDF upload failed:', pdfErr);
            showToast('⚠️ PDF upload failed.');
          }
        }

        const finalBookData = {
          ...updatedBookData,
          custom_cover: customCoverUrl,
          pdf_url: pdfUrl
        };

        const { data, error } = await supabase
          .from('books')
          .update(finalBookData)
          .eq('id', id)
          .select();

        if (error) throw error;

        if (data && data[0]) {
          setBooks((prev) => prev.map((b) => (b.id === id ? data[0] : b)));
          showToast(`✨ "${updatedBookData.title}" successfully updated!`);
        }
      } catch (err) {
        console.error('Supabase update failed:', err);
        showToast('⚠️ Failed to save changes in cloud database.');
      }
    } else {
      const finalUpdatedLocal = {
        ...targetBook,
        ...updatedBookData
      };
      setBooks((prev) => {
        const list = prev.map((b) => (b.id === id ? finalUpdatedLocal : b));
        localStorage.setItem('her_library_books', JSON.stringify(list));
        return list;
      });
      showToast(`✨ Saved changes for "${updatedBookData.title}" locally!`);
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
      if (activeFilter === 'fiction') {
        const isNonFiction = book.genres?.includes('self-help') ||
          book.tags?.some(t => {
            const tl = t.toLowerCase();
            return tl.includes('non-fiction') || tl.includes('nonfiction') || tl.includes('self-help') || tl.includes('motivational') || tl.includes('philosophy') || tl.includes('autobiography');
          });
        const hasFictionTag = book.tags?.some(t => t.toLowerCase() === 'fiction');
        const hasNonFictionTag = book.tags?.some(t => {
          const tl = t.toLowerCase();
          return tl === 'non-fiction' || tl === 'nonfiction';
        });

        if (hasNonFictionTag) return false;
        if (hasFictionTag) return true;
        return !isNonFiction;
      }
      if (activeFilter === 'non-fiction') {
        const isNonFiction = book.genres?.includes('self-help') ||
          book.tags?.some(t => {
            const tl = t.toLowerCase();
            return tl.includes('non-fiction') || tl.includes('nonfiction') || tl.includes('self-help') || tl.includes('motivational') || tl.includes('philosophy') || tl.includes('autobiography');
          });
        const hasFictionTag = book.tags?.some(t => t.toLowerCase() === 'fiction');
        const hasNonFictionTag = book.tags?.some(t => {
          const tl = t.toLowerCase();
          return tl === 'non-fiction' || tl === 'nonfiction';
        });

        if (hasFictionTag) return false;
        if (hasNonFictionTag) return true;
        return !!isNonFiction;
      }
      return (book.genres && book.genres.includes(activeFilter)) || (book.tags && book.tags.some(t => t.toLowerCase() === activeFilter));
    }
  });

  // Group books by series for Series tab
  const seriesGroups = {};
  activeBooks.forEach((book) => {
    const hasSeriesTag = book.tags?.some(t => t.toLowerCase() === 'series');
    const hasSeriesName = !!book.series_name;
    if (hasSeriesTag || hasSeriesName) {
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchSearch =
          book.title.toLowerCase().includes(q) ||
          book.author.toLowerCase().includes(q) ||
          (book.series_name && book.series_name.toLowerCase().includes(q)) ||
          (book.tags && book.tags.some((t) => t.toLowerCase().includes(q)));
        if (!matchSearch) return;
      }
      const sName = book.series_name || "Unnamed Series";
      if (!seriesGroups[sName]) {
        seriesGroups[sName] = [];
      }
      seriesGroups[sName].push(book);
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
            { id: 'series', label: 'Series 📚' },
            { id: 'favourites', label: 'Favourites ❤️' },
            { id: 'fiction', label: 'Fiction 📖' },
            { id: 'non-fiction', label: 'Non-fiction 🧠' },
            { id: 'romance', label: 'Romance 💕' },
            { id: 'thriller', label: 'Thriller 🔪' },
            { id: 'self-help', label: 'Self Help 🌱' },
            { id: 'literary', label: 'Literary 📜' },
            { id: 'hindi', label: 'Hindi Lit 🇮🇳' },
          ].filter(tab => !deletedDefaultTags.includes(tab.id))
           .concat(customTags.map(tag => ({ id: tag.toLowerCase(), label: tag })))
           .concat([{ id: 'hidden', label: 'Hidden 🙈' }])
           .map((tab) => (
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
          {/* Create Tag Tab */}
          <button
            onClick={() => {
              const name = prompt("Enter new tag name:");
              if (name && name.trim()) {
                handleCreateTag(name);
              }
            }}
            className="font-sans text-xs font-medium tracking-wide px-4 py-2 rounded-full border border-dashed border-[#d4a853]/40 bg-[#d4a853]/5 text-[#d4a853] hover:bg-[#d4a853]/10 cursor-pointer transition-all select-none"
          >
            ➕ Create Tag
          </button>
        </div>

        {/* Add Book trigger button row */}
        <div className="flex justify-center items-center gap-3 mb-12">
          {/* Delete Tag Button (only visible for non-excluded tags) */}
          {!['all', 'read', 'reading', 'series', 'favourites', 'hidden'].includes(activeFilter) && (
            <button
              onClick={() => {
                const allTabs = [
                  { id: 'all', label: 'All Books' },
                  { id: 'read', label: 'Read ✓' },
                  { id: 'reading', label: 'Currently Reading' },
                  { id: 'series', label: 'Series 📚' },
                  { id: 'favourites', label: 'Favourites ❤️' },
                  { id: 'fiction', label: 'Fiction 📖' },
                  { id: 'non-fiction', label: 'Non-fiction 🧠' },
                  { id: 'romance', label: 'Romance 💕' },
                  { id: 'thriller', label: 'Thriller 🔪' },
                  { id: 'self-help', label: 'Self Help 🌱' },
                  { id: 'literary', label: 'Literary 📜' },
                  { id: 'hindi', label: 'Hindi Lit 🇮🇳' },
                  ...customTags.map(tag => ({ id: tag.toLowerCase(), label: tag })),
                  { id: 'hidden', label: 'Hidden 🙈' },
                ];
                const currentTab = allTabs.find(t => t.id === activeFilter);
                if (currentTab) {
                  handleDeleteTag(currentTab.id, currentTab.label);
                }
              }}
              className="flex items-center gap-2 bg-red-950/40 border border-red-500/35 hover:bg-red-950/60 py-2.5 px-6 rounded-full text-red-400 font-sans font-semibold text-xs tracking-wide cursor-pointer transition-all shadow-md active:scale-95"
            >
              🗑️ Delete Tag
            </button>
          )}
          <button
            onClick={() => setIsAddOpen(true)}
            className="flex items-center gap-2 bg-[#d4a853]/10 border border-[#d4a853]/45 hover:bg-[#d4a853]/15 py-2.5 px-6 rounded-full text-[#d4a853] font-sans font-semibold text-xs tracking-wide cursor-pointer transition-all shadow-md active:scale-95"
          >
            ➕ Add a Book
          </button>
        </div>
        {activeFilter === 'series' ? (
          <div className="flex flex-col gap-10 mt-8">
            {Object.keys(seriesGroups).length === 0 ? (
              <div className="text-center font-lora italic text-[#a89880] py-16 text-base">
                No series found... yet 📚
              </div>
            ) : (
              Object.entries(seriesGroups).map(([seriesName, seriesBooks]) => {
                const allHidden = seriesBooks.every(b => b.is_hidden);
                return (
                  <div key={seriesName} className="border border-[#d4a853]/15 rounded-2xl p-6 bg-white/[0.02] shadow-sm">
                    <div className="flex justify-between items-center border-b border-[#d4a853]/10 pb-3 mb-6 flex-wrap gap-4">
                      <div>
                        <h3 className="font-playfair text-xl font-bold text-[#e8dcc8]">
                          📦 Series: <span className="text-[#d4a853]">{seriesName}</span>
                        </h3>
                        <p className="font-sans text-[10px] text-[#a89880] mt-1">
                          {seriesBooks.length} book{seriesBooks.length === 1 ? '' : 's'} in this series
                        </p>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => setSeriesToDelete(seriesName)}
                          className="font-sans text-[10px] px-3.5 py-1.5 rounded-full border border-red-500/35 bg-red-950/40 text-red-400 hover:bg-red-950/60 cursor-pointer transition-colors"
                        >
                          🗑️ Delete Series
                        </button>
                        <button
                          onClick={() => handleToggleSeriesHide(seriesName, !allHidden)}
                          className={`font-sans text-[10px] px-3.5 py-1.5 rounded-full border transition-all cursor-pointer flex items-center gap-1.5
                            ${allHidden 
                              ? 'bg-emerald-950/40 border-emerald-500/30 text-[#4ade80] hover:bg-emerald-950/60' 
                              : 'bg-zinc-800/40 border-zinc-700 text-[#a89880] hover:bg-zinc-800/70 hover:text-white'}`}
                        >
                          {allHidden ? '👁️ Show Series' : '🙈 Hide Series from ALL'}
                        </button>
                      </div>
                    </div>
                    <div className="grid grid-cols-[repeat(auto-fill,minmax(180px,1fr))] gap-7">
                      {seriesBooks.map((book, idx) => (
                        <BookCard 
                          key={book.id} 
                          book={book} 
                          index={idx} 
                          onClick={setSelectedBook} 
                        />
                      ))}
                      {/* Add Book to Series Dotted Button */}
                      <button
                        onClick={() => setSeriesForAddingBook(seriesName)}
                        className="relative w-full aspect-[2/3] rounded-r-xl rounded-l-md border-2 border-dashed border-[#d4a853]/30 hover:border-[#d4a853]/60 hover:bg-[#d4a853]/5 flex flex-col items-center justify-center gap-2 text-[#a89880] hover:text-[#d4a853] transition-all cursor-pointer group"
                      >
                        <span className="text-3xl group-hover:scale-110 transition-transform">➕</span>
                        <span className="font-sans text-[11px] font-semibold tracking-wide">Add Book to Series</span>
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        ) : isLoading ? (
          <div className="text-center font-lora italic text-[#a89880] py-16 text-base animate-pulse">
            Opening your pages... 📖
          </div>
        ) : (
          <BookGrid 
            books={filteredBooks} 
            onBookSelect={setSelectedBook} 
            onAddClick={() => {
              if (activeFilter === 'all') {
                setIsAddOpen(true);
              } else {
                setTagForAddingBook(activeFilter);
              }
            }}
            showAddButton={activeFilter !== 'hidden'}
          />
        )}

        {/* Spine Shelf View */}
        <BookShelf books={activeBooks} onBookSelect={setSelectedBook} />
      </main>

      {/* Birthday Footer */}
      <footer className="relative z-10 text-center py-16 px-6 bg-[radial-gradient(ellipse_at_50%_70%,#1f0a1a_0%,var(--midnight)_80%)] border-t border-white/[0.03] select-none">
        <div className="text-xl mb-4">🌹💕📚✨🎂</div>
        <div className="font-playfair text-[#e8dcc8] font-bold text-2xl tracking-wide">
          Happy Birthday, <span className="text-[#c4869a]">Harviii</span>
        </div>
        <div className="font-lora text-[0.88rem] leading-relaxed text-[#a89880] italic max-w-md mx-auto mt-5">
          "She is too fond of books, and it has turned her brain."
          <span className="block text-right mt-2 text-[#d4a853]">— Louisa May Alcott</span>
          <br />
          May every chapter of your life be as <br />beautiful as the books you've read. 🌸
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
          onEditClick={() => {
            setBookToEdit(selectedBook);
            setSelectedBook(null);
            setIsAddOpen(true);
          }}
          isHidden={selectedBook.is_hidden}
          onToggleFavourite={handleToggleFavourite}
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
        onClose={() => {
          setIsAddOpen(false);
          setBookToEdit(null);
        }}
        onAddBook={handleAddBook}
        onEditBook={handleEditBook}
        bookToEdit={bookToEdit}
        onShowToast={showToast}
        books={books}
        customTags={customTags}
        onCreateTag={handleCreateTag}
      />

      <ExploreAddModal
        isOpen={!!exploreBookTitle}
        bookTitle={exploreBookTitle}
        onClose={() => setExploreBookTitle('')}
        onAddBookClick={handleAddBookFromRecommendation}
      />

      {/* Series Delete Confirmation Modal */}
      {seriesToDelete && (
        <div className="fixed inset-0 z-[10000] bg-black/85 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="relative bg-[#0d1117] border border-[#d4a853]/25 w-full max-w-md rounded-2xl p-6 text-center text-[#e8dcc8] shadow-2xl flex flex-col items-center gap-4 font-lora">
            <div className="text-4xl">⚠️</div>
            <h3 className="font-playfair text-xl font-bold">Delete Series: "{seriesToDelete}"</h3>
            <p className="font-sans text-xs text-[#a89880] leading-relaxed">
              Are you sure you want to delete this series? Please select one of the options below:
            </p>
            <div className="flex flex-col gap-2.5 w-full mt-4 font-sans text-xs">
              <button
                onClick={() => {
                  handleDeleteSeries(seriesToDelete, 'metadata_only');
                  setSeriesToDelete(null);
                }}
                className="w-full py-2.5 px-4 bg-white/[0.04] border border-[#d4a853]/35 hover:bg-[#d4a853]/5 text-[#d4a853] font-bold rounded-lg cursor-pointer transition-all"
              >
                Delete Series metadata only (Keep books)
              </button>
              <button
                onClick={() => {
                  handleDeleteSeries(seriesToDelete, 'all_books');
                  setSeriesToDelete(null);
                }}
                className="w-full py-2.5 px-4 bg-red-950/40 border border-red-500/40 hover:bg-red-950/60 text-red-400 font-bold rounded-lg cursor-pointer transition-all"
              >
                Delete all books in the series (Delete books & series)
              </button>
              <button
                onClick={() => setSeriesToDelete(null)}
                className="w-full py-2 bg-zinc-800 hover:bg-zinc-700 text-[#e8dcc8] rounded-lg cursor-pointer transition-all"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Choose book to add to Series dialog */}
      {seriesForAddingBook && (
        <div className="fixed inset-0 z-[10000] bg-black/80 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="relative bg-[#0d1117] border border-[#d4a853]/25 w-full max-w-md rounded-2xl p-6 text-[#e8dcc8] shadow-2xl flex flex-col gap-4 font-lora max-h-[80vh]">
            <h3 className="font-playfair text-lg font-bold">
              Select Book for Series: <span className="text-[#d4a853]">{seriesForAddingBook}</span>
            </h3>
            <button
              onClick={() => setSeriesForAddingBook(null)}
              className="absolute right-4 top-4 text-[#a89880] hover:text-white bg-none border-none cursor-pointer text-lg"
            >
              ✕
            </button>
            <div className="overflow-y-auto flex flex-col gap-2 pr-1 max-h-[50vh] no-scrollbar">
              {activeBooks
                .filter(b => b.series_name !== seriesForAddingBook)
                .map(book => (
                  <button
                    key={book.id}
                    onClick={() => {
                      handleAddBookToSeries(book.id, seriesForAddingBook);
                      setSeriesForAddingBook(null);
                    }}
                    className="flex items-center gap-3 w-full bg-white/[0.02] border border-white/5 hover:border-[#d4a853]/40 hover:bg-[#d4a853]/5 p-2.5 rounded-xl text-left cursor-pointer transition-all text-xs"
                  >
                    <span className="text-xl">{book.icon || '📚'}</span>
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold truncate text-[#e8dcc8]">{book.title}</div>
                      <div className="text-[10px] text-[#a89880] truncate">by {book.author}</div>
                    </div>
                  </button>
                ))}
              {activeBooks.filter(b => b.series_name !== seriesForAddingBook).length === 0 && (
                <div className="text-center italic text-[#a89880] py-6">No books available to add</div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Choose book to add to custom tag dialog */}
      {tagForAddingBook && (
        <div className="fixed inset-0 z-[10000] bg-black/80 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="relative bg-[#0d1117] border border-[#d4a853]/25 w-full max-w-md rounded-2xl p-6 text-[#e8dcc8] shadow-2xl flex flex-col gap-4 font-lora max-h-[80vh]">
            <h3 className="font-playfair text-lg font-bold">
              Select Book to add tag: <span className="text-[#d4a853]">{tagForAddingBook}</span>
            </h3>
            <button
              onClick={() => setTagForAddingBook(null)}
              className="absolute right-4 top-4 text-[#a89880] hover:text-white bg-none border-none cursor-pointer text-lg"
            >
              ✕
            </button>
            <div className="overflow-y-auto flex flex-col gap-2 pr-1 max-h-[50vh] no-scrollbar">
              {activeBooks
                .filter(b => !b.tags?.some(t => t.toLowerCase() === tagForAddingBook.toLowerCase()))
                .map(book => (
                  <button
                    key={book.id}
                    onClick={() => {
                      handleAddBookToTag(book.id, tagForAddingBook);
                      setTagForAddingBook(null);
                    }}
                    className="flex items-center gap-3 w-full bg-white/[0.02] border border-white/5 hover:border-[#d4a853]/40 hover:bg-[#d4a853]/5 p-2.5 rounded-xl text-left cursor-pointer transition-all text-xs"
                  >
                    <span className="text-xl">{book.icon || '📚'}</span>
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold truncate text-[#e8dcc8]">{book.title}</div>
                      <div className="text-[10px] text-[#a89880] truncate">by {book.author}</div>
                    </div>
                  </button>
                ))}
              {activeBooks.filter(b => !b.tags?.some(t => t.toLowerCase() === tagForAddingBook.toLowerCase())).length === 0 && (
                <div className="text-center italic text-[#a89880] py-6">No books available to add</div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* AI Librarian Chatbot */}
      <ChatbotWidget books={books} />

      {/* Success/Action Feedback Toast messages */}
      <Toast message={toastMessage} onClose={() => setToastMessage('')} />
    </div>
  );
}
