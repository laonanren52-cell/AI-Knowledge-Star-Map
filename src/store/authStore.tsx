import { createContext, useContext, useEffect, useMemo, useReducer, type ReactNode } from "react";
import {
  AUTH_STORAGE_KEY,
  canEditWorkspace,
  canReadWorkspace,
  createAdminWorkspace,
  createUserWorkspace,
  demoUsers,
  toPublicUser,
  workspaceAccess,
} from "../services/authService";
import { ADMIN_PUBLIC_WORKSPACE_ID, privateWorkspaceId, type AuthUserRecord, type Workspace, type WorkspaceAccess, type ZhimaiUser } from "../types/workspace";

interface AuthState {
  users: AuthUserRecord[];
  workspaces: Workspace[];
  currentUser: ZhimaiUser | null;
  currentWorkspaceId: string | null;
  authError: string | null;
}

type AuthAction =
  | { type: "login"; username: string; password: string }
  | { type: "register"; username: string; email: string; password: string }
  | { type: "logout" }
  | { type: "selectWorkspace"; workspaceId: string }
  | { type: "clearWorkspace" }
  | { type: "publishWorkspace"; workspaceId: string; summary: string }
  | { type: "clearError" };

interface AuthContextValue {
  users: ZhimaiUser[];
  workspaces: Workspace[];
  currentUser: ZhimaiUser | null;
  currentWorkspace: Workspace | null;
  currentAccess: WorkspaceAccess | null;
  authError: string | null;
  login: (username: string, password: string) => void;
  register: (username: string, email: string, password: string) => void;
  logout: () => void;
  selectWorkspace: (workspaceId: string) => void;
  clearWorkspaceSelection: () => void;
  publishWorkspace: (summary: string) => void;
  clearError: () => void;
  canRead: (workspace: Workspace) => boolean;
  canEdit: (workspace: Workspace) => boolean;
}

const AuthContext = createContext<AuthContextValue | null>(null);

function ensureWorkspaceList(users: AuthUserRecord[], workspaces: Workspace[]) {
  const byId = new Map(workspaces.map((workspace) => [workspace.id, workspace]));
  byId.set(ADMIN_PUBLIC_WORKSPACE_ID, byId.get(ADMIN_PUBLIC_WORKSPACE_ID) ?? createAdminWorkspace());
  users.forEach((user) => {
    const privateId = privateWorkspaceId(user.id);
    if (!byId.has(privateId)) byId.set(privateId, createUserWorkspace(user));
  });
  return [...byId.values()];
}

function createInitialAuthState(): AuthState {
  const users = demoUsers;
  return {
    users,
    workspaces: ensureWorkspaceList(users, [createAdminWorkspace()]),
    currentUser: null,
    currentWorkspaceId: null,
    authError: null,
  };
}

function reviveAuthState(value: Partial<AuthState>): AuthState {
  const users = value.users?.length ? value.users : demoUsers;
  const currentUser = value.currentUser ? users.find((user) => user.id === value.currentUser?.id) ?? value.currentUser : null;
  return {
    users,
    workspaces: ensureWorkspaceList(users, value.workspaces ?? [createAdminWorkspace()]),
    currentUser,
    currentWorkspaceId: value.currentWorkspaceId ?? null,
    authError: null,
  };
}

function loadInitialAuthState() {
  if (typeof window === "undefined") return createInitialAuthState();
  try {
    const raw = window.localStorage.getItem(AUTH_STORAGE_KEY);
    return raw ? reviveAuthState(JSON.parse(raw) as Partial<AuthState>) : createInitialAuthState();
  } catch {
    return createInitialAuthState();
  }
}

function matchUser(users: AuthUserRecord[], username: string) {
  const normalized = username.trim().toLowerCase();
  return users.find((user) => user.username.toLowerCase() === normalized || user.email.toLowerCase() === normalized);
}

