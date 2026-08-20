export interface JwtPayload {
    sub: string;
    employeeId: string;
    email: string;
    role: string;
    iat?: number;
    exp?: number;
}
