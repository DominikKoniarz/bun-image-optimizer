export const ErrorCode = {
    INVALID_URL: "INVALID_URL",
    INVALID_WIDTH: "INVALID_WIDTH",
    INVALID_QUALITY: "INVALID_QUALITY",
    SOURCE_FETCH_FAILED: "SOURCE_FETCH_FAILED",
    SOURCE_UNSUPPORTED_CONTENT_TYPE: "SOURCE_UNSUPPORTED_CONTENT_TYPE",
    PROCESSING_TIMEOUT: "PROCESSING_TIMEOUT",
    NOT_FOUND: "NOT_FOUND",
    INTERNAL_ERROR: "INTERNAL_ERROR",
} as const;

export type ErrorCode = (typeof ErrorCode)[keyof typeof ErrorCode];

export interface AppError {
    code: ErrorCode;
    message: string;
}

export function appError(code: ErrorCode, message: string): AppError {
    return { code, message };
}

export function toErrorResponse(error: AppError, status: number): Response {
    return Response.json(
        { error },
        {
            status,
            headers: {
                "Content-Type": "application/json",
                "Cache-Control": "no-cache, no-store, must-revalidate",
            },
        },
    );
}
