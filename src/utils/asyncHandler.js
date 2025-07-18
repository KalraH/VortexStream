/**
 * Asynchronous error handler for Express.js
 * @param {function} reqHandler
 *
 * @returns {function} A middleware function that handles asynchronous errors
 */
const asyncHandler = (reqHandler) => {
        return (req, res, next) => {
                Promise.resolve(reqHandler(req, res, next)).catch((err) =>
                        next(err)
                );
        };
};

export default asyncHandler;
