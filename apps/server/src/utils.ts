import { randomUUID } from "node:crypto";
import {
  DefaultNodePropsByType,
  PageDocumentV2Schema,
  type EditorNode,
  type NodeType,
  type PageDocumentV2,
} from "@wg/schema";

export const createId = (prefix: string) => `${prefix}_${randomUUID().slice(0, 10)}`;

export const nowISO = () => new Date().toISOString();

export const createNode = (type: NodeType, id?: string): EditorNode => ({
  id: id ?? createId("node"),
  type,
  props: { ...DefaultNodePropsByType[type] },
  style: {},
  children: [],
  aiMeta: {},
});

export const createInitialDocument = (
  pageId: string,
  projectId: string,
  title: string
): PageDocumentV2 => {
  const root = [
    {
      ...createNode("title"),
      props: { content: title },
    },
    createNode("paragraph"),
  ];

  return PageDocumentV2Schema.parse({
    id: pageId,
    projectId,
    title,
    status: "draft",
    version: 1,
    updatedAt: nowISO(),
    root,
    meta: { source: "v2" },
  });
};

export const parseDocument = (raw: string): PageDocumentV2 => {
  const json = JSON.parse(raw) as unknown;
  return PageDocumentV2Schema.parse(json);
};
