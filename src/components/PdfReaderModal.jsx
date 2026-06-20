import React, { useState, useEffect, useRef } from 'react';
import { getBookFileName } from './BookGrid';

export default function PdfReaderModal({ book, onClose, onSaveProgress, onShowToast }) {
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(100);
  const [pdfState, setPdfState] = useState('checking'); // 'checking', 'found', 'not_found'
  const [pdfDoc, setPdfDoc] = useState(null);
  const [initialScrolled, setInitialScrolled] = useState(false);

  const containerRef = useRef(null);
  const pageRefs = useRef([]);
  const renderedPages = useRef(new Set());
  const scrollTimeout = useRef(null);

  const fileName = book ? getBookFileName(book.title) : '';

  useEffect(() => {
    if (!book) return;
    
    let isMounted = true;
    setCurrentPage(book.current_page || 1);
    setTotalPages(book.pages || 100);
    setInitialScrolled(false);
    renderedPages.current.clear();
    setPdfDoc(null);

    async function loadPdf() {
      setPdfState('checking');
      const basePdfPath = book.pdf_url || `/Books/${fileName}.pdf`;
      try {
        // Load PDF.js dynamically if not loaded
        if (typeof window.pdfjsLib === 'undefined') {
          await new Promise((resolve, reject) => {
            const script = document.createElement('script');
            script.src = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.16.105/pdf.min.js';
            script.onload = () => {
              window.pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.16.105/pdf.worker.min.js';
              resolve();
            };
            script.onerror = reject;
            document.head.appendChild(script);
          });
        }

        const loadingTask = window.pdfjsLib.getDocument(basePdfPath);
        const pdf = await loadingTask.promise;
        
        if (isMounted) {
          setPdfDoc(pdf);
          setTotalPages(pdf.numPages);
          setPdfState('found');
        }
      } catch (err) {
        console.error('Error loading PDF:', err);
        if (isMounted) {
          setPdfState('not_found');
        }
      }
    }
    
    loadPdf();
    
    return () => {
      isMounted = false;
    };
  }, [book, fileName, book.pdf_url]);

  // Handle scroll to detect current page
  const handleScroll = () => {
    if (!containerRef.current) return;
    
    if (scrollTimeout.current) clearTimeout(scrollTimeout.current);
    
    scrollTimeout.current = setTimeout(() => {
      const container = containerRef.current;
      const containerTop = container.getBoundingClientRect().top;
      
      let activePage = 1;
      let minDistance = Infinity;
      
      pageRefs.current.forEach((el, index) => {
        if (el) {
          const rect = el.getBoundingClientRect();
          const distance = Math.abs(rect.top - containerTop);
          if (distance < minDistance) {
            minDistance = distance;
            activePage = index + 1;
          }
        }
      });
      
      if (activePage !== currentPage) {
        setCurrentPage(activePage);
      }
    }, 50);
  };

  // Scroll to initial bookmarked page on load
  useEffect(() => {
    if (pdfState === 'found' && pdfDoc && !initialScrolled) {
      const startPage = book.current_page || 1;
      const timer = setTimeout(() => {
        const targetEl = pageRefs.current[startPage - 1];
        if (targetEl) {
          targetEl.scrollIntoView({ block: 'start' });
          setInitialScrolled(true);
        }
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [pdfState, pdfDoc, initialScrolled, book.current_page]);

  // Lazy render pages as they enter view
  useEffect(() => {
    if (!pdfDoc || pdfState !== 'found') return;
    
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const pageNum = parseInt(entry.target.getAttribute('data-page'), 10);
          if (pageNum && !renderedPages.current.has(pageNum)) {
            renderedPages.current.add(pageNum);
            renderPage(pageNum);
          }
        }
      });
    }, {
      root: containerRef.current,
      rootMargin: '400px 0px 400px 0px',
      threshold: 0.01
    });
    
    pageRefs.current.forEach(el => {
      if (el) observer.observe(el);
    });
    
    return () => {
      observer.disconnect();
    };
  }, [pdfDoc, pdfState]);

  const renderPage = async (pageNum) => {
    if (!pdfDoc) return;
    try {
      const page = await pdfDoc.getPage(pageNum);
      const canvas = document.getElementById(`page-canvas-${pageNum}`);
      if (!canvas) return;
      
      const context = canvas.getContext('2d');
      const viewport = page.getViewport({ scale: 1.5 });
      canvas.height = viewport.height;
      canvas.width = viewport.width;
      
      const renderContext = {
        canvasContext: context,
        viewport: viewport
      };
      
      await page.render(renderContext).promise;
    } catch (err) {
      console.error(`Error rendering page ${pageNum}:`, err);
    }
  };

  if (!book) return null;

  const handleBookmarkSave = (e) => {
    if (e) e.preventDefault();
    
    const pageVal = Math.min(totalPages, Math.max(1, parseInt(currentPage, 10) || 1));
    const totalVal = Math.max(1, parseInt(totalPages, 10) || 100);
    
    setCurrentPage(pageVal);
    setTotalPages(totalVal);
    onSaveProgress(book.id, pageVal, totalVal);
    
    const targetEl = pageRefs.current[pageVal - 1];
    if (targetEl) {
      targetEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-[#0d1117] flex flex-col select-none font-lora">
      
      {/* Header Controls Bar */}
      <header className="bg-[#111827] border-b border-[#d4a853]/20 px-6 py-4 flex flex-wrap justify-between items-center gap-4 z-10 shadow-lg">
        {/* Book Title */}
        <div className="flex items-center gap-3">
          <span className="text-2xl drop-shadow">{book.icon || '📖'}</span>
          <div>
            <h3 className="font-playfair text-[#e8dcc8] font-bold text-sm md:text-base leading-tight">
              {book.title}
            </h3>
            <p className="font-sans text-[10px] text-[#a89880] mt-0.5">
              by {book.author}
            </p>
          </div>
        </div>

        {/* Page / Bookmark Controls Form */}
        {pdfState === 'found' && (
          <form onSubmit={handleBookmarkSave} className="flex items-center gap-3 font-sans text-xs">
            <div className="flex items-center gap-1.5 bg-white/[0.03] border border-white/10 rounded-lg px-2.5 py-1">
              <span className="text-[#a89880] text-[10px] font-bold uppercase tracking-wider">Page</span>
              <input 
                type="number"
                value={currentPage}
                onChange={(e) => setCurrentPage(e.target.value)}
                className="w-14 bg-transparent text-center text-[#e8dcc8] font-bold text-sm outline-none"
                min={1}
                max={totalPages}
              />
              <span className="text-[#a89880] text-xs">/</span>
              <input 
                type="number"
                value={totalPages}
                onChange={(e) => setTotalPages(e.target.value)}
                className="w-14 bg-transparent text-center text-[#e8dcc8] font-bold text-sm outline-none"
                min={1}
              />
            </div>

            <button 
              type="submit"
              className="bg-[#d4a853]/10 border border-[#d4a853]/45 hover:bg-[#d4a853]/20 hover:border-[#d4a853] text-[#d4a853] font-bold px-4 py-1.5 rounded-lg text-xs cursor-pointer transition-all flex items-center gap-1"
            >
              <span>🔖</span> Bookmark & Go
            </button>
          </form>
        )}

        {/* Exit Button */}
        <button 
          onClick={onClose}
          className="flex items-center gap-1.5 text-[#a89880] hover:text-white bg-white/[0.04] border border-white/10 hover:border-white/20 px-3.5 py-1.5 rounded-lg font-sans text-xs cursor-pointer transition-colors"
        >
          ✕ Exit Reader
        </button>
      </header>

      {/* Reader Panel Viewport */}
      <div className="flex-1 w-full bg-[#111827] relative flex items-center justify-center overflow-hidden">
        
        {pdfState === 'checking' && (
          <div className="text-center font-lora italic text-[#a89880] text-sm animate-pulse">
            Opening pages... 📖
          </div>
        )}

        {pdfState === 'found' && (
          <div 
            ref={containerRef}
            onScroll={handleScroll}
            className="w-full h-full overflow-y-auto bg-[#0d1117] flex flex-col items-center gap-8 py-10 px-4 scroll-smooth"
          >
            {Array.from({ length: totalPages }, (_, i) => (
              <div 
                key={i} 
                data-page={i + 1}
                ref={el => pageRefs.current[i] = el}
                className="w-full max-w-3xl aspect-[1/1.414] bg-[#0f172a] border border-white/5 rounded-lg flex flex-col items-center justify-center relative shadow-2xl p-1"
              >
                <canvas 
                  id={`page-canvas-${i + 1}`}
                  className="w-full h-auto bg-white rounded shadow-md max-h-[85vh] object-contain block"
                />
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none -z-10 text-white/20 text-xs italic">
                  Loading Page {i + 1}... 📖
                </div>
              </div>
            ))}
          </div>
        )}

        {pdfState === 'not_found' && (
          <div className="text-center p-8 max-w-md bg-[#0d1117] border border-[#d4a853]/25 rounded-2xl shadow-2xl mx-6">
            <div className="text-3xl mb-4 text-[#d4a853]">📁</div>
            <h4 className="font-playfair text-lg font-bold text-[#e8dcc8] mb-2">
              Book PDF Not Found
            </h4>
            <p className="font-lora text-xs text-[#a89880] leading-relaxed mb-6">
              To read this book, place its PDF file in the <code className="bg-[#000]/40 px-1 py-0.5 rounded text-[#e8b4c0] font-mono">public/Books/</code> folder as:
            </p>
            <code className="block bg-[#000]/50 border border-white/5 px-4 py-3 rounded-lg text-[#e8b4c0] font-mono text-xs mb-6 select-all break-all text-center">
              Books/{fileName}.pdf
            </code>
            <button 
              onClick={onClose}
              className="px-6 py-2 bg-white/[0.03] border border-white/10 hover:bg-white/[0.08] hover:border-white/20 text-[#e8dcc8] text-xs font-bold rounded-lg cursor-pointer transition-all font-sans"
            >
              Back to Shelf
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
