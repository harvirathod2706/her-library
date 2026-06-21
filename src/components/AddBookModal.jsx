import React, { useState, useEffect } from 'react';
import { generateBookDetails } from '../geminiServices';

const POPULAR_BOOKS_AUTO_FILL = {
  "verity": {
    author: "Colleen Hoover",
    tags: "Psychological Thriller, Dark, Twisted, Romance",
    description: "A dark, chilling, and completely addictive psychological thriller with a romance subplot that will keep you guessing until the final page."
  },
  "normal people": {
    author: "Sally Rooney",
    tags: "Literary, Romance, Contemporary, Emotional",
    description: "An exquisite love story about two people who try to stay apart but find they are magnetically drawn back together."
  },
  "it ends with us": {
    author: "Colleen Hoover",
    tags: "Contemporary Romance, Emotional, Powerful",
    description: "One of those books that breaks you open and puts you back together differently."
  },
  "the seven husbands of evelyn hugo": {
    author: "Taylor Jenkins Reid",
    tags: "Historical Fiction, Drama, Romance, Hollywood",
    description: "An aging and reclusive Hollywood movie icon finally decides to tell the truth about her glamorous and scandalous life."
  },
  "reminders of him": {
    author: "Colleen Hoover",
    tags: "Romance, Emotional, Healing, Contemporary",
    description: "A troubled young mother yearns for a shot at redemption in this heartbreaking yet hopeful story."
  },
  "the silent patient": {
    author: "Alex Michaelides",
    tags: "Psychological Thriller, Mystery, Plot Twist",
    description: "A shocking psychological thriller of a woman’s act of violence against her husband—and the therapist obsessed with uncovering her motive."
  },
  "ugly love": {
    author: "Colleen Hoover",
    tags: "Romance, Contemporary, Angst",
    description: "When Tate Collins meets airline pilot Miles Archer, they know it isn’t love at first sight. They wouldn’t even go so far as to consider themselves friends. The only thing they have in common is an undeniable mutual attraction."
  }
};

