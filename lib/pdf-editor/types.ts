export interface Annotation {
  id: string;
  type: "text" | "image" | "watermark" | "pageNumber" | "highlight" | "draw";
  pageNumber: number;
  x: number;
  y: number;
  width?: number;
  height?: number;
  content?: string;
  fontSize?: number;
  color?: string;
  opacity?: number;
  rotation?: number;
}

export interface EditorState {
  fileId: string;
  fileName: string;
  currentPage: number;
  totalPages: number;
  zoom: number;
  activeTool: string;
  annotations: Annotation[];
  history: Annotation[][];
  historyIndex: number;
}

export type EditorAction =
  | { type: "SET_PAGE"; payload: number }
  | { type: "SET_ZOOM"; payload: number }
  | { type: "SET_TOOL"; payload: string }
  | { type: "ADD_ANNOTATION"; payload: Annotation }
  | { type: "REMOVE_ANNOTATION"; payload: string }
  | { type: "UNDO" }
  | { type: "REDO" }
  | { type: "RESET" }
  | { type: "SET_TOTAL_PAGES"; payload: number };
