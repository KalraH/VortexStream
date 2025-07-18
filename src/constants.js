export const CONSTANTS = {
        DB_NAME: "vortexstream",
        DB_VERSION: 1,
        JSON_LIMIT: "50mb",
};

/**
 * HTTP status codes used in the application.
 *
 * 1. 1xx: Informational responses
 * 2. 2xx: Success
 * 3. 3xx: Redirection
 * 4. 4xx: Client errors
 * 5. 5xx: Server errors
 */
export const HTTP_STATUS = {
        OK: 200,
        CREATED: 201,
        ACCEPTED: 202,
        NO_CONTENT: 204,
        RESET_CONTENT: 205,
        PARTIAL_CONTENT: 206,

        MULTIPLE_CHOICES: 300,
        MOVED_PERMANENTLY: 301,
        FOUND: 302,

        BAD_REQUEST: 400,
        UNAUTHORIZED: 401,
        FORBIDDEN: 403,
        NOT_FOUND: 404,
        NOT_ACCEPTABLE: 406,
        CONFLICT: 409,

        INTERNAL_SERVER_ERROR: 500,
        SERVICE_UNAVAILABLE: 503,
};
