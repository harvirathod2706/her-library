import React, { useState, useEffect, useRef } from 'react';
import { MessageSquare, Send, X, Sparkles, Bot, User, Loader2 } from 'lucide-react';
import { chatWithLibrarian } from '../geminiServices';

export default function ChatbotWidget({ books }) {
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState([
    {
      id: 'welcome',
      sender: 'bot',
      text: "Hello! I am **Sparkles** ✨, your personal AI librarian. Ask me anything about books! \n\nI can recommend something to read from your shelf, suggest new books, find read orders for series, or summarize stories. What are we exploring today?",
      timestamp: new Date()
    }
  ]);
  const [isLoading, setIsLoading] = useState(false);
  
  const messagesEndRef = useRef(null);

  // Auto-scroll to bottom of chat
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isLoading]);

  const handleSend = async (textToSend) => {
    const query = (textToSend || input).trim();
    if (!query) return;

    if (!textToSend) {
      setInput('');
    }

    // Add user message
    const userMsg = {
      id: `user-${Date.now()}`,
      sender: 'user',
      text: query,
      timestamp: new Date()
    };
    setMessages(prev => [...prev, userMsg]);
    setIsLoading(true);

    try {
      // Call Gemini Chat Service
      const botResponse = await chatWithLibrarian(query, messages, books);
      
      setMessages(prev => [
        ...prev,
        {
          id: `bot-${Date.now()}`,
          sender: 'bot',
          text: botResponse,
          timestamp: new Date()
        }
      ]);
    } catch (err) {
      console.error("Chat error:", err);
      let errorText = "Oh dear! I had trouble connecting to my library records. 📚⚡";
      if (err.message && err.message.includes('API key')) {
        errorText = "I couldn't access my AI powers! Please make sure to add your **VITE_GEMINI_API** key in the `.env` file and restart the development server. 🔑✨";
      }
      setMessages(prev => [
        ...prev,
        {
          id: `bot-err-${Date.now()}`,
          sender: 'bot',
          text: errorText,
          timestamp: new Date()
        }
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleChipClick = (suggestion) => {
    handleSend(suggestion);
  };

  // Convert markdown-like syntax (**bold**, *italic*, newlines) into HTML elements safely
  const formatMessageText = (text) => {
    if (!text) return '';
    
    // Split by lines to preserve breaks
    return text.split('\n').map((line, i) => {
      // Match bold text (**text**)
      let formattedLine = line;
      const boldRegex = /\*\*(.*?)\*\*/g;
      
      const parts = [];
      let lastIndex = 0;
      let match;
      
      while ((match = boldRegex.exec(line)) !== null) {
        // Add normal text before match
        if (match.index > lastIndex) {
          parts.push(line.substring(lastIndex, match.index));
        }
        // Add bold text
        parts.push(<strong key={match.index} className="text-[#d4a853] font-semibold">{match[1]}</strong>);
        lastIndex = boldRegex.lastIndex;
      }
      
      if (lastIndex < line.length) {
        parts.push(line.substring(lastIndex));
      }

      // Fallback if no bold matches
      const content = parts.length > 0 ? parts : line;

      // Handle simple list items starting with '-' or '*'
      if (line.trim().startsWith('- ') || line.trim().startsWith('* ')) {
        const listContent = typeof content === 'string' 
          ? content.replace(/^[-*]\s+/, '') 
          : React.Children.toArray(content).map((c, idx) => {
              if (typeof c === 'string' && idx === 0) {
                return c.replace(/^[-*]\s+/, '');
              }
              return c;
            });
            
        return (
          <li key={i} className="list-disc list-inside ml-2 my-1 text-[#e8dcc8]/95 leading-relaxed text-sm">
            {listContent}
          </li>
        );
      }

      return (
        <p key={i} className="my-1 text-[#e8dcc8]/95 leading-relaxed text-sm">
          {content}
        </p>
      );
    });
  };

  const suggestionChips = [
    "📚 Suggest a book from my library shelf",
    "💖 Recommend 3 must-read romance books",
    "📖 What's the correct read order for ACOTAR series?",
    "🔮 Recommend books similar to 'Verity'"
  ];

  return (
    <div className="fixed bottom-6 right-6 z-50 font-lora">
      {/* Expanded Chat Box */}
      {isOpen && (
        <div className="mb-4 w-[360px] md:w-[400px] h-[500px] max-h-[75vh] flex flex-col rounded-2xl border border-[#d4a853]/25 bg-black/80 backdrop-blur-lg shadow-2xl overflow-hidden transition-all duration-300 transform scale-100 origin-bottom-right">
          {/* Header */}
          <div className="bg-gradient-to-r from-[#1f0a1a] to-[#0d1117] border-b border-[#d4a853]/20 px-4 py-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-[#d4a853]/15 border border-[#d4a853]/30 flex items-center justify-center text-[#d4a853]">
                <Sparkles size={16} className="animate-pulse" />
              </div>
              <div>
                <h4 className="font-playfair text-sm font-semibold text-[#e8dcc8] flex items-center gap-1.5">
                  AI Librarian Sparkles ✨
                </h4>
                <p className="text-[10px] font-sans tracking-wide text-[#a89880]">Your literary guide</p>
              </div>
            </div>
            <button 
              onClick={() => setIsOpen(false)}
              className="text-[#a89880] hover:text-[#d4a853] p-1.5 rounded-full hover:bg-white/5 transition-colors cursor-pointer"
            >
              <X size={18} />
            </button>
          </div>

          {/* Messages Area */}
          <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-3 scrollbar-thin scrollbar-thumb-white/5">
            {messages.map((msg) => (
              <div 
                key={msg.id} 
                className={`flex gap-2 max-w-[85%] ${msg.sender === 'user' ? 'self-end flex-row-reverse' : 'self-start'}`}
              >
                <div className={`w-6 h-6 rounded-full shrink-0 flex items-center justify-center border text-xs
                  ${msg.sender === 'user' 
                    ? 'bg-[#c4869a]/10 border-[#c4869a]/35 text-[#c4869a]' 
                    : 'bg-[#d4a853]/10 border-[#d4a853]/35 text-[#d4a853]'}`}
                >
                  {msg.sender === 'user' ? <User size={12} /> : <Bot size={12} />}
                </div>
                <div className={`rounded-2xl px-3.5 py-2.5 text-xs font-sans shadow-sm
                  ${msg.sender === 'user' 
                    ? 'bg-gradient-to-br from-[#7c2d3a]/75 to-[#9a4b5b]/60 border border-[#c4869a]/20 text-[#e8dcc8]' 
                    : 'bg-white/[0.04] border border-[#d4a853]/15 text-[#e8dcc8]'}`}
                >
                  {formatMessageText(msg.text)}
                </div>
              </div>
            ))}

            {/* Loading Indicator */}
            {isLoading && (
              <div className="flex gap-2 self-start max-w-[85%]">
                <div className="w-6 h-6 rounded-full shrink-0 flex items-center justify-center border bg-[#d4a853]/10 border-[#d4a853]/35 text-[#d4a853]">
                  <Bot size={12} />
                </div>
                <div className="rounded-2xl px-3.5 py-2.5 text-xs bg-white/[0.04] border border-[#d4a853]/15 flex items-center gap-2">
                  <Loader2 size={12} className="animate-spin text-[#d4a853]" />
                  <span className="text-[#a89880] font-sans italic">Consulting the shelves...</span>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Suggestion Chips */}
          <div className="px-4 py-2 border-t border-white/[0.03] bg-black/20 flex gap-2 overflow-x-auto select-none no-scrollbar">
            {suggestionChips.map((chip, idx) => (
              <button
                key={idx}
                onClick={() => handleChipClick(chip)}
                disabled={isLoading}
                className="shrink-0 bg-white/[0.02] border border-white/10 hover:border-[#d4a853]/30 hover:bg-[#d4a853]/5 px-3 py-1.5 rounded-full text-[10px] font-sans text-[#a89880] hover:text-[#d4a853] transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {chip}
              </button>
            ))}
          </div>

          {/* Input Form */}
          <form 
            onSubmit={(e) => { e.preventDefault(); handleSend(); }}
            className="p-3 border-t border-[#d4a853]/15 bg-black/40 flex gap-2 items-center"
          >
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              disabled={isLoading}
              placeholder="Ask about book recommendation, series..."
              className="flex-1 bg-white/[0.04] border border-[#d4a853]/15 focus:border-[#d4a853]/40 rounded-xl px-4 py-2 text-[#e8dcc8] font-sans text-xs outline-none transition-colors disabled:opacity-50"
            />
            <button
              type="submit"
              disabled={isLoading || !input.trim()}
              className="w-8 h-8 rounded-xl bg-gradient-to-r from-[#7c2d3a] to-[#c4869a] flex items-center justify-center text-white transition-all active:scale-95 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed disabled:scale-100"
            >
              <Send size={14} />
            </button>
          </form>
        </div>
      )}

      {/* Floating Trigger Button */}
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="w-14 h-14 rounded-full bg-gradient-to-br from-[#7c2d3a] to-[#d4a853] text-white flex items-center justify-center shadow-lg hover:shadow-[#d4a853]/20 transition-all hover:scale-105 active:scale-95 cursor-pointer border border-[#d4a853]/30 relative group"
        title="Chat with AI Librarian"
      >
        {isOpen ? (
          <X size={24} className="transition-transform duration-300" />
        ) : (
          <div className="relative">
            <MessageSquare size={24} className="group-hover:rotate-6 transition-transform" />
            <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-[#c4869a] rounded-full border border-black animate-ping" />
            <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-[#c4869a] rounded-full border border-black" />
          </div>
        )}
      </button>
    </div>
  );
}
