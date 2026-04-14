import { useState, useRef, useEffect } from 'react';
import { GoogleGenAI } from '@google/genai';
import { Send, Loader2, User, Mic, MicOff, Volume2, VolumeX } from 'lucide-react';
import ReactMarkdown from 'react-markdown';

const ai = typeof GoogleGenerativeAI!=='undefined'?newGoogleGenerativeAI(import.meta.env.VITE_GEMINI_API_KEY||''):null;

interface Message {
  id: string;
  role: 'user' | 'model';
  text: string;
}

const LUMA_AVATAR = "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?q=80&w=150&auto=format&fit=crop";

export default function App() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'welcome',
      role: 'model',
      text: 'Hola. Soy Luma. Estoy aquí para escucharte y apoyarte. ¿Cómo te sientes hoy?'
    }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isVoiceEnabled, setIsVoiceEnabled] = useState(true);
  const [isRecording, setIsRecording] = useState(false);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<any>(null);
  
  const chatRef = useRef<any>(null);
   

  useEffect(() => {
    // Initializar el chat solo si ai existey no se ha creadoantes 
    if (ai&&!chatRef.current) {
      chatRef.current=ai.chats.create({
        model:"gemini-3-flash-preview",
        config:{
          systemInstruction: "Tu nombre es Luma. Eres una mujer sabia, cálida y comprensiva..."
        }
      });
    }
  }, [ai]);
      const recognition = new SpeechRecognition();
      recognition.lang = 'es-ES';
      recognition.continuous = false;
      recognition.interimResults = false;
      
      recognition.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        setInput(prev => prev + (prev ? ' ' : '') + transcript);
        setIsRecording(false);
      };
      
      recognition.onerror = (event: any) => {
        console.error("Speech recognition error", event.error);
        setIsRecording(false);
      };
      
      recognition.onend = () => {
        setIsRecording(false);
      };
      
      recognitionRef.current = recognition;
    }

    // Load voices for synthesis
    if (window.speechSynthesis) {
      window.speechSynthesis.onvoiceschanged = () => {
        window.speechSynthesis.getVoices();
      };
    }
  }, []);

  const toggleRecording = () => {
    if (isRecording) {
      recognitionRef.current?.stop();
      setIsRecording(false);
    } else {
      try {
        recognitionRef.current?.start();
        setIsRecording(true);
      } catch (e) {
        console.error("Microphone start error:", e);
        setIsRecording(false);
      }
    }
  };

  const speak = (text: string) => {
    if (!isVoiceEnabled || !window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    
    const cleanText = text.replace(/[*_#`]/g, ''); // Remove markdown for speech
    const utterance = new SpeechSynthesisUtterance(cleanText);
    utterance.lang = 'es-ES';
    utterance.rate = 0.95;
    utterance.pitch = 1.1;
    
    const voices = window.speechSynthesis.getVoices();
    const spanishVoices = voices.filter(v => v.lang.startsWith('es'));
    const femaleVoice = spanishVoices.find(v => 
      v.name.toLowerCase().includes('female') || 
      v.name.toLowerCase().includes('mujer') ||
      v.name.toLowerCase().includes('monica') ||
      v.name.toLowerCase().includes('paulina') ||
      v.name.toLowerCase().includes('sabina')
    );
    
    if (femaleVoice) {
      utterance.voice = femaleVoice;
    } else if (spanishVoices.length > 0) {
      utterance.voice = spanishVoices[0];
    }

    window.speechSynthesis.speak(utterance);
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSend = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!input.trim() || isLoading) return;

    const userText = input.trim();
    setInput('');
    
    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      text: userText
    };
    
    setMessages(prev => [...prev, userMessage]);
    setIsLoading(true);

    try {
      const response = await chatRef.current.sendMessageStream({ message: userText });
      
      const modelMessageId = (Date.now() + 1).toString();
      setMessages(prev => [...prev, { id: modelMessageId, role: 'model', text: '' }]);

      let fullText = '';
      for await (const chunk of response) {
        if (chunk.text) {
          fullText += chunk.text;
          setMessages(prev => prev.map(msg => 
            msg.id === modelMessageId ? { ...msg, text: fullText } : msg
          ));
        }
      }
      speak(fullText);
    } catch (error) {
      console.error("Error sending message:", error);
      setMessages(prev => [...prev, { 
        id: Date.now().toString(), 
        role: 'model', 
        text: 'Lo siento, tuve un problema al procesar tu mensaje. ¿Podrías intentarlo de nuevo?' 
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-screen bg-slate-50 font-sans">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-slate-200 px-6 py-4 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-full overflow-hidden border-2 border-teal-100 shrink-0">
            <img src={LUMA_AVATAR} alt="Luma" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
          </div>
          <div>
            <h1 className="text-xl font-semibold text-slate-800">Luma</h1>
            <p className="text-sm text-slate-500">Tu guía emocional</p>
          </div>
        </div>
        <button 
          onClick={() => {
            setIsVoiceEnabled(!isVoiceEnabled);
            if (isVoiceEnabled) window.speechSynthesis?.cancel();
          }}
          className={`p-2.5 rounded-full transition-colors ${isVoiceEnabled ? 'bg-teal-100 text-teal-700 hover:bg-teal-200' : 'bg-slate-100 text-slate-400 hover:bg-slate-200'}`}
          title={isVoiceEnabled ? "Desactivar voz" : "Activar voz"}
        >
          {isVoiceEnabled ? <Volume2 size={20} /> : <VolumeX size={20} />}
        </button>
      </header>

      {/* Chat Area */}
      <main className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
        <div className="max-w-3xl mx-auto space-y-6">
          {messages.map((msg) => (
            <div 
              key={msg.id} 
              className={`flex gap-4 ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}
            >
              {msg.role === 'user' ? (
                <div className="shrink-0 w-10 h-10 rounded-full flex items-center justify-center bg-indigo-100 text-indigo-600">
                  <User size={20} />
                </div>
              ) : (
                <div className="shrink-0 w-10 h-10 rounded-full overflow-hidden border border-teal-100 shadow-sm">
                  <img src={LUMA_AVATAR} alt="Luma" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                </div>
              )}
              
              <div className={`max-w-[80%] rounded-2xl px-5 py-3.5 ${
                msg.role === 'user' 
                  ? 'bg-indigo-600 text-white rounded-tr-none' 
                  : 'bg-white text-slate-800 shadow-sm border border-slate-100 rounded-tl-none'
              }`}>
                <div className={`prose prose-sm max-w-none ${msg.role === 'user' ? 'prose-invert' : ''}`}>
                  <ReactMarkdown>{msg.text}</ReactMarkdown>
                </div>
              </div>
            </div>
          ))}
          {isLoading && (
            <div className="flex gap-4 flex-row">
              <div className="shrink-0 w-10 h-10 rounded-full overflow-hidden border border-teal-100 shadow-sm">
                <img src={LUMA_AVATAR} alt="Luma" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
              </div>
              <div className="bg-white shadow-sm border border-slate-100 rounded-2xl rounded-tl-none px-5 py-4 flex items-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin text-teal-600" />
                <span className="text-sm text-slate-500">Luma está escribiendo...</span>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>
      </main>

      {/* Input Area */}
      <footer className="bg-white border-t border-slate-200 p-4 shrink-0">
        <div className="max-w-3xl mx-auto">
          <form 
            onSubmit={handleSend}
            className="flex items-end gap-2 bg-slate-50 border border-slate-200 rounded-3xl p-2 focus-within:ring-2 focus-within:ring-teal-500/20 focus-within:border-teal-500 transition-all"
          >
            {recognitionRef.current && (
              <button
                type="button"
                onClick={toggleRecording}
                className={`shrink-0 p-3 rounded-full transition-colors flex items-center justify-center ${
                  isRecording ? 'bg-red-100 text-red-600 animate-pulse' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
                title={isRecording ? "Detener grabación" : "Hablar"}
              >
                {isRecording ? <MicOff size={20} /> : <Mic size={20} />}
              </button>
            )}
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSend();
                }
              }}
              placeholder={isRecording ? "Escuchando..." : "Escribe cómo te sientes..."}
              className="flex-1 max-h-32 min-h-[44px] bg-transparent border-none focus:outline-none resize-none py-2.5 px-2 text-slate-800 placeholder:text-slate-400"
              rows={1}
            />
            <button
              type="submit"
              disabled={!input.trim() || isLoading}
              className="shrink-0 bg-teal-600 hover:bg-teal-700 disabled:bg-slate-300 disabled:cursor-not-allowed text-white rounded-full p-3 transition-colors flex items-center justify-center"
            >
              <Send size={20} className="ml-0.5" />
            </button>
          </form>
          <p className="text-center text-xs text-slate-400 mt-3">
            Luma es una IA de apoyo emocional, no un profesional de la salud mental.
          </p>
        </div>
      </footer>
    </div>
  );
}
