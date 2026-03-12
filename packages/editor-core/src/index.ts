import type { EditorNode, PageDocumentV2 } from "@wg/schema";

export type EditorState = {
  doc: PageDocumentV2;
};

export type EditorCommand = {
  label: string;
  do: (state: EditorState) => void;
  undo: (state: EditorState) => void;
};

export type HistoryState = {
  past: EditorCommand[];
  future: EditorCommand[];
  canUndo: boolean;
  canRedo: boolean;
};

type NodeLocation = {
  parentId: string | null;
  index: number;
  node: EditorNode;
  list: EditorNode[];
};

type RemovedNode = {
  node: EditorNode;
  parentId: string | null;
  index: number;
};

const clone = <T>(value: T): T => {
  if (typeof structuredClone === "function") {
    try {
      return structuredClone(value);
    } catch {
      // Vue reactive proxies are not structured-cloneable.
      // Fallback keeps command execution stable in browser runtime.
    }
  }
  return JSON.parse(JSON.stringify(value)) as T;
};

const clampIndex = (value: number, length: number): number =>
  Math.max(0, Math.min(value, length));

const findNodeLocation = (
  nodes: EditorNode[],
  id: string,
  parentId: string | null = null
): NodeLocation | null => {
  for (let index = 0; index < nodes.length; index += 1) {
    const node = nodes[index];
    if (!node) {
      continue;
    }
    if (node.id === id) {
      return { parentId, index, node, list: nodes };
    }
    const childLocation = findNodeLocation(node.children, id, node.id);
    if (childLocation) {
      return childLocation;
    }
  }
  return null;
};

export const findNodeById = (doc: PageDocumentV2, id: string): EditorNode | null => {
  const location = findNodeLocation(doc.root, id);
  return location ? location.node : null;
};

export const insertNodeAt = (
  doc: PageDocumentV2,
  parentId: string | null,
  index: number,
  node: EditorNode
): void => {
  if (!parentId) {
    const safeIndex = clampIndex(index, doc.root.length);
    doc.root.splice(safeIndex, 0, node);
    return;
  }

  const parent = findNodeById(doc, parentId);
  if (!parent || parent.type !== "container") {
    const safeIndex = clampIndex(index, doc.root.length);
    doc.root.splice(safeIndex, 0, node);
    return;
  }

  const safeIndex = clampIndex(index, parent.children.length);
  parent.children.splice(safeIndex, 0, node);
};

export const removeNodeById = (doc: PageDocumentV2, id: string): RemovedNode | null => {
  const location = findNodeLocation(doc.root, id);
  if (!location) {
    return null;
  }

  const [removed] = location.list.splice(location.index, 1);
  if (!removed) {
    return null;
  }

  return {
    node: removed,
    parentId: location.parentId,
    index: location.index,
  };
};

const duplicateNodeTree = (node: EditorNode, createId: () => string): EditorNode => ({
  ...clone(node),
  id: createId(),
  children: node.children.map((child) => duplicateNodeTree(child, createId)),
});

export const createHistoryState = (): HistoryState => ({
  past: [],
  future: [],
  canUndo: false,
  canRedo: false,
});

const syncHistoryFlags = (history: HistoryState) => {
  history.canUndo = history.past.length > 0;
  history.canRedo = history.future.length > 0;
};

export const executeCommand = (
  state: EditorState,
  history: HistoryState,
  command: EditorCommand
) => {
  command.do(state);
  history.past.push(command);
  history.future = [];
  syncHistoryFlags(history);
};

export const undoCommand = (state: EditorState, history: HistoryState) => {
  const command = history.past.pop();
  if (!command) {
    syncHistoryFlags(history);
    return;
  }
  command.undo(state);
  history.future.push(command);
  syncHistoryFlags(history);
};

export const redoCommand = (state: EditorState, history: HistoryState) => {
  const command = history.future.pop();
  if (!command) {
    syncHistoryFlags(history);
    return;
  }
  command.do(state);
  history.past.push(command);
  syncHistoryFlags(history);
};

export const createAddNodeCommand = (
  node: EditorNode,
  parentId: string | null,
  index: number
): EditorCommand => {
  const snapshot = clone(node);

  return {
    label: "AddNode",
    do(state) {
      insertNodeAt(state.doc, parentId, index, clone(snapshot));
    },
    undo(state) {
      removeNodeById(state.doc, snapshot.id);
    },
  };
};

