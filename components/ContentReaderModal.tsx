import React, { useState, useEffect, useCallback, useRef } from 'react';
import { StorySegment, Speaker } from '../types';
import { SpeechService } from '../services/speechService';
import { PlayIcon, PauseIcon, StopIcon, XMarkIcon, SparklesIcon, SpinnerIcon } from './Icons';
import { GoogleGenAI } from '@google/genai';

interface ContentReaderModalProps {
  content: StorySegment[];
  onClose: () => void;
}

const getSpeakerStyle = (speaker: Speaker) => {
    switch(speaker) {
        case Speaker.Kanishq: return "text-amber-400";
        case Speaker.Neil: return "text-sky-400";
        case Speaker.Narrator: return "text-gray-400 italic";
        case Speaker.System: return "text-teal-300 font-mono";
        default: return "text-gray-300";
    }
};

interface AiTutorProps {
  storyContent: StorySegment[];
}

const AiTutor: React.FC<AiTutorProps> = ({ storyContent }) => {
  const [question, setQuestion] = useState('');
  const [answer, setAnswer] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isOpen, setIsOpen] = useState(false);

  const handleAskAI = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!question.trim() || isLoading) return;

    setIsLoading(true);
    setAnswer('');
    setError(null);

    try {
      if (!process.env.API_KEY) {
        throw new Error("API_KEY environment variable not set.");
      }
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      
      const storyContext = storyContent.map(segment => `${segment.speaker}: ${segment.text}`).join('\n\n');
      const systemInstruction = `You are an expert tutor for high school students, specializing in Business Studies, Accounting, and Economics. Your name is 'KnowledgeBot'. Your personality is helpful, encouraging, and clear.
      Based ONLY on the provided story context below, answer the user's question.
      - If the question is directly answerable from the text, provide a clear, concise answer and quote the relevant part of the story if helpful.
      - If the question is related but requires a small leap in logic based on the context, answer it but state that you are making an inference.
      - If the question is completely outside the scope of the provided context or the subjects, you MUST politely decline to answer and explain that your knowledge is limited to the story. Do not answer questions about other topics.
      - Format your answers for readability using markdown, like lists or bold text.
      `;

      const contents = `${storyContext}\n\n---\n\nQuestion: "${question}"`;

      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: contents,
        config: {
          systemInstruction: systemInstruction,
        }
      });
      
      setAnswer(response.text);

    } catch (e: any) {
      console.error("Gemini API Error:", e);
      setError(e.message || 'Sorry, I had trouble finding an answer. The API key might be missing or invalid. Please check the environment configuration.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="border-t border-gray-700 mt-4 pt-4">
      <button onClick={() => setIsOpen(!isOpen)} className="w-full flex justify-between items-center text-left text-gray-300 hover:text-white transition-colors">
        <span className="flex items-center gap-2 font-semibold">
          <SparklesIcon className="w-5 h-5 text-cyan-400"/>
          Ask KnowledgeBot a Question
        </span>
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={`w-5 h-5 transition-transform ${isOpen ? 'rotate-180' : ''}`}>
          <path strokeLinecap="round" strokeLinejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" />
        </svg>
      </button>

      {isOpen && (
        <div className="mt-4 space-y-4">
          <form onSubmit={handleAskAI}>
            <div className="relative">
              <input
                type="text"
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                placeholder="e.g., What is a Partnership Deed?"
                disabled={isLoading}
                className="w-full bg-gray-900 border border-gray-600 rounded-lg py-2 pl-4 pr-24 text-white placeholder-gray-500 focus:ring-2 focus:ring-cyan-500 focus:outline-none disabled:opacity-50"
                aria-label="Ask a question"
              />
              <button
                type="submit"
                disabled={isLoading || !question.trim()}
                className="absolute inset-y-0 right-0 flex items-center justify-center px-4 font-semibold text-white bg-cyan-600 hover:bg-cyan-500 rounded-r-lg disabled:bg-gray-500 disabled:cursor-not-allowed transition-colors"
              >
                {isLoading ? <SpinnerIcon /> : 'Ask'}
              </button>
            </div>
          </form>

          {answer && (
            <div className="p-4 bg-gray-900/50 rounded-lg border border-gray-700">
                <div className="text-gray-200 text-base whitespace-pre-wrap">{answer}</div>
                <p className="text-right text-xs text-gray-500 mt-2">Powered by Gemini</p>
            </div>
          )}

          {error && (
            <div className="p-4 bg-red-900/50 text-red-300 rounded-lg border border-red-700">
              <p>{error}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};


export const ContentReaderModal: React.FC<ContentReaderModalProps> = ({ content, onClose }) => {
  const [playbackState, setPlaybackState] = useState<'stopped' | 'playing' | 'paused'>('stopped');
  const [currentSegmentIndex, setCurrentSegmentIndex] = useState(0);

  const speechServiceRef = useRef<SpeechService | null>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const isComponentMounted = useRef(true);
  const playbackStateRef = useRef(playbackState);

  useEffect(() => {
    playbackStateRef.current = playbackState;
  }, [playbackState]);

  useEffect(() => {
    speechServiceRef.current = new SpeechService();
    isComponentMounted.current = true;
    
    return () => {
      isComponentMounted.current = false;
      speechServiceRef.current?.cancel();
    };
  }, []);

  const readSegment = useCallback((index: number) => {
    if (!isComponentMounted.current || index >= content.length) {
      if (isComponentMounted.current) {
        setPlaybackState('stopped');
        setCurrentSegmentIndex(0);
      }
      return;
    }

    setCurrentSegmentIndex(index);
    const segment = content[index];
    const onEnd = () => {
        if (isComponentMounted.current && playbackStateRef.current === 'playing') {
            readSegment(index + 1);
        }
    };
    
    speechServiceRef.current?.speak(segment.text, segment.speaker, onEnd);
  }, [content]);

  const handlePlay = () => {
    if (playbackState === 'paused') {
      speechServiceRef.current?.resume();
      setPlaybackState('playing');
    } else if (playbackState === 'stopped') {
      readSegment(0); // Start from beginning
      setPlaybackState('playing');
    }
  };

  const handlePause = () => {
    if (playbackState === 'playing') {
      speechServiceRef.current?.pause();
      setPlaybackState('paused');
    }
  };

  const handleStop = () => {
    speechServiceRef.current?.cancel();
    setPlaybackState('stopped');
    setCurrentSegmentIndex(0); // Reset for next play
  };
  
  const handleClose = () => {
    handleStop();
    onClose();
  };

  useEffect(() => {
    if (currentSegmentIndex !== -1 && contentRef.current) {
        const activeElement = contentRef.current.querySelector(`[data-index='${currentSegmentIndex}']`);
        if (activeElement) {
            activeElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
    }
  }, [currentSegmentIndex]);

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-gray-800 border border-gray-700 rounded-2xl shadow-2xl w-full max-w-3xl h-full max-h-[90vh] flex flex-col">
        <header className="flex items-center justify-between p-4 border-b border-gray-700 flex-shrink-0">
          <h2 className="text-xl font-bold text-cyan-400 flex items-center gap-2">📖 Story Reader</h2>
          <button onClick={handleClose} className="text-gray-400 hover:text-white transition-colors">
            <XMarkIcon />
          </button>
        </header>

        <div ref={contentRef} className="p-6 overflow-y-auto flex-grow custom-scrollbar space-y-4 min-h-0">
          {content.map((segment, index) => {
            const speakerStyle = getSpeakerStyle(segment.speaker);
            const isSpeaking = index === currentSegmentIndex && playbackState === 'playing';

            return (
              <div
                key={index}
                data-index={index}
                className={`p-4 rounded-lg transition-all duration-300 ${isSpeaking ? 'bg-cyan-900/50 ring-2 ring-cyan-500' : 'bg-gray-900/50'} ${segment.isHighlight ? 'border-l-4 border-teal-400' : ''}`}
              >
                <p className={`font-bold text-sm mb-1 ${speakerStyle}`}>
                  {segment.speaker}
                </p>
                <p className={`text-lg leading-relaxed text-gray-200 whitespace-pre-wrap`}>{segment.text}</p>
              </div>
            );
          })}
        </div>

        <footer className="p-4 border-t border-gray-700 flex-shrink-0 bg-gray-800/50">
           {/* AI Tutor Section */}
          <AiTutor storyContent={content} />
          
          {/* Media Controls */}
          <div className="flex items-center justify-center space-x-4 pt-4">
             <button
              onClick={handlePlay}
              disabled={playbackState === 'playing'}
              className="p-3 bg-green-600 rounded-full text-white transition-all transform hover:scale-110 shadow-lg disabled:bg-gray-600 disabled:scale-100 disabled:cursor-not-allowed"
              aria-label="Play"
            >
              <PlayIcon />
            </button>
            <button
              onClick={handlePause}
              disabled={playbackState !== 'playing'}
              className="p-3 bg-yellow-600 rounded-full text-white transition-all transform hover:scale-110 shadow-lg disabled:bg-gray-600 disabled:scale-100 disabled:cursor-not-allowed"
              aria-label="Pause"
            >
              <PauseIcon />
            </button>
            <button
              onClick={handleStop}
              disabled={playbackState === 'stopped'}
              className="p-3 bg-red-600 rounded-full text-white transition-all transform hover:scale-110 shadow-lg disabled:bg-gray-600 disabled:scale-100 disabled:cursor-not-allowed"
              aria-label="Stop"
            >
              <StopIcon />
            </button>
          </div>
          <div className="text-center mt-4">
            <p className="text-xs text-gray-500 leading-snug">
              Voice narration is powered by your browser's built-in Text-to-Speech (TTS). Quality may vary.
            </p>
          </div>
        </footer>
      </div>
    </div>
  );
};
