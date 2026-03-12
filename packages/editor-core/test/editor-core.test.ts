import { describe, expect, test } from "vitest";
import type { EditorNode, PageDocumentV2 } from "@wg/schema";
import {
  createAddNodeCommand,
  createDeleteNodeCommand,
  createDuplicateNodeCommand,
  createHistoryState,
  createMoveNodeCommand,
  createUpdateNodePropsCommand,
  executeCommand,
  redoCommand,
  undoCommand,
  type EditorState,
} from "../src/index";

const createDoc = (): PageDocumentV2 => ({
  id: "page-1",
  projectId: "project-1",
  title: "Test",
  status: "draft",
  version: 1,
  updatedAt: new Date().toISOString(),
  root: [
    {
      id: "container-1",
      type: "container",
      props: { layout: "flow" },
      style: {},
      children: [],
      aiMeta: {},
    },
  ],
  meta: {},
});

const createTextNode = (id: string): EditorNode => ({
  id,
  type: "text",
  props: { content: "hello" },
  style: {},
  children: [],
  aiMeta: {},
});

describe("editor commands", () => {
  test("add -> undo -> redo", () => {
    const state: EditorState = { doc: createDoc() };
    const history = createHistoryState();

    executeCommand(state, history, createAddNodeCommand(createTextNode("text-1"), null, 1));
    expect(state.doc.root).toHaveLength(2);

    undoCommand(state, history);
    expect(state.doc.root).toHaveLength(1);

    redoCommand(state, history);
    expect(state.doc.root).toHaveLength(2);
    expect(state.doc.root[1]?.id).toBe("text-1");
  });

  test("delete nested node can undo", () => {
    const state: EditorState = { doc: createDoc() };
    state.doc.root[0]?.children.push(createTextNode("child-1"));
    const history = createHistoryState();

    executeCommand(state, history, createDeleteNodeCommand("child-1"));
    expect(state.doc.root[0]?.children).toHaveLength(0);

    undoCommand(state, history);
    expect(state.doc.root[0]?.children).toHaveLength(1);
    expect(state.doc.root[0]?.children[0]?.id).toBe("child-1");
  });

  test("duplicate and move are reversible", () => {
    const state: EditorState = { doc: createDoc() };
    state.doc.root.push(createTextNode("text-source"));
    const history = createHistoryState();

    executeCommand(
      state,
      history,
      createDuplicateNodeCommand("text-source", () => "text-copy")
    );
    expect(state.doc.root.map((node) => node.id)).toEqual([
      "container-1",
      "text-source",
      "text-copy",
    ]);

    executeCommand(
      state,
      history,
      createMoveNodeCommand("text-copy", "container-1", 0)
    );
    expect(state.doc.root[0]?.children[0]?.id).toBe("text-copy");

    undoCommand(state, history);
    expect(state.doc.root[2]?.id).toBe("text-copy");

    executeCommand(
      state,
      history,
      createUpdateNodePropsCommand("text-source", { content: "updated" })
    );
    expect(state.doc.root[1]?.props.content).toBe("updated");

    undoCommand(state, history);
    expect(state.doc.root[1]?.props.content).toBe("hello");
  });
});
