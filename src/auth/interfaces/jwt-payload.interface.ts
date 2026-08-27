export interface JwtPayload {
  sub: string;
  sessionId: string;
  employeeId: string;
  email: string;
  role: string;
  permissions?: string[];
  passwordChangedAt?: number | null;
  iat?: number;
  exp?: number;
}
