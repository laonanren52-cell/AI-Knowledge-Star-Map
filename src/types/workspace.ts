export type UserRole = "admin" | "user";
export type WorkspaceType = "admin_public" | "user_private" | "demo_public";
export type WorkspaceVisibility = "public" | "private";

export const ADMIN_USER_ID = "admin_default";
export const ADMIN_PUBLIC_WORKSPACE_ID = "admin_public_default";

export interface ZhimaiUser {
  id: string;
  username: string;
  email: string;
  role: UserRole;
  createdAt: string;
  isDemo?: boolean;
}

export interface AuthUserRecord extends ZhimaiUser {
  password?: string;
}

export interface Workspace {
  id: string;
  name: string;
  type: WorkspaceType;
  ownerId: string;
  visibility: WorkspaceVisibility;
  createdAt: string;
  updatedAt: string;
  lastPublishedAt?: string;
  description: string;
  version: number;
  updateSummary?: string;
}

export interface WorkspaceAccess {
  workspaceId: string;
  canRead: boolean;
  canEdit: boolean;
  mode: "editable" | "readonly";
  reason: string;
}

export function privateWorkspaceId(userId: string) {
  return `user_private_${userId}`;
}
