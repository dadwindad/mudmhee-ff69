export type Point = { x: number; y: number };

export type Path = {
  id: string;
  color: string;
  points: Point[];
  type: 'freehand' | 'pixel';
  width?: number;
};

export type SymmetryGroup = 
  | 'p3' | 'p31m' | 'p3m1' // Body (Wallpaper) groups requested
  | 'p111' | 'p112' | 'pm11' | 'p1m1' | 'p11g' | 'pmm2' | 'pmg2'; // Border (Frieze) groups

export type DesignPart = 'body' | 'border';

export type Metadata = {
  name: string;
  creator: string;
  description: string;
  geography: string;
};

export type Project = {
  version: string;
  metadata: Metadata;
  colors: string[];
  gridSize: number;
  body: {
    symmetry: SymmetryGroup;
    paths: Path[];
    cols: number;
    rows: number;
  };
  border: {
    symmetry: SymmetryGroup;
    paths: Path[];
    cols: number;
    rows: number;
  };
};

export type GalleryItemType = 'body' | 'border' | 'assemble';

export type GalleryItem = {
  id: string;
  type: GalleryItemType;
  metadata: Metadata;
  image: string;
  date: string;
  projectData: Project;
};

export type QueueItem = {
  id: string;
  image: string;   // base64 PNG (2×3 print)
  name: string;
  creator?: string;
  date: string;
};

