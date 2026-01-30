export interface AuthUser {
  id: string;
  email?: string | null;
  name?: string | null;
  picture?: string | null;
}

export interface AuthSessionResponse {
  access_token: string;
  token_type: 'bearer';
  expires_in: number;
  user: AuthUser;
}

