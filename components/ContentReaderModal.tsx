import React, { useState, useEffect, useCallback, useRef } from 'react';
import { StorySegment, Speaker } from '../types';
import { SpeechService } from '../services/speechService';
import { PlayIcon, PauseIcon, StopIcon, XMarkIcon } from './Icons';

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
      readSegment(currentSegmentIndex); // Start from current (or 0 if stopped)
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

        <footer className="p-4 border-t border-gray-700 flex-shrink-0">
          <div className="flex items-center justify-center space-x-4">
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
              <br />
              <a href="https://www.google.com/search?q=how+to+enable+text+to+speech+in+browser" target="_blank" rel="noopener noreferrer" className="text-cyan-400 hover:underline">
                Learn how to enable or configure TTS on your device.
              </a>
            </p>
          </div>
        </footer>
      </div>
    </div>
  );
};