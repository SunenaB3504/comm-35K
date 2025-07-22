export enum Speaker {
  Narrator = 'Narrator',
  Kanishq = 'Kanishq',
  Neil = 'Neil',
  System = 'System'
}

export interface StorySegment {
  speaker: Speaker;
  text: string;
  isHighlight?: boolean;
}

export interface MindMapNodeData {
  id: string;
  title: string;
  content: StorySegment[] | null;
  children: MindMapNodeData[];
  x: number;
  y: number;
  subtitle?: string;
}