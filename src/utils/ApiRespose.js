/**
 * @file utils/ApiResponse.js
 * @description Custom response handler for API responses.
 *
 * @param {string} data - Response Data.
 * @param {string} message - Success message.
 * @param {number} statusCode - HTTP status code.
 */
class ApiResponse {
        constructor(statusCode, message = "Success", data = null) {
                this.data = data;
                this.message = message;
                this.statusCode = statusCode;
                this.success = statusCode < 400;
        }
}

export default ApiResponse;
