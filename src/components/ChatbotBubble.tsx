import React, { useState, useRef, useEffect } from 'react';
import { MessageSquare, X, Send, Bot, User, CornerDownLeft, Sparkles } from 'lucide-react';
import { ChatMessage, Language } from '../types';
import { i18n } from '../lib/i18n';

interface ChatbotBubbleProps {
  userId: string;
  language: Language;
}

export default function ChatbotBubble({ userId, language }: ChatbotBubbleProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [selectedLanguage, setSelectedLanguage] = useState<Language>(language);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const t = i18n[selectedLanguage];

  // Auto scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isOpen]);

  // Welcome message when opened first time or when selectedLanguage changes
  useEffect(() => {
    if (isOpen) {
      const welcomeTexts = {
        en: "Asalam-o-Alaikum! I am EcoTrack, your smart waste management assistant for Hyderabad. Ask me anything about waste sorting, local pickups, composting, or how to dispose of specific items!",
        ur: "السلام علیکم! میں ہوں ایکو ٹریک، حیدرآباد کے لیے آپ کا اسمارٹ ویسٹ مینجمنٹ اسسٹنٹ۔ مجھ سے کچرا الگ کرنے، مقامی شیڈول، کھاد بنانے یا کسی بھی چیز کو ٹھکانے لگانے کے بارے میں پوچھیں!",
        sd: "اسلام عليڪم! مان آهيان ايڪو ٽريڪ، حيدرآباد لاءِ اوهان جو اسمارٽ ويسٽ مئنيجمينٽ اسسٽنٽ. مون کان ڪچري کي الڳ ڪرڻ، مقامي شيڊول، ڀاڻ ٺاهڻ يا ڪنهن به شيءِ کي ضايع ڪرڻ بابت پڇو!"
      };
      
      // Replace welcome message if it's the only message in the array
      if (messages.length === 0 || (messages.length === 1 && messages[0].messageId === 'welcome')) {
        setMessages([
          {
            messageId: 'welcome',
            userId,
            role: 'assistant',
            text: welcomeTexts[selectedLanguage] || welcomeTexts['en'],
            createdAt: new Date()
          }
        ]);
      }
    }
  }, [isOpen, selectedLanguage, userId]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || loading) return;

    const userMessageText = input;
    setInput('');
    setLoading(true);

    const newUserMessage: ChatMessage = {
      messageId: `msg-${Date.now()}-user`,
      userId,
      role: 'user',
      text: userMessageText,
      createdAt: new Date()
    };

    setMessages(prev => [...prev, newUserMessage]);

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: messages.slice(-6), // Send last 6 messages for context
          currentMessage: userMessageText,
          language: selectedLanguage
        })
      });

      if (!response.ok) {
        throw new Error('Failed to start chat stream.');
      }

      // Prepare reader to stream the response chunks
      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error('ReadableStream reader is not available.');
      }

      const decoder = new TextDecoder('utf-8');
      let done = false;
      let assistantReplyText = '';

      // Add empty assistant response placeholder
      const assistantMessageId = `msg-${Date.now()}-assistant`;
      const placeholderMessage: ChatMessage = {
        messageId: assistantMessageId,
        userId,
        role: 'assistant',
        text: '', // Start empty for streaming
        createdAt: new Date()
      };

      setMessages(prev => [...prev, placeholderMessage]);
      setLoading(false); // Stop loading spinner since streaming is active

      let buffer = '';

      while (!done) {
        const { value, done: readerDone } = await reader.read();
        done = readerDone;
        if (value) {
          buffer += decoder.decode(value, { stream: !done });
          const lines = buffer.split('\n');
          // Keep the last incomplete line in buffer
          buffer = lines.pop() || '';

          for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed || !trimmed.startsWith('data: ')) continue;

            const dataStr = trimmed.slice(6);
            if (dataStr === '[DONE]') {
              done = true;
              break;
            }

            try {
              const parsed = JSON.parse(dataStr);
              if (parsed.error) {
                // If we get an error from the server, display it
                assistantReplyText = parsed.error;
                setMessages(prev => prev.map(msg => 
                  msg.messageId === assistantMessageId 
                    ? { ...msg, text: assistantReplyText } 
                    : msg
                ));
                break;
              } else if (parsed.text) {
                assistantReplyText += parsed.text;
                // Update message text with current stream state
                setMessages(prev => prev.map(msg => 
                  msg.messageId === assistantMessageId 
                    ? { ...msg, text: assistantReplyText } 
                    : msg
                ));
              }
            } catch (jsonErr) {
              console.error('Failed to parse SSE line:', dataStr, jsonErr);
            }
          }
        }
      }

    } catch (error) {
      console.error('Chat error:', error);
      // Fallback message requested specifically by the user
      const errorText = "I'm having trouble reaching the AI service right now — please try again in a moment.";
      setMessages(prev => {
        const last = prev[prev.length - 1];
        if (last && last.role === 'assistant' && last.text === '') {
          return prev.map((msg, idx) => idx === prev.length - 1 ? { ...msg, text: errorText } : msg);
        } else if (last && last.role === 'assistant') {
          // If the last message is already from the assistant and has some content (like a quota error or partial response), leave it as is
          return prev;
        } else {
          return [
            ...prev,
            {
              messageId: `msg-${Date.now()}-error`,
              userId,
              role: 'assistant',
              text: errorText,
              createdAt: new Date()
            }
          ];
        }
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed bottom-[76px] right-4 md:right-6 z-30 font-sans">
      {/* Chat window */}
      {isOpen && (
        <div className="bg-white rounded-[24px] shadow-2xl border border-stone-150 w-80 sm:w-96 h-[480px] flex flex-col mb-4 transition-all duration-300 transform scale-100 origin-bottom-right overflow-hidden">
          {/* Header */}
          <div className="bg-gradient-to-r from-natural-dark to-natural-medium text-white p-4 flex items-center justify-between shadow">
            <div className="flex items-center gap-2.5">
              <div className="bg-white/10 p-1.5 rounded-lg border border-white/10">
                <Bot size={20} className="text-natural-light" />
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <span className="font-bold text-sm tracking-tight text-white">EcoTrack Smart Waste Management</span>
                  <span className="w-1.5 h-1.5 bg-natural-light rounded-full animate-ping" />
                </div>
                <span className="text-[10px] text-natural-pale font-medium">Grok AI Active</span>
              </div>
            </div>
            <button 
              onClick={() => setIsOpen(false)}
              className="p-1 text-natural-light hover:text-white rounded-lg transition"
            >
              <X size={18} />
            </button>
          </div>

          {/* Language Selector Sub-Bar */}
          <div className="bg-stone-100 dark:bg-slate-900 border-b border-stone-200 dark:border-slate-800 px-4 py-2 flex items-center justify-between text-xs text-stone-600 dark:text-slate-300 shrink-0">
            <span className="font-semibold">{selectedLanguage === 'ur' ? 'گفتگو کی زبان:' : selectedLanguage === 'sd' ? 'ڳالهه ٻولهه جي ٻولي:' : 'Chat Language:'}</span>
            <div className="flex gap-1">
              <button 
                type="button"
                onClick={() => setSelectedLanguage('en')}
                className={`px-2 py-0.5 rounded text-[10px] font-black transition-all cursor-pointer ${selectedLanguage === 'en' ? 'bg-natural-dark text-white shadow-sm' : 'hover:bg-stone-200 dark:hover:bg-slate-800'}`}
              >
                EN
              </button>
              <button 
                type="button"
                onClick={() => setSelectedLanguage('ur')}
                className={`px-2 py-0.5 rounded text-[10px] font-black transition-all cursor-pointer ${selectedLanguage === 'ur' ? 'bg-natural-dark text-white shadow-sm' : 'hover:bg-stone-200 dark:hover:bg-slate-800'}`}
              >
                اردو
              </button>
              <button 
                type="button"
                onClick={() => setSelectedLanguage('sd')}
                className={`px-2 py-0.5 rounded text-[10px] font-black transition-all cursor-pointer ${selectedLanguage === 'sd' ? 'bg-natural-dark text-white shadow-sm' : 'hover:bg-stone-200 dark:hover:bg-slate-800'}`}
              >
                سنڌي
              </button>
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 p-4 overflow-y-auto space-y-3 bg-stone-50/50">
            {messages.map((msg) => (
              <div 
                key={msg.messageId}
                className={`flex gap-2 max-w-[85%] ${msg.role === 'user' ? 'ml-auto flex-row-reverse' : 'mr-auto'}`}
              >
                <div className={`p-1.5 rounded-full h-7 w-7 flex items-center justify-center text-xs shrink-0 ${
                  msg.role === 'user' ? 'bg-natural-pale text-natural-dark' : 'bg-stone-200 text-stone-700'
                }`}>
                  {msg.role === 'user' ? <User size={14} /> : <Bot size={14} />}
                </div>

                <div className={`p-3 rounded-2xl text-xs sm:text-sm leading-relaxed shadow-sm ${
                  msg.role === 'user' 
                    ? 'bg-natural-medium text-white rounded-tr-none' 
                    : 'bg-white text-stone-800 border border-stone-100 rounded-tl-none'
                }`}>
                  {msg.text ? msg.text.replace(/\*\*/g, '') : ''}
                </div>
              </div>
            ))}
            
            {loading && (
              <div className="flex gap-2 mr-auto max-w-[85%]">
                <div className="p-1.5 rounded-full h-7 w-7 bg-stone-200 text-stone-700 flex items-center justify-center text-xs shrink-0">
                  <Bot size={14} />
                </div>
                <div className="p-3 bg-white text-stone-400 border border-stone-100 rounded-2xl rounded-tl-none text-xs flex items-center gap-1.5 shadow-sm">
                  <span className="flex gap-1">
                    <span className="w-1.5 h-1.5 bg-stone-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                    <span className="w-1.5 h-1.5 bg-stone-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                    <span className="w-1.5 h-1.5 bg-stone-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                  </span>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Footer Input */}
          <form onSubmit={handleSend} className="p-3 border-t border-stone-100 bg-white flex gap-2">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={language === 'ur' ? 'ایکو ٹریک سے کچھ پوچھیں...' : language === 'sd' ? 'ايڪو ٽريڪ کان پڇو...' : 'Ask EcoTrack (e.g. Can I recycle cardboard?)...'}
              className="flex-1 bg-stone-50 text-xs sm:text-sm rounded-xl px-4 py-2.5 outline-none border border-transparent focus:border-natural-medium/30 focus:bg-white transition"
            />
            <button
              type="submit"
              disabled={!input.trim() || loading}
              className="p-2.5 bg-natural-dark hover:bg-natural-medium disabled:opacity-40 text-white rounded-xl transition cursor-pointer shrink-0"
            >
              <Send size={16} />
            </button>
          </form>
        </div>
      )}

      {/* Trigger Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="h-14 w-14 bg-gradient-to-r from-natural-dark to-natural-medium text-white rounded-full flex items-center justify-center shadow-xl hover:shadow-natural-medium/20 hover:scale-105 active:scale-95 transition-all cursor-pointer border border-natural-light/20"
      >
        {isOpen ? <X size={24} /> : (
          <div className="relative">
            <MessageSquare size={24} />
            <span className="absolute -top-1 -right-1 flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-natural-light opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-natural-pale"></span>
            </span>
          </div>
        )}
      </button>
    </div>
  );
}
