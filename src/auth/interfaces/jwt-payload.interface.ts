export interface JwtPayload {
  sub: string;
  employeeId: string;
  email: string;
  role: string;
  permissions?: string[];
  passwordChangedAt?: number | null;
  iat?: number;
  exp?: number;
}