export default function AddBookModal({ isOpen, onClose, onAddBook, onEditBook, bookToEdit, onShowToast, books }) {
  const [title, setTitle] = useState('');
  const [author, setAuthor] = useState('');
  const [tags, setTags] = useState('');
  const [description, setDescription] = useState('');
  const [coverBase64, setCoverBase64] = useState('');
  const [pages, setPages] = useState(350);
  const [coverFile, setCoverFile] = useState(null);
  const [pdfFile, setPdfFile] = useState(null);
  const [similar, setSimilar] = useState([]);
  const [seriesName, setSeriesName] = useState('');
  const [seriesBookTitles, setSeriesBookTitles] = useState([]);

  useEffect(() => {
    if (bookToEdit) {
      setTitle(bookToEdit.title || '');
      setAuthor(bookToEdit.author || '');
      setTags(bookToEdit.tags ? bookToEdit.tags.join(', ') : '');
      setDescription(bookToEdit.note || '');
      setPages(bookToEdit.pages || 350);
      setCoverBase64(bookToEdit.custom_cover || '');
      setSimilar(bookToEdit.similar || []);
      setSeriesName(bookToEdit.series_name || '');
      setSeriesBookTitles([]);
    } else {
      setTitle('');
      setAuthor('');
      setTags('');
      setDescription('');
      setPages(350);
      setCoverBase64('');
      setSimilar([]);
      setSeriesName('');
      setSeriesBookTitles([]);
    }
    setCoverFile(null);
    setPdfFile(null);
  }, [bookToEdit, isOpen]);

  if (!isOpen) return null;

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setCoverFile(file);
      const reader = new FileReader();
      reader.onload = (event) => {
        setCoverBase64(event.target.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handlePdfChange = async (e) => {
    const file = e.target.files[0];
    if (file) {
      setPdfFile(file);
      onShowToast("Analyzing PDF page count... 🔍");
      
      const readPages = () => {
        return new Promise((resolve) => {
          const reader = new FileReader();
          reader.onload = async function() {
            try {
              const typedarray = new Uint8Array(this.result);
              
              if (typeof window.pdfjsLib === 'undefined') {
                const script = document.createElement('script');
                script.src = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.16.105/pdf.min.js';
                script.onload = async () => {
                  window.pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.16.105/pdf.worker.min.js';
                  try {
                    const pdf = await window.pdfjsLib.getDocument({ data: typedarray }).promise;
                    resolve(pdf.numPages);
                  } catch (e) {
                    console.error("PDF.js parse failed:", e);
                    resolve(estimatePdfPages(typedarray));
                  }
                };
                script.onerror = () => {
                  resolve(estimatePdfPages(typedarray));
                };
                document.head.appendChild(script);
              } else {
                const pdf = await window.pdfjsLib.getDocument({ data: typedarray }).promise;
                resolve(pdf.numPages);
              }
            } catch (err) {
              console.error("PDF.js load failed, falling back to estimation:", err);
              resolve(estimatePdfPages(new Uint8Array(this.result)));
            }
          };
          reader.readAsArrayBuffer(file);
        });
      };

      const estimatePdfPages = (uint8Array) => {
        try {
          const text = new TextDecoder('ascii').decode(uint8Array);
          const matches = [...text.matchAll(/\/Count\s+(\d+)/g)];
          if (matches.length > 0) {
            const counts = matches.map(m => parseInt(m[1], 10)).filter(c => !isNaN(c) && c < 50000);
            if (counts.length > 0) {
              return Math.max(...counts);
            }
          }
        } catch (e) {
          console.error(e);
        }
        return 350;
      };

      const pdfPages = await readPages();
      setPages(pdfPages);
      onShowToast(`✨ Successfully read PDF: ${pdfPages} pages total!`);
    }
  };

  const handleAutoFill = async () => {
    const tVal = title.trim();
    if (!tVal) {
      onShowToast("Please enter a Book Title first to auto-generate details! ✨");
      return;
    }

    onShowToast("Librarian AI is generating details... 🪄✨");

    try {
      const details = await generateBookDetails(tVal, author.trim());
      if (details.author) setAuthor(details.author);
      if (details.tags) setTags(details.tags);
      if (details.description) setDescription(details.description);
      if (details.pages) setPages(details.pages);
      if (details.coverUrl) setCoverBase64(details.coverUrl);
      if (details.similar) setSimilar(details.similar);
      onShowToast("✨ Details auto-filled perfectly using Gemini AI!");
    } catch (err) {
      console.warn("Gemini auto-fill failed, using local fallback:", err);
      
      const key = tVal.toLowerCase();
      const match = POPULAR_BOOKS_AUTO_FILL[key];

      if (match) {
        setAuthor(match.author);
        setTags(match.tags);
        setDescription(match.description);
        onShowToast("✨ Local match found! Auto-filled from recommendations.");
      } else {
        const fallbackAuthors = ["Sally Rooney", "Emily Henry", "Colleen Hoover", "Khaled Hosseini", "Taylor Jenkins Reid", "Holly Jackson"];
        const selectedAuthor = author.trim() || fallbackAuthors[Math.floor(Math.random() * fallbackAuthors.length)];
        
        const possibleTags = ["Romance 💕", "Thriller 🔪", "Emotional 🥺", "Page-turner 📖", "Beautiful 🌸", "Dark 🖤", "Heartwarming ✨"];
        const shuffled = [...possibleTags].sort(() => 0.5 - Math.random());
        const generatedTags = shuffled.slice(0, 3).join(", ");
        
        const generatedDesc = `A beautiful, captivating read about "${tVal}" by ${selectedAuthor}. It takes you on a deep, emotional journey that you will not want to put down. ✨`;

        setAuthor(selectedAuthor);
        setTags(generatedTags);
        setDescription(generatedDesc);
        onShowToast("✨ Local auto-fill generated creative placeholders.");
      }
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!title.trim() || !author.trim() || !tags.trim() || !description.trim()) {
      onShowToast("Please fill in all fields! ⚠️");
      return;
    }

    const tagList = tags.split(",").map(t => t.trim()).filter(Boolean);
    
    // Automatically add "Series" tag if seriesName is provided
    if (seriesName.trim() && !tagList.some(t => t.toLowerCase() === 'series')) {
      tagList.push('Series');
    }
    
    const tagsLower = tagList.map(t => t.toLowerCase());

    // Determine status
    let status = "want";
    if (tagsLower.some(t => t.includes("read") || t.includes("devoured"))) {
      status = "read";
    } else if (tagsLower.some(t => t.includes("reading"))) {
      status = "reading";
    }

    // Determine theme
    const themes = ["theme-wine", "theme-navy", "theme-forest", "theme-plum", "theme-teal", "theme-brown", "theme-rose", "theme-amber"];
    const theme = themes[Math.floor(Math.random() * themes.length)];

    // Determine genres
    let genres = [];
    if (tagsLower.some(t => t.includes("romance") || t.includes("love"))) {
      genres.push("romance");
    }
    if (tagsLower.some(t => t.includes("thriller") || t.includes("mystery") || t.includes("murder") || t.includes("suspense"))) {
      genres.push("thriller");
    }
    if (genres.length === 0) {
      genres.push("literary");
    }

    const isSeriesActive = tagList.map(t => t.toLowerCase()).includes('series');

    const finalBook = {
      title: title.trim(),
      author: author.trim(),
      status: status,
      icon: bookToEdit ? bookToEdit.icon : "📚",
      theme: bookToEdit ? bookToEdit.theme : theme,
      genres: genres,
      tags: tagList,
      note: description.trim(),
      pages: pages,
      similar: similar,
      custom_cover: coverBase64 || null,
      current_page: bookToEdit ? Math.min(pages, bookToEdit.current_page) : (status === "read" ? pages : 0),
      series_name: isSeriesActive ? seriesName.trim() : null
    };

    if (bookToEdit) {
      onEditBook(bookToEdit.id, finalBook, coverFile, pdfFile);
    } else {
      onAddBook(finalBook, coverFile, pdfFile);
    }

    if (isSeriesActive && seriesBookTitles.length > 0) {
      seriesBookTitles.forEach((extraTitle) => {
        const trimmedExtra = extraTitle.trim();
        if (trimmedExtra) {
          const extraBook = {
            title: trimmedExtra,
            author: author.trim(),
            status: "want",
            icon: "📚",
            theme: themes[Math.floor(Math.random() * themes.length)],
            genres: genres,
            tags: [...tagList],
            note: `Part of the series: ${seriesName.trim()}`,
            pages: 350,
            similar: [],
            custom_cover: null,
            current_page: 0,
            series_name: seriesName.trim()
          };
          onAddBook(extraBook, null, null);
        }
      });
    }

    handleClose();
  };

  const handleClose = () => {
    setTitle('');
    setAuthor('');
    setTags('');
    setDescription('');
    setPages(350);
    setCoverBase64('');
    setCoverFile(null);
    setPdfFile(null);
    setSimilar([]);
    setSeriesName('');
    setSeriesBookTitles([]);
    onClose();
  };

  const DEFAULT_TAGS = [
    "Series", "Fiction", "Non-fiction", "Romance 💕", "Thriller 🔪", "Self Help 🌱", 
    "Mystery 🔍", "Fantasy 🔮", "Emotional 🥺", "Classic 📜", "Hindi Lit 🇮🇳", 
    "Dystopian 💫", "Philosophy 🧠"
  ];

  const uniqueTagsList = [];
  const seenTags = new Set();
  [...DEFAULT_TAGS, ...(books ? books.flatMap(b => b.tags || []) : [])].forEach(t => {
    const norm = t.trim().toLowerCase();
    if (norm && !seenTags.has(norm)) {
      seenTags.add(norm);
      uniqueTagsList.push(t.trim());
    }
  });

  const handleTagToggle = (tagText) => {
    const currentTagsList = tags.split(',').map(t => t.trim()).filter(Boolean);
    const exists = currentTagsList.some(t => t.toLowerCase() === tagText.toLowerCase());

    let updatedTags;
    if (exists) {
      updatedTags = currentTagsList.filter(t => t.toLowerCase() !== tagText.toLowerCase());
    } else {
      updatedTags = [...currentTagsList, tagText];
    }
    setTags(updatedTags.join(', '));
  };

  return (
    <div 
      className="fixed inset-0 z-50 bg-black/85 flex items-center justify-center p-4 overflow-y-auto backdrop-blur-sm"
      onClick={(e) => e.target === e.currentTarget && handleClose()}
    >
      <div className="relative bg-[#0d1117] border border-[#d4a853]/25 w-full max-w-md rounded-2xl p-6 md:p-8 text-[#e8dcc8] shadow-2xl flex flex-col gap-6 max-h-[90vh] overflow-y-auto font-lora">
        {/* Close Button */}
        <button 
          onClick={handleClose}
          className="absolute right-4 top-4 w-8 h-8 rounded-full border border-white/10 hover:border-[#d4a853]/40 flex items-center justify-center text-lg text-[#a89880] hover:text-[#d4a853] transition-colors bg-none cursor-pointer"
        >
          ✕
        </button>

        {/* Modal Header */}
        <div>
          <h3 className="font-playfair text-xl md:text-2xl font-semibold text-[#e8dcc8]">
            {bookToEdit ? '✏️ Edit Book Details' : '✨ Add a New Book'}
          </h3>
          <div className="w-[40px] h-[2px] bg-gradient-to-r from-[#d4a853] to-transparent mt-2 mb-4" />
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="flex flex-col gap-4 font-sans text-xs">
          {/* Title */}
          <div className="flex flex-col gap-1.5">
            <label className="text-[#a89880] font-medium tracking-wide">Book Title</label>
            <input 
              type="text" 
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Verity" 
              className="bg-white/[0.04] border border-[#d4a853]/20 rounded-lg p-2.5 text-[#e8dcc8] font-lora text-sm outline-none form-input-focus"
              required 
            />
          </div>

          {/* Author */}
          <div className="flex flex-col gap-1.5">
            <label className="text-[#a89880] font-medium tracking-wide">Author Name</label>
            <input 
              type="text" 
              value={author}
              onChange={(e) => setAuthor(e.target.value)}
              placeholder="by Author Name" 
              className="bg-white/[0.04] border border-[#d4a853]/20 rounded-lg p-2.5 text-[#e8dcc8] font-lora text-sm outline-none form-input-focus"
              required 
            />
          </div>

          {/* Tags */}
          <div className="flex flex-col gap-1.5">
            <label className="text-[#a89880] font-medium tracking-wide">Genre Tags (comma-separated)</label>
            <input 
              type="text" 
              value={tags}
              onChange={(e) => setTags(e.target.value)}
              placeholder="e.g. Psychological Thriller, Dark, Suspense" 
              className="bg-white/[0.04] border border-[#d4a853]/20 rounded-lg p-2.5 text-[#e8dcc8] font-lora text-sm outline-none form-input-focus"
              required 
            />
            {/* Tag Pills Selector */}
            <div className="flex flex-wrap gap-1.5 mt-1.5 max-h-[110px] overflow-y-auto p-2 bg-white/[0.02] border border-white/5 rounded-lg select-none no-scrollbar">
              {uniqueTagsList.map((tag) => {
                const activeList = tags.split(',').map(t => t.trim()).filter(Boolean);
                const isSelected = activeList.some(t => t.toLowerCase() === tag.toLowerCase());
                return (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => handleTagToggle(tag)}
                    className={`font-sans text-[10px] px-2.5 py-1 rounded-full border transition-all cursor-pointer flex items-center gap-1 select-none
                      ${isSelected 
                        ? 'bg-[#d4a853]/15 border-[#d4a853] text-[#d4a853] font-semibold' 
                        : 'bg-white/[0.02] border-white/10 text-[#a89880] hover:bg-white/[0.04] hover:text-[#e8dcc8]'}`}
                  >
                    <span>{isSelected ? '✓' : '+'}</span>
                    {tag}
                    {isSelected && <span className="text-[8px] opacity-60 ml-0.5">✕</span>}
                  </button>
                );
              })}
            </div>
          </div>

          {/* PDF File upload */}
          <div className="flex flex-col gap-1.5">
            <label className="text-[#a89880] font-medium tracking-wide">Book PDF File</label>
            <div className="flex items-center gap-4">
              <input 
                type="file" 
                id="add-pdf-file" 
                accept="application/pdf" 
                onChange={handlePdfChange}
                className="hidden" 
              />
              <button 
                type="button" 
                onClick={() => document.getElementById('add-pdf-file').click()}
                className="bg-white/[0.04] border border-[#d4a853]/30 hover:bg-[#d4a853]/5 px-4 py-2 rounded-lg text-[#d4a853] font-bold transition-all cursor-pointer"
              >
                📁 Choose PDF
              </button>
              
              <div className="text-xs text-[#a89880] truncate max-w-[200px]">
                {pdfFile ? pdfFile.name : "No PDF selected"}
              </div>
            </div>
          </div>

          {/* Pages count */}
          <div className="flex flex-col gap-1.5">
            <label className="text-[#a89880] font-medium tracking-wide">Total Pages</label>
            <input 
              type="number" 
              value={pages}
              onChange={(e) => setPages(parseInt(e.target.value, 10) || 1)}
              placeholder="350" 
              className="bg-white/[0.04] border border-[#d4a853]/20 rounded-lg p-2.5 text-[#e8dcc8] font-lora text-sm outline-none form-input-focus"
              min={1}
              required 
            />
          </div>

          {/* Cover upload */}
          <div className="flex flex-col gap-1.5">
            <label className="text-[#a89880] font-medium tracking-wide">Cover Image</label>
            <div className="flex items-center gap-4">
              <input 
                type="file" 
                id="add-cover-file" 
                accept="image/*" 
                onChange={handleFileChange}
                className="hidden" 
              />
              <button 
                type="button" 
                onClick={() => document.getElementById('add-cover-file').click()}
                className="bg-white/[0.04] border border-[#d4a853]/30 hover:bg-[#d4a853]/5 px-4 py-2 rounded-lg text-[#d4a853] font-bold transition-all cursor-pointer"
              >
                📸 Choose Image
              </button>
              
              {/* Preview Box */}
              <div className="w-14 h-20 border border-dashed border-white/10 rounded-md flex items-center justify-center text-center overflow-hidden bg-black/10 text-[9px] text-[#a89880] px-1 select-none">
                {coverBase64 ? (
                  <img src={coverBase64} alt="Preview" className="w-full h-full object-cover" />
                ) : (
                  "No cover selected"
                )}
              </div>
            </div>
          </div>

          {/* Description */}
          <div className="flex flex-col gap-1.5">
            <label className="text-[#a89880] font-medium tracking-wide">Description / Personal Note</label>
            <textarea 
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Write a short review, note, or description..." 
              className="bg-white/[0.04] border border-[#d4a853]/20 rounded-lg p-2.5 text-[#e8dcc8] font-lora text-sm outline-none form-input-focus"
              rows={3}
              required
            />
          </div>

          {/* Series Name (shown only if 'Series' tag is active) */}
          {tags.split(',').map(t => t.trim().toLowerCase()).includes('series') && (
            <div className="flex flex-col gap-1.5">
              <label className="text-[#a89880] font-medium tracking-wide">Series Name</label>
              <input 
                type="text" 
                value={seriesName}
                onChange={(e) => setSeriesName(e.target.value)}
                placeholder="e.g. A Court of Thorns and Roses" 
                className="bg-white/[0.04] border border-[#d4a853]/20 rounded-lg p-2.5 text-[#e8dcc8] font-lora text-sm outline-none form-input-focus"
                required
              />
            </div>
          )}

          {/* Form Actions */}
          <div className="flex justify-between items-center gap-4 mt-4">
            <button 
              type="button" 
              onClick={handleAutoFill}
              className="bg-white/[0.03] border border-white/10 hover:border-[#d4a853]/40 hover:bg-[#d4a853]/5 px-4 py-2 rounded-lg text-[#a89880] hover:text-[#d4a853] font-bold transition-all cursor-pointer"
            >
              ✨ Auto Generate
            </button>
            <button 
              type="submit"
              className="bg-gradient-to-r from-[#7c2d3a] to-[#c4869a] border-none px-6 py-2 rounded-lg text-white font-bold transition-all shadow-md hover:opacity-95 cursor-pointer"
            >
              {bookToEdit ? '💾 Save Changes' : '💾 Add Book'}
            </button>
          </div>

          {/* Additional Books in Series Section (below add book button) */}
          {tags.split(',').map(t => t.trim().toLowerCase()).includes('series') && (
            <div className="border-t border-[#d4a853]/15 pt-4 mt-4 flex flex-col gap-3">
              <div className="flex justify-between items-center">
                <label className="text-[#a89880] font-medium tracking-wide">Add other books to this series:</label>
                <button
                  type="button"
                  onClick={() => setSeriesBookTitles([...seriesBookTitles, ''])}
                  className="text-[10px] bg-[#d4a853]/10 border border-[#d4a853]/40 hover:bg-[#d4a853]/20 px-2.5 py-1 rounded-full text-[#d4a853] font-bold cursor-pointer transition-colors font-sans"
                >
                  + Add Book
                </button>
              </div>
              {seriesBookTitles.map((item, idx) => (
                <div key={idx} className="flex gap-2 items-center">
                  <input
                    type="text"
                    value={item}
                    onChange={(e) => {
                      const updated = [...seriesBookTitles];
                      updated[idx] = e.target.value;
                      setSeriesBookTitles(updated);
                    }}
                    placeholder={`Book ${idx + 2} title`}
                    className="flex-1 bg-white/[0.04] border border-[#d4a853]/20 rounded-lg p-2.5 text-[#e8dcc8] font-lora text-xs outline-none"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => {
                      const updated = seriesBookTitles.filter((_, i) => i !== idx);
                      setSeriesBookTitles(updated);
                    }}
                    className="text-red-400 hover:text-red-500 font-bold p-2 cursor-pointer font-sans"
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
          )}
        </form>
      </div>
    </div>
  );
}
