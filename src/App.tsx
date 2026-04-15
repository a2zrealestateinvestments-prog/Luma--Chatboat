import { useState, useRef, useEffect } from 'react';
import { GoogleGenAI } from '@google/genai';
import { Send, Loader2, User, Mic, MicOff, Volume2, VolumeX, Settings, Key, X } from 'lucide-react';
import ReactMarkdown from 'react-markdown';

// Initialize the AI client conditionally based on whether an API key is available
const initializeAI = (apiKey: string | undefined) => {
  if (apiKey && apiKey !== 'MY_GEMINI_API_KEY') {
    return new GoogleGenAI({ apiKey });
  }
  return null;
};

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
  const [showSettings, setShowSettings] = useState(false);
  const [userApiKey, setUserApiKey] = useState('');
  const [isApiKeySet, setIsApiKeySet] = useState(false);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<any>(null);
  const chatRef = useRef<any>(null);

  // Check for saved API key on load
  useEffect(() => {
    const savedKey = localStorage.getItem('gemini_api_key');
    if (savedKey) {
      setUserApiKey(savedKey);
      setIsApiKeySet(true);
    }
  }, []);

  const handleSaveApiKey = () => {
    if (userApiKey.trim()) {
      localStorage.setItem('gemini_api_key', userApiKey.trim());
      setIsApiKeySet(true);
      setShowSettings(false);
      // Reset chat ref so it gets recreated with the new key
      chatRef.current = null;
    }
  };

  const handleClearApiKey = () => {
    localStorage.removeItem('gemini_api_key');
    setUserApiKey('');
    setIsApiKeySet(false);
    chatRef.current = null;
  };
  
  // Initialize chat when API key is available
  useEffect(() => {
    // @ts-ignore
    const activeApiKey = isApiKeySet ? userApiKey : (import.meta.env?.VITE_GEMINI_API_KEY || process.env?.GEMINI_API_KEY);
    
    if (!chatRef.current && activeApiKey && activeApiKey !== 'MY_GEMINI_API_KEY') {
      try {
        const ai = initializeAI(activeApiKey);
        if (ai) {
          chatRef.current = ai.chats.create({
            model: "gemini-3-flash-preview",
            config: {
              systemInstruction: "Tu nombre es Luma. Eres una mujer sabia, cálida y comprensiva en tus 50s. Eres un guía emocional empático. Tu objetivo es escuchar al usuario, validar sus emociones y ofrecerle apoyo y perspectivas constructivas. REGLA ESTRICTA: NUNCA hagas diagnósticos médicos, psiquiátricos o psicológicos. Si el usuario presenta síntomas clínicos, sugiérele amablemente consultar a un profesional de la salud. Nunca juzgues. Usa un tono suave, amigable y maternal en español. Mantén tus respuestas concisas pero significativas. Si el usuario menciona autolesiones o estar en peligro, recomiéndale buscar ayuda profesional inmediatamente de manera compasiva.",
            }
          });
        }
      } catch (e) {
        console.error("Error creating chat:", e);
      }
    }
  }, [isApiKeySet, userApiKey]);

  useEffect(() => {
    // Initialize Speech Recognition
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

    // @ts-ignore
    const activeApiKey = isApiKeySet ? userApiKey : (import.meta.env?.VITE_GEMINI_API_KEY || process.env?.GEMINI_API_KEY);
    
    if (!activeApiKey || activeApiKey === 'MY_GEMINI_API_KEY') {
      setShowSettings(true);
      return;
    }

    const userText = input.trim();
    setInput('');
    
    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      text: userText
    };
    
    setMessages(prev => [...prev, userMessage]);
    setIsLoading(true);

    if (!chatRef.current) {
      setMessages(prev => [...prev, { 
        id: Date.now().toString(), 
        role: 'model', 
        text: 'Lo siento, no pude inicializar el chat. Por favor, verifica tu clave API.' 
      }]);
      setIsLoading(false);
      return;
    }

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
    } catch (error: any) {
      console.error("Error sending message:", error);
      const errorMessage = error?.message || JSON.stringify(error) || 'Error desconocido';
      setMessages(prev => [...prev, { 
        id: Date.now().toString(), 
        role: 'model', 
        text: `Lo siento, tuve un problema al procesar tu mensaje. (Error: ${errorMessage}). ¿Podrías intentarlo de nuevo?` 
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-screen bg-[#F7F5F2] font-sans text-[#2D2D2D]">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-black/5 px-6 py-4 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-full overflow-hidden border-2 border-[#E2E7D6] shrink-0">
            <img src={LUMA_AVATAR} alt="Luma" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
          </div>
          <div>
            <h1 className="text-xl font-semibold text-[#8E9775]">Luma</h1>
            <p className="text-sm text-[#6B6B6B]">Tu guía emocional</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button 
            onClick={() => setShowSettings(true)}
            className="p-2.5 rounded-full transition-colors bg-slate-100 text-slate-400 hover:bg-slate-200"
            title="Configuración de API"
          >
            <Settings size={20} />
          </button>
          <button 
            onClick={() => {
              setIsVoiceEnabled(!isVoiceEnabled);
              if (isVoiceEnabled) window.speechSynthesis?.cancel();
            }}
            className={`p-2.5 rounded-full transition-colors ${isVoiceEnabled ? 'bg-[#E2E7D6] text-[#8E9775] hover:bg-[#d4dcc5]' : 'bg-slate-100 text-slate-400 hover:bg-slate-200'}`}
            title={isVoiceEnabled ? "Desactivar voz" : "Activar voz"}
          >
            {isVoiceEnabled ? <Volume2 size={20} /> : <VolumeX size={20} />}
          </button>
        </div>
      </header>

      {/* Settings Modal */}
      {showSettings && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden">
            <div className="flex items-center justify-between p-5 border-b border-gray-100">
              <h2 className="text-lg font-semibold text-[#2D2D2D] flex items-center gap-2">
                <Key className="w-5 h-5 text-[#8E9775]" />
                Configuración
              </h2>
              <button 
                onClick={() => setShowSettings(false)}
                className="p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-6">
              <p className="text-sm text-[#6B6B6B] mb-5">
                Para hablar con Luma, necesitas una clave API gratuita de Google Gemini. 
                Tus datos se guardan de forma segura <strong>solo en tu navegador</strong>.
              </p>
              
              <div className="space-y-4">
                <div>
                  <label htmlFor="apiKey" className="block text-sm font-medium text-[#2D2D2D] mb-1.5">
                    Clave API de Gemini
                  </label>
                  <input
                    type="password"
                    id="apiKey"
                    value={userApiKey}
                    onChange={(e) => setUserApiKey(e.target.value)}
                    placeholder="AIzaSy..."
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#8E9775] focus:border-[#8E9775] outline-none transition-all text-[#2D2D2D]"
                  />
                </div>
                
                <div className="flex gap-3 pt-2">
                  <button
                    onClick={handleSaveApiKey}
                    className="flex-1 bg-[#8E9775] hover:bg-[#7A8265] text-white font-medium py-2.5 px-4 rounded-xl transition-colors"
                  >
                    Guardar Clave
                  </button>
                  {isApiKeySet && (
                    <button
                      onClick={handleClearApiKey}
                      className="px-4 py-2.5 text-red-500 hover:bg-red-50 font-medium rounded-xl transition-colors border border-red-100"
                    >
                      Borrar
                    </button>
                  )}
                </div>
                
                <div className="mt-5 text-xs text-center">
                  <a 
                    href="https://aistudio.google.com/app/apikey" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-[#8E9775] hover:underline font-medium"
                  >
                    ¿No tienes una clave? Consíguela gratis aquí
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Chat Area */}
      <main className="flex-1 overflow-y-auto p-4 sm:p-8 space-y-6">
        <div className="max-w-3xl mx-auto space-y-6 pb-24">
          {messages.map((msg) => (
            <div 
              key={msg.id} 
              className={`flex gap-4 ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}
            >
              {msg.role === 'user' ? (
                <div className="shrink-0 w-10 h-10 rounded-full flex items-center justify-center bg-[#E2E7D6] text-[#8E9775]">
                  <User size={20} />
                </div>
              ) : (
                <div className="shrink-0 w-10 h-10 rounded-full overflow-hidden shadow-sm">
                  <img src={LUMA_AVATAR} alt="Luma" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                </div>
              )}
              
              <div className={`max-w-[80%] rounded-3xl px-6 py-4 shadow-sm ${
                msg.role === 'user' 
                  ? 'bg-[#8E9775] text-white rounded-tr-sm' 
                  : 'bg-white text-[#2D2D2D] rounded-tl-sm'
              }`}>
                <div className={`prose prose-sm max-w-none ${msg.role === 'user' ? 'prose-invert' : ''}`}>
                  <ReactMarkdown>{msg.text}</ReactMarkdown>
                </div>
              </div>
            </div>
          ))}
          {isLoading && (
            <div className="flex gap-4 flex-row">
              <div className="shrink-0 w-10 h-10 rounded-full overflow-hidden shadow-sm">
                <img src={LUMA_AVATAR} alt="Luma" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
              </div>
              <div className="bg-white shadow-sm rounded-3xl rounded-tl-sm px-6 py-4 flex items-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin text-[#8E9775]" />
                <span className="text-sm text-[#6B6B6B]">Luma está escribiendo...</span>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>
      </main>

      {/* Input Area */}
      <footer className="absolute bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-[#F7F5F2] via-[#F7F5F2] to-transparent pointer-events-none">
        <div className="max-w-3xl mx-auto pointer-events-auto">
          <form 
            onSubmit={handleSend}
            className="flex items-center gap-2 bg-white shadow-[0_15px_35px_rgba(0,0,0,0.06)] rounded-full p-2 pl-4 transition-all"
          >
            {recognitionRef.current && (
              <button
                type="button"
                onClick={toggleRecording}
                className={`shrink-0 p-2.5 rounded-full transition-colors flex items-center justify-center ${
                  isRecording ? 'bg-red-100 text-red-600 animate-pulse' : 'text-[#A0A0A0] hover:text-[#8E9775] hover:bg-[#E2E7D6]'
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
              placeholder={isRecording ? "Escuchando..." : "Escribe lo que sientes..."}
              className="flex-1 max-h-32 min-h-[24px] bg-transparent border-none focus:outline-none resize-none py-3 px-2 text-[#2D2D2D] placeholder:text-[#A0A0A0]"
              rows={1}
            />
            <button
              type="submit"
              disabled={!input.trim() || isLoading}
              className="shrink-0 bg-[#8E9775] hover:bg-[#7A8265] disabled:bg-[#E2E7D6] disabled:cursor-not-allowed text-white rounded-full px-6 py-3 font-semibold text-sm transition-colors flex items-center justify-center"
            >
              Enviar
            </button>
          </form>
          <p className="text-center text-xs text-[#A0A0A0] mt-3">
            Luma es una IA de apoyo emocional, no un profesional de la salud mental.
          </p>
        </div>
      </footer>
    </div>
  );
}
