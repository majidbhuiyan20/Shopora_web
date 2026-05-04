export type LoginCredentials = {
  email: string;
  password: string;
};

export type LoginResponse = {
  message?: string;
  token?: string;
  user?: unknown;
};
