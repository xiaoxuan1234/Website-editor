import { z } from "zod";
import { EditorNodeSchema, PageDocumentV2Schema } from "./editor";

export const UserSchema = z.object({
  id: z.string(),
  username: z.string(),
});

export type User = z.infer<typeof UserSchema>;

export const AuthLoginRequestSchema = z.object({
  username: z.string().min(1),
  password: z.string().min(1),
});

export const AuthLoginResponseSchema = z.object({
  accessToken: z.string(),
  refreshToken: z.string(),
  user: UserSchema,
});

export const AuthRefreshRequestSchema = z.object({
  refreshToken: z.string(),
});

export const AuthRefreshResponseSchema = z.object({
  accessToken: z.string(),
  refreshToken: z.string(),
});

export const ProjectSchema = z.object({
  id: z.string(),
  name: z.string(),
  userId: z.string(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const CreateProjectRequestSchema = z.object({
  name: z.string().min(1),
});

export const UpdateProjectRequestSchema = z.object({
  name: z.string().min(1),
});

export const PageSummarySchema = z.object({
  id: z.string(),
  projectId: z.string(),
  title: z.string(),
  status: z.enum(["draft", "published"]),
  version: z.number().int().positive(),
  updatedAt: z.string(),
});

export const CreatePageRequestSchema = z.object({
  title: z.string().min(1),
});

export const SaveDraftRequestSchema = z.object({
  document: PageDocumentV2Schema,
});

export const PublishPageResponseSchema = z.object({
  pageId: z.string(),
  versionId: z.string(),
  slug: z.string(),
  previewUrl: z.string(),
});

export const AIPageGenerateRequestSchema = z.object({
  projectId: z.string(),
  pageId: z.string(),
  instruction: z.string().min(1),
  pageType: z.string().optional(),
  style: z.string().optional(),
  primaryColor: z.string().optional(),
  secondaryColor: z.string().optional(),
  backgroundColor: z.string().optional(),
  tone: z.string().optional(),
  length: z.string().optional(),
  language: z.string().optional(),
  keywords: z.array(z.string()).optional(),
  complexity: z.string().optional(),
  layout: z.string().optional(),
  contentFocus: z.string().optional(),
  audience: z.string().optional(),
  industry: z.string().optional(),
  sections: z.array(z.string()).optional(),
});

export const AIPageGenerateResponseSchema = z.object({
  document: PageDocumentV2Schema,
  reasoningSummary: z.string(),
  safetyFlags: z.array(z.string()),
});

export const AIChatMessageSchema = z.object({
  role: z.enum(["user", "assistant"]),
  content: z.string().min(1),
});

export const AINodeModifyRequestSchema = z.object({
  projectId: z.string(),
  pageId: z.string(),
  targetNodeId: z.string(),
  instruction: z.string().min(1),
  conversation: z.array(AIChatMessageSchema).optional(),
  language: z.string().optional(),
});

export const AINodeModifyResponseSchema = z.object({
  node: EditorNodeSchema,
  reasoningSummary: z.string(),
  safetyFlags: z.array(z.string()),
});

export const PreviewCreateRequestSchema = z.object({
  pageId: z.string(),
});

export const PreviewDocumentResponseSchema = z.object({
  pageId: z.string(),
  versionId: z.string(),
  document: PageDocumentV2Schema,
});

export type AuthLoginRequest = z.infer<typeof AuthLoginRequestSchema>;
export type AuthLoginResponse = z.infer<typeof AuthLoginResponseSchema>;
export type Project = z.infer<typeof ProjectSchema>;
export type UpdateProjectRequest = z.infer<typeof UpdateProjectRequestSchema>;
export type PageSummary = z.infer<typeof PageSummarySchema>;
export type AIChatMessage = z.infer<typeof AIChatMessageSchema>;
export type AIPageGenerateRequest = z.infer<typeof AIPageGenerateRequestSchema>;
export type AIPageGenerateResponse = z.infer<
  typeof AIPageGenerateResponseSchema
>;
export type AINodeModifyRequest = z.infer<typeof AINodeModifyRequestSchema>;
export type AINodeModifyResponse = z.infer<typeof AINodeModifyResponseSchema>;
