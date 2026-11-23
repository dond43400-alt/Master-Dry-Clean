import React, { useState, useRef, useEffect } from 'react';
import {
  Sparkles,
  Send,
  User,
  Bot,
  Copy,
  Check,
  RefreshCw,
  X,
  Mic,
  MicOff,
  ShoppingBag,
  HelpCircle,
  AlertTriangle,
} from 'lucide-react';
import { ShopSettings, Order } from '../types';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
}

interface AiAssistantProps {
  settings: ShopSettings;
  activeOrders: Order[];
  initialPrompt?: string;
  isOpenAsDrawer?: boolean;
  onCloseDrawer?: () => void;
  onAutoFillBill?: (billData: any) => void;
}

export const AiAssistant: React.FC<AiAssistantProps> = ({
  settings,
  activeOrders,
  initialPrompt,
  isOpenAsDrawer,
  onCloseDrawer,
  onAutoFillBill,
}) => {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'welcome',
      role: 'assistant',
      content: `Sat Sri Akal / Namaste ji! Main **Master Dry Clean** ka smart automated AI Assistant hoon (ਮਾਸਟਰ ਡਰਾਈ ਕਲੀਨ ਸਮਾਰਟ ਅਸਿਸਟੈਂਟ).

Main aapki in sabhi cheezon me madad kar sakta hoon:
1. 🧾 **Itemized Bill Calculation**: Coat Pant 3 Piece (₹400), Coat Pant 2 Piece (₹300), Quilt / Rajai (₹500), Coat Blazer (₹250), Ladies Suit Full (₹300), Suit Press (₹20-₹60), Shoes & Curtains ke sath bill banana.
2. 📄 **PDF & JPG Export**: Bill ko PDF ya JPG format me save karna.
3. 💬 **WhatsApp Reminders**: Day 1 Booking, Day 7 Ready, aur Day 13 Urgent Warning messages.
4. 🧼 **Stain Removal Guide**: Oil, grease, ink, haldi, tea, coffee, ya blood stains ke professional chemical steps.

Aap mujhse koi bhi sawal pooch sakte hain ya customer ka bill banwa sakte hain!`,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    },
  ]);

  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [isListening, setIsListening] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Quick suggestion chips
  const quickPrompts = [
    'Coat Pant 3 Piece & Rajai ka rate kya hai?',
    'MDC-1084: 1 Coat Blazer, 1 Rajai, 1 Ladies Suit Full ka bill banao',
    'Ink aur haldi ka daag kaise saaf karein?',
    'Day 13 ka 15-day urgent WhatsApp alert message likhein',
    'Bill ko PDF aur JPG me save kaise karein?',
    'Oil & grease ke liye Perchloroethylene (Perc) kaise use karein?',
  ];

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Handle external initial prompt if provided
  useEffect(() => {
    if (initialPrompt && initialPrompt.trim()) {
      handleSendMessage(initialPrompt);
    }
  }, [initialPrompt]);

  const handleSendMessage = async (textToSend?: string) => {
    const query = textToSend || input;
    if (!query.trim() || loading) return;

    const userMsg: Message = {
      id: 'msg_' + Date.now(),
      role: 'user',
      content: query.trim(),
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    try {
      const chatHistory = [...messages, userMsg].map((m) => ({
        role: m.role === 'user' ? 'user' : 'assistant',
        content: m.content,
      }));

      const res = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: chatHistory,
          currentContext: {
            shopName: settings.shopNamePa,
            upiId: settings.upiId,
            ordersCount: activeOrders.length,
          },
        }),
      });

      if (!res.ok) {
        throw new Error('AI ਸੇਵਾ ਨਾਲ ਸੰਪਰਕ ਨਹੀਂ ਹੋ ਸਕਿਆ');
      }

      const data = await res.json();
      const aiReply = data.text || 'ਮਾਫ਼ ਕਰਨਾ, ਕੋਈ ਜਵਾਬ ਪ੍ਰਾਪਤ ਨਹੀਂ ਹੋਇਆ।';

      setMessages((prev) => [
        ...prev,
        {
          id: 'ai_' + Date.now(),
          role: 'assistant',
          content: aiReply,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        },
      ]);
    } catch (err: any) {
      console.error(err);
      setMessages((prev) => [
        ...prev,
        {
          id: 'err_' + Date.now(),
          role: 'assistant',
          content: `ਖਿਮਾ ਕਰਨਾ, ਸਰਵਰ ਜੁਆਬ ਦੇਣ ਵਿੱਚ ਅਸਮਰੱਥ ਹੈ: ${err.message || 'Error'}`,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Voice speech recognition (Web Speech API)
  const toggleSpeechRecognition = () => {
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      alert('ਤੁਹਾਡੇ ਬ੍ਰਾਊਜ਼ਰ ਵਿੱਚ ਵੌਇਸ ਰਿਕੋਗਨੀਸ਼ਨ ਸੁਵਿਧਾ ਉਪਲਬਧ ਨਹੀਂ ਹੈ।');
      return;
    }

    if (isListening) {
      setIsListening(false);
      return;
    }

    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    recognition.lang = 'pa-IN'; // Punjabi
    recognition.continuous = false;
    recognition.interimResults = false;

    recognition.onstart = () => {
      setIsListening(true);
    };

    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript;
      setInput((prev) => (prev ? `${prev} ${transcript}` : transcript));
      setIsListening(false);
    };

    recognition.onerror = () => {
      setIsListening(false);
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    recognition.start();
  };

  return (
    <div
      className={`flex flex-col bg-white rounded-2xl border border-slate-200 shadow-lg overflow-hidden ${
        isOpenAsDrawer ? 'h-full' : 'h-[750px] max-h-[85vh]'
      }`}
    >
      {/* Header */}
      <div className="flex items-center justify-between p-4 bg-gradient-to-r from-indigo-700 via-indigo-800 to-slate-900 text-white shadow-xs">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-xl bg-white/10 backdrop-blur-md flex items-center justify-center text-sky-300 border border-white/20">
            <Sparkles className="w-5 h-5 animate-pulse" />
          </div>
          <div>
            <h3 className="font-extrabold text-sm sm:text-base flex items-center space-x-1.5">
              <span>Master Dry Clean AI ਅਸਿਸਟੈਂਟ</span>
            </h3>
            <p className="text-[11px] text-indigo-200">
              ਬਿੱਲਿੰਗ, WhatsApp ਸੁਨੇਹੇ ਅਤੇ ਦਾਗ਼ ਰਿਮੂਵਲ ਸਹਾਇਕ
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={() =>
              setMessages([
                {
                  id: 'welcome_reset',
                  role: 'assistant',
                  content: 'ਗੱਲਬਾਤ ਨਵੀਂ ਸ਼ੁਰੂ ਕੀਤੀ ਗਈ ਹੈ। ਮੈਂ ਤੁਹਾਡੀ ਕੀ ਮਦਦ ਕਰ ਸਕਦਾ ਹਾਂ?',
                  timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                },
              ])
            }
            className="p-1.5 rounded-lg text-indigo-200 hover:text-white hover:bg-white/10 text-xs transition-colors"
            title="ਗੱਲਬਾਤ ਰੀਸੈੱਟ ਕਰੋ"
          >
            <RefreshCw className="w-4 h-4" />
          </button>

          {isOpenAsDrawer && onCloseDrawer && (
            <button
              onClick={onCloseDrawer}
              className="p-1.5 rounded-lg text-indigo-200 hover:text-white hover:bg-white/10 text-xs transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>
      </div>

      {/* Messages Scroll Area */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4 bg-slate-50/50">
        {messages.map((m) => {
          const isUser = m.role === 'user';
          return (
            <div
              key={m.id}
              className={`flex items-start gap-3 ${isUser ? 'flex-row-reverse' : 'flex-row'}`}
            >
              {/* Avatar */}
              <div
                className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${
                  isUser
                    ? 'bg-slate-800 text-white'
                    : 'bg-gradient-to-tr from-sky-500 to-indigo-600 text-white shadow-sm'
                }`}
              >
                {isUser ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
              </div>

              {/* Message Bubble */}
              <div
                className={`max-w-[85%] sm:max-w-[75%] rounded-2xl p-3.5 text-xs sm:text-sm shadow-xs space-y-1 relative group ${
                  isUser
                    ? 'bg-indigo-600 text-white rounded-tr-xs'
                    : 'bg-white border border-slate-200 text-slate-800 rounded-tl-xs'
                }`}
              >
                <div className="whitespace-pre-wrap leading-relaxed">{m.content}</div>

                <div
                  className={`flex items-center justify-between pt-1 border-t ${
                    isUser ? 'border-white/10 text-indigo-200' : 'border-slate-100 text-slate-400'
                  } text-[10px] font-mono`}
                >
                  <span>{m.timestamp}</span>

                  {!isUser && (
                    <button
                      onClick={() => handleCopy(m.id, m.content)}
                      className="opacity-70 hover:opacity-100 p-0.5 rounded-md flex items-center space-x-1"
                      title="ਕਾਪੀ ਕਰੋ"
                    >
                      {copiedId === m.id ? (
                        <Check className="w-3.5 h-3.5 text-emerald-600" />
                      ) : (
                        <Copy className="w-3.5 h-3.5" />
                      )}
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}

        {loading && (
          <div className="flex items-center space-x-2 text-xs text-slate-500 bg-white p-3 rounded-2xl border border-slate-200 w-fit">
            <RefreshCw className="w-4 h-4 animate-spin text-indigo-600" />
            <span>Master Dry Clean AI ਸੋਚ ਰਿਹਾ ਹੈ...</span>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Quick Prompt Chips */}
      <div className="p-2 sm:px-4 bg-white border-t border-slate-100 overflow-x-auto no-scrollbar">
        <div className="flex items-center space-x-1.5 whitespace-nowrap">
          {quickPrompts.map((prompt, i) => (
            <button
              key={i}
              type="button"
              onClick={() => handleSendMessage(prompt)}
              className="text-[11px] px-2.5 py-1 rounded-full bg-slate-100 hover:bg-indigo-50 hover:text-indigo-700 text-slate-700 border border-slate-200 transition-colors shrink-0"
            >
              {prompt}
            </button>
          ))}
        </div>
      </div>

      {/* Input Area */}
      <div className="p-3 sm:p-4 bg-white border-t border-slate-200">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSendMessage();
          }}
          className="flex items-center space-x-2"
        >
          <button
            type="button"
            onClick={toggleSpeechRecognition}
            className={`p-2.5 rounded-xl border transition-colors ${
              isListening
                ? 'bg-rose-500 text-white border-rose-600 animate-pulse'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200 border-slate-200'
            }`}
            title={isListening ? 'ਬੋਲਣਾ ਬੰਦ ਕਰੋ' : 'ਪੰਜਾਬੀ ਵਿੱਚ ਬੋਲੋ (Mic)'}
          >
            {isListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
          </button>

          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={
              isListening ? 'ਸੁਣ ਰਿਹਾ ਹੈ... ਬੋਲੋ...' : 'ਕੋਈ ਵੀ ਸਵਾਲ ਪੁੱਛੋ ਜਾਂ ਬਿੱਲ ਬਣਵਾਓ...'
            }
            className="flex-1 px-4 py-2.5 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-indigo-500 focus:ring-1 focus:ring-indigo-200 transition-all"
          />

          <button
            type="submit"
            disabled={loading || !input.trim()}
            className="p-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-xl shadow-md shadow-indigo-600/20 transition-all shrink-0 cursor-pointer"
          >
            <Send className="w-4 h-4" />
          </button>
        </form>
      </div>
    </div>
  );
};
