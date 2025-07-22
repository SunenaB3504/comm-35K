import React, { useRef, useEffect } from 'react';
import { MindMapNodeData } from '../types';
import { BookOpenIcon } from './Icons';

interface MindMapNodeProps {
  node: MindMapNodeData;
  onSelectNode: (node: MindMapNodeData) => void;
}

const MindMapNode: React.FC<MindMapNodeProps> = ({ node, onSelectNode }) => {
  return (
    <div
      className="absolute transition-all duration-500"
      style={{ left: `${node.x}px`, top: `${node.y}px`, transform: 'translate(-50%, -50%)' }}
    >
      <div className="relative group flex flex-col items-center">
        <div className="bg-gray-800 border-2 border-gray-700 rounded-xl shadow-lg p-3 w-48 text-center transition-all duration-300 group-hover:border-cyan-400 group-hover:shadow-cyan-500/20">
          <h3 className="font-bold text-gray-100">{node.title}</h3>
          {node.subtitle && (
            <p className="text-xs text-gray-400 mt-1">{node.subtitle}</p>
          )}
        </div>
        <div className="absolute top-full mt-2 flex items-center space-x-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
          {node.content && (
            <button 
              onClick={() => onSelectNode(node)}
              title="Read Content"
              className="p-2 bg-green-500/80 hover:bg-green-500 rounded-full text-white transition-all transform hover:scale-110"
            >
              <BookOpenIcon />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

interface MindMapProps {
  data: MindMapNodeData;
  onSelectNode: (node: MindMapNodeData) => void;
}

const SvgConnections: React.FC<{ node: MindMapNodeData }> = ({ node }) => {
    return (
      <g>
        {node.children.map(child => (
          <React.Fragment key={`line-group-${child.id}`}>
            <line
                x1={node.x}
                y1={node.y}
                x2={child.x}
                y2={child.y}
                className="stroke-gray-600/50"
                strokeWidth="2"
            />
            <SvgConnections node={child} />
          </React.Fragment>
        ))}
      </g>
    );
  };


const renderNodesRecursively = (
    node: MindMapNodeData, 
    onSelectNode: (node: MindMapNodeData) => void
): React.ReactNode[] => {
    let nodes: React.ReactNode[] = [
        <MindMapNode 
            key={node.id} 
            node={node} 
            onSelectNode={onSelectNode} 
        />
    ];
    node.children.forEach(child => {
        nodes = nodes.concat(renderNodesRecursively(child, onSelectNode));
    });
    return nodes;
};


export const MindMap: React.FC<MindMapProps> = ({ data, onSelectNode }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  
  // Define a fixed size for the pannable canvas to ensure all nodes are visible
  const CANVAS_WIDTH = 1200;
  const CANVAS_HEIGHT = 800;

  useEffect(() => {
    // Center the view on the root node after the component mounts
    if (containerRef.current) {
      const container = containerRef.current;
      const containerWidth = container.clientWidth;
      const containerHeight = container.clientHeight;

      const targetX = data.x;
      const targetY = data.y;

      // Calculate the scroll position to center the target point (the root node)
      container.scrollLeft = targetX - (containerWidth / 2);
      // Position it a bit higher than the exact center for a better initial view of the downward-expanding tree
      container.scrollTop = targetY - (containerHeight / 3); 
    }
  }, [data.x, data.y]);

  return (
    <div 
      ref={containerRef} 
      className="w-full h-full relative overflow-auto custom-scrollbar cursor-grab active:cursor-grabbing"
    >
      <div
        className="relative"
        style={{ width: CANVAS_WIDTH, height: CANVAS_HEIGHT }}
      >
        <svg width={CANVAS_WIDTH} height={CANVAS_HEIGHT} className="absolute inset-0">
            <defs>
              <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
                <path d="M 40 0 L 0 0 0 40" fill="none" className="stroke-gray-800/50" strokeWidth="0.5"/>
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#grid)" />
            <SvgConnections node={data} />
        </svg>
        {renderNodesRecursively(data, onSelectNode)}
      </div>
    </div>
  );
};