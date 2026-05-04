export type LoginCredentials = {
  email: string;
  password: string;
};

export type LoginResponse = {
  success?: boolean;
  message?: string;
  error?: string;
  data?: {
    message?: string;
    token?: string;
    expires_at?: string;
  };
  token?: string;
  user?: unknown;
};
