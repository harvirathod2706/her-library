import React, { useState, useEffect } from 'react';
import { getBookFileName } from './BookGrid';

export default function PdfReaderModal({ book, onClose, onSaveProgress, onShowToast }) {
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(100);
  const [pdfState, setPdfState] = useState('checking'); // 'checking', 'found', 'not_found'
  
  // A unique key we can increment to force-reload the iframe when jumping to page numbers
  const [iframeKey, setIframeKey] = useState(0);

  const fileName = book ? getBookFileName(book.title) : '';

  useEffect(() => {
    if (!book) return;
    
    // Set initial values
    setCurrentPage(book.current_page || 1);
    setTotalPages(book.pages || 100);
    
    // Check if the PDF file exists in public/Books/
    async function checkPdf() {
      if (book.pdf_url) {
        setPdfState('found');
        return;
      }
      setPdfState('checking');
      const pdfPath = `/Books/${fileName}.pdf`;
      try {
        const response = await fetch(pdfPath, { method: 'HEAD' });
        const contentType = response.headers.get('content-type') || '';
        
        if (response.ok && contentType.toLowerCase().includes('application/pdf')) {
          setPdfState('found');
        } else {
          setPdfState('not_found');
        }
      } catch (e) {
        // Fallback for CORS block in local file environments (try loading iframe)
        setPdfState('found');
      }
    }
    
    checkPdf();
  }, [book, fileName, book.pdf_url]);

  if (!book) return null;

  const handleBookmarkSave = (e) => {
    if (e) e.preventDefault();
    
    const pageVal = Math.min(totalPages, Math.max(1, parseInt(currentPage, 10) || 1));
    const totalVal = Math.max(1, parseInt(totalPages, 10) || 100);
    
    setCurrentPage(pageVal);
    setTotalPages(totalVal);
    
    // Sync database / localStorage
    onSaveProgress(book.id, pageVal, totalVal);
    
    // Increment the iframeKey to force-reload the iframe with the new page hash
    setIframeKey(prev => prev + 1);
  };

  const basePdfPath = book.pdf_url || `/Books/${fileName}.pdf`;
  const pdfUrl = `${basePdfPath}#page=${currentPage}&toolbar=0&navpanes=0`;

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
      <div className="flex-1 w-full bg-[#111827] relative flex items-center justify-center">
        
        {pdfState === 'checking' && (
          <div className="text-center font-lora italic text-[#a89880] text-sm animate-pulse">
            Opening pages... 📖
          </div>
        )}

        {pdfState === 'found' && (
          <iframe 
            key={iframeKey}
            className="w-full h-full border-none"
            src={pdfUrl}
            title={book.title}
          />
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