export const createDeleteNodeCommand = (nodeId: string): EditorCommand => {
  let cachedRemoved: RemovedNode | null = null;

  return {
    label: "DeleteNode",
    do(state) {
      const removed = removeNodeById(state.doc, nodeId);
      if (removed) {
        cachedRemoved = cachedRemoved ?? clone(removed);
      }
    },
    undo(state) {
      if (!cachedRemoved) {
        return;
      }
      insertNodeAt(
        state.doc,
        cachedRemoved.parentId,
        cachedRemoved.index,
        clone(cachedRemoved.node)
      );
    },
  };
};

export const createDuplicateNodeCommand = (
  nodeId: string,
  createId: () => string
): EditorCommand => {
  let duplicated: RemovedNode | null = null;

  return {
    label: "DuplicateNode",
    do(state) {
      if (!duplicated) {
        const source = findNodeLocation(state.doc.root, nodeId);
        if (!source) {
          return;
        }

        duplicated = {
          node: duplicateNodeTree(source.node, createId),
          parentId: source.parentId,
          index: source.index + 1,
        };
      }

      insertNodeAt(state.doc, duplicated.parentId, duplicated.index, clone(duplicated.node));
    },
    undo(state) {
      if (!duplicated) {
        return;
      }
      removeNodeById(state.doc, duplicated.node.id);
    },
  };
};

export const createMoveNodeCommand = (
  nodeId: string,
  toParentId: string | null,
  toIndex: number
): EditorCommand => {
  let origin: { parentId: string | null; index: number } | null = null;

  return {
    label: "MoveNode",
    do(state) {
      const removed = removeNodeById(state.doc, nodeId);
      if (!removed) {
        return;
      }

      if (!origin) {
        origin = { parentId: removed.parentId, index: removed.index };
      }

      insertNodeAt(state.doc, toParentId, toIndex, removed.node);
    },
    undo(state) {
      if (!origin) {
        return;
      }

      const removed = removeNodeById(state.doc, nodeId);
      if (!removed) {
        return;
      }

      insertNodeAt(state.doc, origin.parentId, origin.index, removed.node);
    },
  };
};

export const createUpdateNodePropsCommand = (
  nodeId: string,
  nextProps: Record<string, unknown>
): EditorCommand => {
  let previousProps: Record<string, unknown> | null = null;

  return {
    label: "UpdateNodeProps",
    do(state) {
      const node = findNodeById(state.doc, nodeId);
      if (!node) {
        return;
      }

      if (!previousProps) {
        previousProps = clone(node.props);
      }
      node.props = {
        ...node.props,
        ...nextProps,
      };
    },
    undo(state) {
      const node = findNodeById(state.doc, nodeId);
      if (!node || !previousProps) {
        return;
      }

      node.props = clone(previousProps);
    },
  };
};

export const createUpdateNodeStyleCommand = (
  nodeId: string,
  nextStyle: Record<string, string | number | boolean | null>
): EditorCommand => {
  let previousStyle: Record<string, string | number | boolean | null> | null = null;

  return {
    label: "UpdateNodeStyle",
    do(state) {
      const node = findNodeById(state.doc, nodeId);
      if (!node) {
        return;
      }

      if (!previousStyle) {
        previousStyle = clone(node.style);
      }

      node.style = {
        ...node.style,
        ...nextStyle,
      };
    },
    undo(state) {
      const node = findNodeById(state.doc, nodeId);
      if (!node || !previousStyle) {
        return;
      }

      node.style = clone(previousStyle);
    },
  };
};

export const createUpdateDocumentMetaCommand = (
  nextMeta: Record<string, unknown>
): EditorCommand => {
  let previousMeta: Record<string, unknown> | null = null;

  return {
    label: "UpdateDocumentMeta",
    do(state) {
      if (!previousMeta) {
        previousMeta = clone(state.doc.meta);
      }

      state.doc.meta = {
        ...state.doc.meta,
        ...nextMeta,
      };
    },
    undo(state) {
      if (!previousMeta) {
        return;
      }
      state.doc.meta = clone(previousMeta);
    },
  };
};
