import React, { useState, useEffect, useRef } from 'react';
import { Send, Mic, MicOff, Volume2, VolumeX, ShieldAlert, ArrowRight, HelpCircle } from 'lucide-react';
import { db, type ChatMessage } from '../db/db';
import { askGemma, isOnline } from '../services/ai';

interface AIChatProps {
  locationContext: string;
  accessibilityLargeText: boolean;
}

export function AIChat({ locationContext, accessibilityLargeText }: AIChatProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState<string>('');
  const [isRecording, setIsRecording] = useState<boolean>(false);
  const [voiceEnabled, setVoiceEnabled] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Speech Recognition Setup
  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    // Load chat history from IndexedDB
    db.chat.orderBy('timestamp').toArray().then((arr) => {
      if (arr.length === 0) {
        // Add welcome message
        const welcome: ChatMessage = {
          sender: 'gemma',
          text: 'Hello, I am SAFE-ZONE (powered by Gemma). Ask me anything: "My house is flooding", "How do I perform CPR?", "What are the local shelter locations?", or "I smell gas". I work offline.',
          timestamp: new Date().toISOString(),
          isOffline: !isOnline(),
        };
        db.chat.add(welcome);
        setMessages([welcome]);
      } else {
        setMessages(arr);
      }
    });

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      const rec = new SpeechRecognition();
      rec.continuous = false;
      rec.interimResults = false;
      rec.lang = 'en-US';

      rec.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        setInputText(transcript);
        setIsRecording(false);
      };

      rec.onerror = (err: any) => {
        console.error('Speech recognition error:', err);
        setIsRecording(false);
      };

      rec.onend = () => {
        setIsRecording(false);
      };

      recognitionRef.current = rec;
    }
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const toggleRecording = () => {
    if (!recognitionRef.current) {
      alert('Speech Recognition is not supported by your current browser.');
      return;
    }

    if (isRecording) {
      recognitionRef.current.stop();
    } else {
      setIsRecording(true);
      recognitionRef.current.start();
    }
  };

  const handleSpeak = (text: string) => {
    if (!('speechSynthesis' in window)) return;

    if (window.speechSynthesis.speaking) {
      window.speechSynthesis.cancel();
      return;
    }

    const cleanText = text.replace(/\[OFFLINE MODE\]|\[OFFLINE FALLBACK\]/g, '');
    const utterance = new SpeechSynthesisUtterance(cleanText);
    window.speechSynthesis.speak(utterance);
  };

  const handleSend = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const cleanText = inputText.trim();
    if (!cleanText) return;

    setInputText('');
    setLoading(true);

    const userMsg: ChatMessage = {
      sender: 'user',
      text: cleanText,
      timestamp: new Date().toISOString(),
      isOffline: !isOnline(),
    };

    // Add user message to DB
    const userId = await db.chat.add(userMsg);
    setMessages((prev) => [...prev, { ...userMsg, id: userId }]);

    try {
      const guidance = await askGemma(cleanText, locationContext);

      // Construct textual output
      let outputText = guidance.explanation;
      if (guidance.immediateActions && guidance.immediateActions.length > 0) {
        outputText += '\n\n**Immediate Actions Required:**\n' + guidance.immediateActions.map(a => `• ${a}`).join('\n');
      }
      if (guidance.nextSteps && guidance.nextSteps.length > 0) {
        outputText += '\n\n**Next Steps:**\n' + guidance.nextSteps.map(s => `• ${s}`).join('\n');
      }
      if (guidance.thingsNotToDo && guidance.thingsNotToDo.length > 0) {
        outputText += '\n\n**Things NOT to do:**\n' + guidance.thingsNotToDo.map(n => `• ${n}`).join('\n');
      }

      const gemmaMsg: ChatMessage = {
        sender: 'gemma',
        text: outputText,
        timestamp: new Date().toISOString(),
        isOffline: !isOnline(),
      };

      const gemmaId = await db.chat.add(gemmaMsg);
      setMessages((prev) => [...prev, { ...gemmaMsg, id: gemmaId }]);

      if (voiceEnabled) {
        handleSpeak(outputText);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const parseMessageText = (text: string) => {
    // Simple markdown formatting helper
    return text.split('\n').map((line, idx) => {
      if (line.startsWith('**') && line.endsWith('**')) {
        return <h4 key={idx} className="font-bold text-sm text-slate-200 mt-3 mb-1">{line.replace(/\*\*/g, '')}</h4>;
      }
      if (line.startsWith('•')) {
        return <li key={idx} className="ml-4 list-disc text-slate-300 py-0.5">{line.substring(1).trim()}</li>;
      }
      return <p key={idx} className="mb-2 leading-relaxed text-slate-300">{line}</p>;
    });
  };

  return (
    <div className={`flex flex-col h-[calc(100vh-12rem)] ${accessibilityLargeText ? 'accessibility-large-text' : ''}`}>
      {/* Top Banner info */}
      <div className="flex items-center justify-between p-4 bg-slate-900/60 border border-slate-800 rounded-t-2xl">
        <div className="flex items-center gap-2">
          <ShieldAlert className="h-5 w-5 text-orange-500" />
          <div>
            <h3 className="font-bold text-sm">Gemma Emergency Advisor</h3>
            <p className="text-[10px] text-slate-400">
              {isOnline() ? 'Connected via Cloud AI' : 'Running Offline-First Expert System'}
            </p>
          </div>
        </div>

        <button
          onClick={() => setVoiceEnabled(!voiceEnabled)}
          className={`p-2 rounded-lg border transition-all ${
            voiceEnabled
              ? 'bg-orange-500/10 border-orange-500/30 text-orange-400'
              : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
          }`}
          title={voiceEnabled ? 'Mute AI Voice' : 'Unmute AI Voice'}
        >
          {voiceEnabled ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
        </button>
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-950 border-x border-slate-900">
        {messages.map((msg, index) => (
          <div key={msg.id || index} className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div
              className={`max-w-[85%] rounded-2xl p-4 shadow-md transition-all ${
                msg.sender === 'user'
                  ? 'bg-orange-600 text-white rounded-tr-none'
                  : 'bg-slate-900 border border-slate-800 text-slate-200 rounded-tl-none'
              }`}
            >
              <div className="text-xs font-semibold text-slate-400 mb-1 flex items-center justify-between">
                <span>{msg.sender === 'user' ? 'You' : 'Gemma AI'}</span>
                <span className="text-[9px] uppercase font-medium bg-slate-950/40 px-1.5 py-0.5 rounded ml-4 border border-slate-800">
                  {msg.isOffline ? 'Offline' : 'Online'}
                </span>
              </div>
              <div className="text-xs break-words">{parseMessageText(msg.text)}</div>
              {msg.sender === 'gemma' && (
                <button
                  onClick={() => handleSpeak(msg.text)}
                  className="mt-3 flex items-center gap-1.5 text-[10px] text-slate-400 hover:text-white transition-colors"
                >
                  <Volume2 className="h-3.5 w-3.5" /> Read Aloud
                </button>
              )}
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex justify-start">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl rounded-tl-none p-4 max-w-[85%]">
              <div className="flex items-center gap-2 text-xs text-slate-400">
                <span className="h-2 w-2 rounded-full bg-orange-500 animate-ping"></span>
                Gemma generating evacuation instructions...
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Form */}
      <form onSubmit={handleSend} className="p-3 bg-slate-900/60 border border-slate-800 rounded-b-2xl flex gap-2">
        <button
          type="button"
          onClick={toggleRecording}
          className={`p-3 rounded-xl border transition-all ${
            isRecording
              ? 'bg-red-500/10 border-red-500/30 text-red-500 animate-pulse'
              : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
          }`}
          title={isRecording ? 'Listening...' : 'Use Voice Input'}
        >
          {isRecording ? <MicOff className="h-4.5 w-4.5" /> : <Mic className="h-4.5 w-4.5" />}
        </button>
        <input
          type="text"
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          placeholder={isRecording ? 'Listening...' : 'Type emergency question (e.g. "My arm is bleeding")...'}
          className="flex-1 bg-slate-950 border border-slate-800 focus:border-orange-500 focus:ring-1 focus:ring-orange-500 rounded-xl px-4 py-2.5 text-xs text-white placeholder-slate-500 outline-none"
        />
        <button
          type="submit"
          className="p-3 rounded-xl bg-orange-600 hover:bg-orange-500 text-white font-bold transition-all"
        >
          <Send className="h-4.5 w-4.5" />
        </button>
      </form>
    </div>
  );
}
