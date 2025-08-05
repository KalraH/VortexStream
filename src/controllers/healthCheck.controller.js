import { HTTP_STATUS } from "../constants.js";
import ApiResponse from "../utils/ApiResponse.js";
import asyncHandler from "../utils/asyncHandler.js";

const healthcheck = asyncHandler(async (req, res) => {
        return res.status(HTTP_STATUS.OK).json(
                new ApiResponse(HTTP_STATUS.OK, `Everything is OK.`, {
                        message: "Everything is OK.",
                })
        );
});

export { healthcheck };
