import React, { useState, useEffect } from 'react';

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

export default function AddBookModal({ isOpen, onClose, onAddBook, onEditBook, bookToEdit, onShowToast }) {
  const [title, setTitle] = useState('');
  const [author, setAuthor] = useState('');
  const [tags, setTags] = useState('');
  const [description, setDescription] = useState('');
  const [coverBase64, setCoverBase64] = useState('');
  const [pages, setPages] = useState(350);
  const [coverFile, setCoverFile] = useState(null);
  const [pdfFile, setPdfFile] = useState(null);

  useEffect(() => {
    if (bookToEdit) {
      setTitle(bookToEdit.title || '');
      setAuthor(bookToEdit.author || '');
      setTags(bookToEdit.tags ? bookToEdit.tags.join(', ') : '');
      setDescription(bookToEdit.note || '');
      setPages(bookToEdit.pages || 350);
      setCoverBase64(bookToEdit.custom_cover || '');
    } else {
      setTitle('');
      setAuthor('');
      setTags('');
      setDescription('');
      setPages(350);
      setCoverBase64('');
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

  const handleAutoFill = () => {
    const tVal = title.trim();
    if (!tVal) {
      onShowToast("Please enter a Book Title first to auto-generate details! ✨");
      return;
    }

    const key = tVal.toLowerCase();
    const match = POPULAR_BOOKS_AUTO_FILL[key];

    if (match) {
      setAuthor(match.author);
      setTags(match.tags);
      setDescription(match.description);
      onShowToast("✨ Details auto-filled from popular recommendations!");
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
      onShowToast("✨ Auto-generated a creative set of details for you!");
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!title.trim() || !author.trim() || !tags.trim() || !description.trim()) {
      onShowToast("Please fill in all fields! ⚠️");
      return;
    }

    const tagList = tags.split(",").map(t => t.trim()).filter(Boolean);
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
      similar: bookToEdit ? bookToEdit.similar : [],
      custom_cover: coverBase64 || null,
      current_page: bookToEdit ? Math.min(pages, bookToEdit.current_page) : (status === "read" ? pages : 0)
    };

    if (bookToEdit) {
      onEditBook(bookToEdit.id, finalBook, coverFile, pdfFile);
    } else {
      onAddBook(finalBook, coverFile, pdfFile);
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
    onClose();
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
        </form>
      </div>
    </div>
  );
}
