export interface Tag {
  id: string;
  name: string;
  userId: string;
  createdAt: string;
}

export interface Tab {
  id: string;
  name: string;
  userId?: string;
  createdAt?: string;
  updatedAt?: string | null;
}

export interface Note {
  id: string;
  title: string;
  content: string;
  tabId: string;
  userId?: string;
  createdAt: string;
  updatedAt: string | null;
  tags: Tag[];
  isFavorite?: boolean;
  favoritedAt?: string | null;
}

export interface User {
  id: string;
  email: string;
  name: string;
  displayName?: string;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  name: string;
  email: string;
  password: string;
}

export interface ApiError {
  message: string;
  statusCode: number;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
}

export interface SearchResult {
  notes: Note[];
  total: number;
}

export interface SharedLink {
  id: string;
  token: string;
  noteId: string;
  createdAt: string;
  expiresAt: string | null;
  isActive: boolean;
}

export interface SharedNoteDto {
  title: string;
  content: string;
  createdAt: string;
  updatedAt: string;
}
