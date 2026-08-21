import type { EditorState, EditorAction } from "./types";

const MAX_HISTORY = 50;

export function editorReducer(state: EditorState, action: EditorAction): EditorState {
  switch (action.type) {
    case "SET_PAGE":
      return { ...state, currentPage: action.payload };

    case "SET_ZOOM":
      return { ...state, zoom: Math.max(25, Math.min(500, action.payload)) };

    case "SET_TOOL":
      return { ...state, activeTool: action.payload };

    case "SET_TOTAL_PAGES":
      return { ...state, totalPages: action.payload };

    case "ADD_ANNOTATION": {
      const newAnnotations = [...state.annotations, action.payload];
      const newHistory = state.history.slice(0, state.historyIndex + 1);
      newHistory.push(newAnnotations);
      if (newHistory.length > MAX_HISTORY) newHistory.shift();
      return {
        ...state,
        annotations: newAnnotations,
        history: newHistory,
        historyIndex: newHistory.length - 1,
      };
    }

    case "UPDATE_ANNOTATION": {
      const newAnnotations = state.annotations.map((a) =>
        a.id === action.payload.id ? { ...a, ...action.payload.changes } : a
      );
      const newHistory = state.history.slice(0, state.historyIndex + 1);
      newHistory.push(newAnnotations);
      if (newHistory.length > MAX_HISTORY) newHistory.shift();
      return {
        ...state,
        annotations: newAnnotations,
        history: newHistory,
        historyIndex: newHistory.length - 1,
      };
    }

    case "REMOVE_ANNOTATION": {
      const filtered = state.annotations.filter((a) => a.id !== action.payload);
      const hist = state.history.slice(0, state.historyIndex + 1);
      hist.push(filtered);
      if (hist.length > MAX_HISTORY) hist.shift();
      return {
        ...state,
        annotations: filtered,
        history: hist,
        historyIndex: hist.length - 1,
      };
    }

    case "UNDO": {
      if (state.historyIndex <= 0) return state;
      const newIndex = state.historyIndex - 1;
      return {
        ...state,
        annotations: state.history[newIndex],
        historyIndex: newIndex,
      };
    }

    case "REDO": {
      if (state.historyIndex >= state.history.length - 1) return state;
      const newIndex = state.historyIndex + 1;
      return {
        ...state,
        annotations: state.history[newIndex],
        historyIndex: newIndex,
      };
    }

    case "SELECT_ANNOTATION":
      return { ...state, selectedAnnotationId: action.payload, editingAnnotationId: null };

    case "SET_EDITING":
      return { ...state, editingAnnotationId: action.payload };

    case "RESET":
      return {
        ...state,
        annotations: [],
        history: [[]],
        historyIndex: 0,
        selectedAnnotationId: null,
        editingAnnotationId: null,
      };

    default:
      return state;
  }
}
