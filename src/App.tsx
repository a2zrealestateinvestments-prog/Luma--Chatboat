import { useState, useRef, useEffect } from 'react';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { Send, Loader2, User, Mic, MicOff, Volume2, VolumeX } from 'lucide-react';
import ReactMarkdown from 'react-markdown';

// Configuración de la IA
const genAI = new GoogleGenerativeAI(import.meta.env.VITE_GEMINI_API_KEY || '');

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

  // Inicializar Chat
  useEffect(() => {
    if (!chatRef.current) {
      chatRef.current = genAI.getGenerativeModel({
        model: "gemini-1.5-flash", // Versión estable
        systemInstruction: "Tu nombre es Luma. Eres una mujer sabia, cálida y comprensiva..."
      }).startChat({
        history: [],
      });
    }
  }, []);

  // Configurar Reconocimiento de Voz
  useEffect(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
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
      
      recognition.onend = () => setIsRecording(false);
      recognitionRef.current = recognition;
    }

    if (window.speechSynthesis) {
      window.speechSynthesis.onvoiceschanged = () => {
        window.speechSynthesis.getVoices();
      };
    }
  }, []);

  const toggleRecording = () => {
    if (isRecording) {
      recognitionRef.current?.stop();
    } else {
      try {
        recognitionRef.current?.start();
        setIsRecording(true);
      } catch (e) {
        console.error("Microphone start error:", e);
      }
    }
  };

  const speak = (text: string) => {
    if (!isVoiceEnabled || !window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    const cleanText = text.replace(/[*_#`]/g, '');
    const utterance = new SpeechSynthesisUtterance(cleanText);
    utterance.lang = 'es-ES';
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
    const userMessage: Message = { id: Date.now().toString(), role: 'user', text: userText };
    setMessages(prev => [...prev, userMessage]);
    setIsLoading(true);

    try {
      const result = await chatRef.current.sendMessageStream(userText);
      const modelMessageId = (Date.now() + 1).toString();
      setMessages(prev => [...prev, { id: modelMessageId, role: 'model', text: '' }]);

      let fullText = '';
      for await (const chunk of result.stream) {
        const chunkText = chunk.text();
        fullText += chunkText;
        setMessages(prev => prev.map(msg => 
          msg.id === modelMessageId ? { ...msg, text: fullText } : msg
        ));
      }
      speak(fullText);
    } catch (error) {
      console.error("Error:", error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-screen bg-slate-50 font-sans">
      <header className="bg-white shadow-sm border-b border-slate-200 px-6 py-4 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-full overflow-hidden border-2 border-teal-100 shrink-0">
            <img src={LUMA_AVATAR} alt="Luma" className="w-full h-full object-cover" />
          </div>
          <div>
            <h1 className="text-xl font-semibold text-slate-800">Luma</h1>
            <p className="text-sm text-slate-500">Tu guía emocional</p>
          </div>
        </div>
        <button onClick={() => setIsVoiceEnabled(!isVoiceEnabled)} className="p-2.5 rounded-full bg-teal-100 text-teal-700">
          {isVoiceEnabled ? <Volume2 size={20} /> : <VolumeX size={20} />}
        </button>
      </header>

      <main className="flex-1 overflow-y-auto p-4 space-y-6">
        <div className="max-w-3xl mx-auto space-y-6">
          {messages.map((msg) => (
            <div key={msg.id} className={`flex gap-4 ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
              <div className={`max-w-[80%] rounded-2xl px-5 py-3.5 ${msg.role === 'user' ? 'bg-indigo-600 text-white' : 'bg-white border border-slate-100 shadow-sm'}`}>
                <ReactMarkdown>{msg.text}</ReactMarkdown>
              </div>
            </div>
          ))}
          {isLoading && <div className="text-sm text-slate-400">Luma está pensando...</div>}
          <div ref={messagesEndRef} />
        </div>
      </main>

      <footer className="bg-white border-t border-slate-200 p-4">
        <form onSubmit={handleSend} className="max-w-3xl mx-auto flex gap-2">
          <button type="button" onClick={toggleRecording} className={`p-3 rounded-full ${isRecording ? 'bg-red-100 text-red-600' : 'bg-slate-100'}`}>
            {isRecording ? <MicOff size={20} /> : <Mic size={20} />}
          </button>
          <textarea 
            value={input} 
            onChange={(e) => setInput(e.target.value)}
            className="flex-1 border border-slate-200 rounded-xl p-2"
            placeholder="Escribe aquí..."
          />
          <button type="submit" className="bg-teal-600 text-white p-3 rounded-full">
            <Send size={20} />
          </button>
        </form>
      </footer>
    </div>
  );
}
