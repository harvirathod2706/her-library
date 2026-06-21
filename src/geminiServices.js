/**
 * Gemini AI Integration Services
 * Using gemini-2.5-flash model via direct REST endpoints.
 */

/**
 * Fetches structured book metadata (author, tags, description, page count) using Gemini.
 * Falls back to throwing an error if the API is unconfigured or fails.
 * 
 * @param {string} title - The book title
 * @param {string} [author] - Optional author name to refine search
 * @returns {Promise<{author: string, tags: string, description: string, pages: number}>}
 */
export async function generateBookDetails(title, author = '') {
  const apiKey = import.meta.env.VITE_GEMINI_API;
  if (!apiKey) {
    throw new Error('Gemini API key is not configured in your .env file (VITE_GEMINI_API).');
  }

  // 1. Fetch real-world metadata from Open Library first for maximum accuracy
  let olData = null;
  try {
    const query = author ? `${title} ${author}` : title;
    const olUrl = `https://openlibrary.org/search.json?q=${encodeURIComponent(query)}&limit=1`;
    const olRes = await fetch(olUrl);
    if (olRes.ok) {
      const olJson = await olRes.json();
      const doc = olJson.docs?.[0];
      if (doc) {
        olData = {
          author: doc.author_name?.[0] || '',
          pages: doc.number_of_pages_median || doc.number_of_pages || null,
          coverUrl: doc.cover_i ? `https://covers.openlibrary.org/b/id/${doc.cover_i}-L.jpg` : null,
          subjects: doc.subject?.slice(0, 5) || []
        };
      }
    }
  } catch (olErr) {
    console.warn('Open Library search failed:', olErr);
  }

  // 2. Instruct Gemini to synthesize the metadata and formulate tags and summaries
  const prompt = `You are an expert book cataloger. Provide accurate metadata for the book titled "${title}"${author ? ` written by "${author}"` : ''}.
${olData ? `Here is reference data found in the library database:
- Author: ${olData.author}
- Pages: ${olData.pages}
- Subjects: ${olData.subjects.join(', ')}` : ''}

Return a strict JSON object with EXACTLY the following fields:
{
  "author": "${olData?.author || ''}",
  "tags": "A comma-separated string of 3-4 genre tags (e.g. 'Thriller, Mystery, Suspense')",
  "description": "An engaging, beautiful, brief 2-3 sentence summary of the book",
  "pages": ${olData?.pages || 350},
  "coverUrl": "${olData?.coverUrl || ''}"
}
If the author is empty in the reference data, fill it in accurately using your knowledge. Make sure 'pages' is a number, not a string. Return ONLY the JSON object. Do not wrap the JSON output in markdown formatting (like \`\`\`json or \`\`\`).`;

  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash:generateContent?key=${apiKey}`;

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      contents: [
        {
          parts: [{ text: prompt }]
        }
      ],
      generationConfig: {
        responseMimeType: 'application/json',
        temperature: 0.2
      }
    }),
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Gemini API error: ${response.status} - ${errText}`);
  }

  const data = await response.json();
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) {
    throw new Error('No content returned from Gemini.');
  }

  try {
    const cleanText = text.trim().replace(/^```json\s*/i, '').replace(/```$/, '').trim();
    const result = JSON.parse(cleanText);

    // Fallbacks if Gemini omitted them or customized them incorrectly
    if (!result.pages && olData?.pages) result.pages = olData.pages;
    if (!result.coverUrl && olData?.coverUrl) result.coverUrl = olData.coverUrl;
    if (!result.author && olData?.author) result.author = olData.author;

    return result;
  } catch (err) {
    console.error('Failed to parse Gemini JSON response:', text, err);
    throw new Error('Failed to parse book details from AI response.');
  }
}

/**
 * Chat dialogue helper with Gemini. Injects user library context to give personalized replies.
 * 
 * @param {string} message - Current user message
 * @param {Array<{sender: 'user'|'bot', text: string}>} chatHistory - Previous messages
 * @param {Array<object>} libraryBooks - The books currently in the user's library
 * @returns {Promise<string>} - Bot response text
 */
export async function chatWithLibrarian(message, chatHistory, libraryBooks) {
  const apiKey = import.meta.env.VITE_GEMINI_API;
  if (!apiKey) {
    throw new Error('Gemini API key is not configured in your .env file (VITE_GEMINI_API).');
  }

  // Optimize context size by only listing title, author, and primary tags
  const booksContext = libraryBooks && libraryBooks.length > 0
    ? libraryBooks.map((b) => `- "${b.title}" by ${b.author} (${b.tags?.slice(0, 2).join(', ') || 'N/A'})`).join('\n')
    : 'None yet (empty library)';

  const systemInstruction = `You are "Librarian AI Assistant" (Librarian Sparkles ✨), a warm, charming, and highly knowledgeable personal book assistant. 
You are chatting with a passionate reader about books. Use emojis, speak in an elegant, thoughtful, and encouraging tone, and structure responses beautifully with bold text, line breaks, and lists.

Here is the reader's current library list for context:
${booksContext}

Use this library list to make customized suggestions (e.g. recommending she reads books she hasn't started, or suggesting new books based on what she has already). If she asks about series order, book summaries, or general recommendations, use your vast literary knowledge to reply. 
Be highly accurate and avoid hallucinating details. Provide beautifully detailed, elaborate, and comprehensive answers. Do not summarize too briefly; give deep, rich descriptions, explanations, and insights for recommendations or queries to make the conversation highly engaging and thorough.`;

  const contents = [];

  if (chatHistory && chatHistory.length > 0) {
    // Keep only the last 8 messages of history to minimize input token usage
    const recentHistory = chatHistory.slice(-8);
    for (const chat of recentHistory) {
      contents.push({
        role: chat.sender === 'user' ? 'user' : 'model',
        parts: [{ text: chat.text }]
      });
    }
  }

  contents.push({
    role: 'user',
    parts: [{ text: message }]
  });

  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash:generateContent?key=${apiKey}`;

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      contents,
      systemInstruction: {
        parts: [{ text: systemInstruction }]
      },
      generationConfig: {
        temperature: 0.3,
        maxOutputTokens: 1500,
      }
    }),
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Gemini API error: ${response.status} - ${errText}`);
  }

  const data = await response.json();
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) {
    throw new Error('No content returned from Gemini.');
  }

  return text;
}