function authReducer(state: AuthState, action: AuthAction): AuthState {
  if (action.type === "login") {
    const user = matchUser(state.users, action.username);
    if (!user || !action.password.trim()) {
      return { ...state, authError: "Demo 登录需要输入已存在账号和任意非空密码。" };
    }
    if (!user.isDemo && user.password !== action.password) {
      return { ...state, authError: "账号或密码不正确。" };
    }
    return {
      ...state,
      workspaces: ensureWorkspaceList(state.users, state.workspaces),
      currentUser: toPublicUser(user),
      currentWorkspaceId: null,
      authError: null,
    };
  }

  if (action.type === "register") {
    const username = action.username.trim();
    const email = action.email.trim() || `${username}@zhimai.local`;
    if (username.length < 2 || action.password.length < 4) {
      return { ...state, authError: "用户名至少 2 个字符，密码至少 4 个字符。" };
    }
    if (matchUser(state.users, username) || matchUser(state.users, email)) {
      return { ...state, authError: "该用户名或邮箱已存在。" };
    }
    const createdAt = new Date().toISOString();
    const user: AuthUserRecord = {
      id: `user_${Date.now()}`,
      username,
      email,
      password: action.password,
      role: "user",
      createdAt,
    };
    const users = [...state.users, user];
    return {
      ...state,
      users,
      workspaces: ensureWorkspaceList(users, state.workspaces),
      currentUser: toPublicUser(user),
      currentWorkspaceId: null,
      authError: null,
    };
  }

  if (action.type === "logout") {
    return { ...state, currentUser: null, currentWorkspaceId: null, authError: null };
  }

  if (action.type === "selectWorkspace") {
    const workspace = state.workspaces.find((item) => item.id === action.workspaceId) ?? null;
    if (!canReadWorkspace(state.currentUser, workspace)) return { ...state, authError: "你没有权限访问该知识空间。" };
    return { ...state, currentWorkspaceId: action.workspaceId, authError: null };
  }

  if (action.type === "clearWorkspace") {
    return { ...state, currentWorkspaceId: null, authError: null };
  }

  if (action.type === "publishWorkspace") {
    const workspace = state.workspaces.find((item) => item.id === action.workspaceId) ?? null;
    if (!canEditWorkspace(state.currentUser, workspace)) return { ...state, authError: "你当前没有发布该空间的权限。" };
    const stamp = new Date().toISOString();
    return {
      ...state,
      workspaces: state.workspaces.map((item) =>
        item.id === action.workspaceId
          ? {
              ...item,
              updatedAt: stamp,
              lastPublishedAt: stamp,
              version: item.version + 1,
              updateSummary: action.summary.trim() || "管理员发布了新的星图更新。",
            }
          : item,
      ),
      authError: null,
    };
  }

  if (action.type === "clearError") return { ...state, authError: null };
  return state;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(authReducer, undefined, loadInitialAuthState);

  const currentWorkspace = useMemo(
    () => state.workspaces.find((workspace) => workspace.id === state.currentWorkspaceId) ?? null,
    [state.currentWorkspaceId, state.workspaces],
  );
  const currentAccess = useMemo(() => workspaceAccess(state.currentUser, currentWorkspace), [currentWorkspace, state.currentUser]);

  useEffect(() => {
    window.localStorage.setItem(
      AUTH_STORAGE_KEY,
      JSON.stringify({
        users: state.users,
        workspaces: state.workspaces,
        currentUser: state.currentUser,
        currentWorkspaceId: state.currentWorkspaceId,
        currentWorkspace,
      }),
    );
  }, [currentWorkspace, state]);

  const value = useMemo<AuthContextValue>(
    () => ({
      users: state.users.map(toPublicUser),
      workspaces: state.workspaces,
      currentUser: state.currentUser,
      currentWorkspace,
      currentAccess,
      authError: state.authError,
      login: (username, password) => dispatch({ type: "login", username, password }),
      register: (username, email, password) => dispatch({ type: "register", username, email, password }),
      logout: () => dispatch({ type: "logout" }),
      selectWorkspace: (workspaceId) => dispatch({ type: "selectWorkspace", workspaceId }),
      clearWorkspaceSelection: () => dispatch({ type: "clearWorkspace" }),
      publishWorkspace: (summary) => {
        if (currentWorkspace) dispatch({ type: "publishWorkspace", workspaceId: currentWorkspace.id, summary });
      },
      clearError: () => dispatch({ type: "clearError" }),
      canRead: (workspace) => canReadWorkspace(state.currentUser, workspace),
      canEdit: (workspace) => canEditWorkspace(state.currentUser, workspace),
    }),
    [currentAccess, currentWorkspace, state.authError, state.currentUser, state.users, state.workspaces],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuthStore() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuthStore must be used inside AuthProvider.");
  return context;
}
