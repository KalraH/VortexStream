import jwt from "jsonwebtoken";
import ApiError from "../utils/ApiError.js";
import { HTTP_STATUS } from "../constants.js";
import { User } from "../models/user.model.js";
import asyncHandler from "../utils/asyncHandler.js";

export const authMiddleware = asyncHandler(async (req, _, next) => {
        try {
                const token =
                        req.cookies?.accessToken ||
                        req.headers?.authorization?.split(" ")[1] ||
                        req.headers?.authorization;

                if (!token) {
                        throw new ApiError(
                                HTTP_STATUS.UNAUTHORIZED,
                                "AUTH MIDDLEWARE, No access token provided."
                        );
                }

                const decodedToken = jwt.verify(
                        token,
                        process.env.ACCESS_TOKEN_SECRET
                );
                if (!decodedToken) {
                        throw new ApiError(
                                HTTP_STATUS.UNAUTHORIZED,
                                "AUTH MIDDLEWARE, Invalid or Expired Token Provided."
                        );
                }

                const userInstance = await User.findById(decodedToken?._id);
                if (!userInstance) {
                        throw new ApiError(
                                HTTP_STATUS.UNAUTHORIZED,
                                "AUTH MIDDLEWARE, User not found."
                        );
                }

                req.user = userInstance;
                next();
        } catch (error) {
                throw new ApiError(
                        error.status || HTTP_STATUS.INTERNAL_SERVER_ERROR,
                        error.message ||
                                "AUTH MIDDLEWARE, An error occurred while processing your request.",
                        [error.message],
                        error.stack
                );
        }
});
