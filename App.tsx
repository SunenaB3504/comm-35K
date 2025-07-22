import React, { useState, useCallback } from 'react';
import { MindMapNodeData, StorySegment } from './types';
import { INITIAL_MIND_MAP_DATA } from './constants';
import { ContentReaderModal } from './components/ContentReaderModal';
import { MindMap } from './components/MindMap';

const App: React.FC = () => {
  const [mindMapData] = useState<MindMapNodeData>(INITIAL_MIND_MAP_DATA);
  const [selectedNodeContent, setSelectedNodeContent] = useState<StorySegment[] | null>(null);

  const handleSelectNode = useCallback((node: MindMapNodeData) => {
    if (node.content) {
      setSelectedNodeContent(node.content);
    }
  }, []);

  const handleCloseReader = useCallback(() => {
    setSelectedNodeContent(null);
  }, []);

  return (
    <div className="w-full h-screen bg-gray-900 text-white overflow-hidden flex flex-col font-sans">
      <header className="flex-shrink-0 bg-gray-800/50 backdrop-blur-sm border-b border-gray-700 z-10">
        <div className="container mx-auto px-4 py-3 flex justify-between items-center">
          <h1 className="text-xl font-bold text-cyan-400">
            KnowledgeCompass
          </h1>
          <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-400 hidden md:block">An Interactive Business Journey</span>
          </div>
        </div>
      </header>

      <div className="text-center p-6 bg-gray-900/50 border-b border-gray-800 flex-shrink-0">
        <h2 className="text-4xl font-extrabold text-white tracking-tight sm:text-5xl">
          <span className="text-cyan-400">KnowledgeCompass</span>
        </h2>
        <p className="mt-4 max-w-3xl mx-auto text-lg text-gray-300">
          From a cluttered garage in Navi Mumbai to the boardrooms of a thriving company, Neil and Kanishq’s "KnowledgeCompass" journey blazes through the dramatic evolution from sole proprietorship, to partnership, and finally to a full-fledged corporation. Each transformation is powered by bold decisions and the real-world mastery of Business Studies, Accounting, and Economics, revealing how ambition and teamwork can turn a simple idea into an enterprise that shapes the future.
        </p>
      </div>

      <main className="flex-grow relative">
        <MindMap 
            data={mindMapData} 
            onSelectNode={handleSelectNode} 
        />
      </main>

      {selectedNodeContent && (
        <ContentReaderModal 
          content={selectedNodeContent} 
          onClose={handleCloseReader} 
        />
      )}

      <footer className="text-center p-2 bg-gray-900/80 text-xs text-gray-500 flex-shrink-0">
          <p>Created with passion for learning. Use the mind map to explore concepts.</p>
      </footer>
    </div>
  );
};

export default App;