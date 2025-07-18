import ApiError from "../utils/ApiError.js";
import { HTTP_STATUS } from "../constants.js";
import { User } from "../models/user.model.js";
import ApiResponse from "../utils/ApiResponse.js";
import asyncHandler from "../utils/asyncHandler.js";
import uploadOnCloudinary from "../utils/cloudinary.js";

const generateAccessRefreshToken = async (user) => {
        try {
                const accessToken = user.generateAccessToken();
                if (!accessToken) {
                        throw new ApiError(
                                HTTP_STATUS.INTERNAL_SERVER_ERROR,
                                "USER CONTROLLER, GEN ACC REF TOKEN, Access token generation failed."
                        );
                }

                const refreshToken = user.generateRefreshToken();
                if (!refreshToken) {
                        throw new ApiError(
                                HTTP_STATUS.INTERNAL_SERVER_ERROR,
                                "USER CONTROLLER, GEN ACC REF TOKEN, Refresh token generation failed."
                        );
                }

                user.refereshToken = refreshToken;
                await user.save({ validateBeforeSave: false });

                return { accessToken, refreshToken };
        } catch (error) {
                throw new ApiError(
                        HTTP_STATUS.INTERNAL_SERVER_ERROR,
                        "USER CONTROLLER, GEN ACC REF TOKEN, An error occurred while generating tokens.",
                        [error.message],
                        error.stack
                );
        }
};

/**
 * Registers a new user.
 * @param 	{Object} req - The request object containing user details
 * @param 	{Object} res - The response object
 *
 * @returns 	{Object} The response object with the created user details
 */
const registerUser = asyncHandler(async (req, res) => {
        try {
                const { userName, email, password, fullName } = req.body;

                // console.log("USER CONTROLLER,", "TESTING LOGGING START --------------------------------------------------------------");
                // console.log(req.body);
                // console.log("USER CONTROLLER,", "TESTING LOGGING END ----------------------------------------------------------------");

                if (
                        [userName, email, password, fullName].some(
                                (field) => field?.trim() === ""
                        )
                ) {
                        throw new ApiError(
                                HTTP_STATUS.NOT_ACCEPTABLE,
                                "USER CONTROLLER, REGISTER, All fields are required."
                        );
                }

                const existingUser = await User.findOne({
                        $or: [{ userName }, { email }],
                });

                if (existingUser) {
                        throw new ApiError(
                                HTTP_STATUS.CONFLICT,
                                "USER CONTROLLER, REGISTER, User with this email already exists."
                        );
                }

                // console.log("USER CONTROLLER,", "TESTING LOGGING START --------------------------------------------------------------");
                // console.log(existingUser);
                // console.log("USER CONTROLLER,", "TESTING LOGGING END ----------------------------------------------------------------");

                const avatarLocalPath = req.files?.avatar?.[0]?.path || null;
                const coverImageLocalPath =
                        req.files?.coverImage?.[0]?.path || null;

                if (!avatarLocalPath) {
                        throw new ApiError(
                                HTTP_STATUS.BAD_REQUEST,
                                "USER CONTROLLER, REGISTER, Avatar file path is missing."
                        );
                }

                const avatar = await uploadOnCloudinary(avatarLocalPath);
                const coverImage =
                        await uploadOnCloudinary(coverImageLocalPath);

                if (!avatar) {
                        throw new ApiError(
                                HTTP_STATUS.BAD_REQUEST,
                                "USER CONTROLLER, REGISTER, Avatar did't get upload to Cloudinary."
                        );
                }

                const newUser = await User.create({
                        userName,
                        email,
                        password,
                        fullName,
                        avatar: avatar,
                        coverImage: coverImage ? coverImage : null,
                });

                const createdUser = await User.findById(newUser._id).select(
                        "-password -refereshToken -__v"
                );

                if (!createdUser) {
                        throw new ApiError(
                                HTTP_STATUS.INTERNAL_SERVER_ERROR,
                                "USER CONTROLLER, REGISTER, User Creation failed."
                        );
                }

                res.status(HTTP_STATUS.OK).json(
                        new ApiResponse(
                                HTTP_STATUS.CREATED,
                                `USER CONTROLLER, REGISTER, User {${createdUser._id}: ${createdUser.userName}} registered successfully.`,
                                createdUser
                        )
                );
        } catch (error) {
                // Clean up the file if upload fails
                if (req.files?.avatar?.[0]?.path) {
                        fs.unlinkSync(req.files.avatar[0].path);
                }
                if (req.files?.coverImage?.[0]?.path) {
                        fs.unlinkSync(req.files.coverImage[0].path);
                }

                throw new ApiError(
                        error.status || HTTP_STATUS.INTERNAL_SERVER_ERROR,
                        error.message ||
                                "USER CONTROLLER, REGISTER, An error occurred while registering the user."
                );
        }
});

const loginUser = asyncHandler(async (req, res) => {
        try {
                const { email, userName, password } = req.body;

                if ((!email && !userName) || !password) {
                        throw new ApiError(
                                HTTP_STATUS.PARTIAL_CONTENT,
                                "USER CONTROLLER, LOGIN, (Email or UserName) and password are required."
                        );
                }

                const userInstance = await User.findOne({
                        $or: [{ email }, { userName }],
                }).select("+password +refereshToken");

                if (
                        !userInstance ||
                        !(await userInstance.comparePassword(password))
                ) {
                        throw new ApiError(
                                HTTP_STATUS.UNAUTHORIZED,
                                "USER CONTROLLER, LOGIN, Invalid email or password."
                        );
                }

                const { accessToken, refreshToken } =
                        await generateAccessRefreshToken(userInstance);

                // console.log("USER CONTROLLER,", "TESTING LOGGING START --------------------------------------------------------------");
                // console.log(user);
                // console.log(user);
                // console.log("USER CONTROLLER,", "TESTING LOGGING END ----------------------------------------------------------------");

                const options = {
                        expires: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000), // 5 days
                        httpOnly: true,
                        secure: true,
                        signed: true, // Use signed cookies for security
                };

                res.status(HTTP_STATUS.OK)
                        .cookie("refreshToken", refreshToken, options)
                        .cookie("accessToken", accessToken, options)
                        .json(
                                new ApiResponse(
                                        HTTP_STATUS.ACCEPTED,
                                        `USER CONTROLLER, LOGIN, User {${userInstance._id}: ${userInstance.userName}} logged in successfully.`,
                                        {
                                                user: userInstance
                                                        .select(
                                                                "-password -refreshToken"
                                                        )
                                                        .toObject(),
                                                accessToken,
                                                refreshToken,
                                        }
                                )
                        );
        } catch (error) {
                throw new ApiError(
                        error.status || HTTP_STATUS.INTERNAL_SERVER_ERROR,
                        error.message ||
                                "USER CONTROLLER, LOGIN, An error occurred while logging in the user."
                );
        }
});

const logoutUser = asyncHandler(async (req, res) => {
        try {
                const user = await User.findByIdAndUpdate(
                        req.user._id,
                        { $set: { refreshToken: null } },
                        { new: true }
                );

                const options = {
                        expires: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000), // 5 days
                        httpOnly: true,
                        secure: true,
                        signed: true,
                };

                res.status(HTTP_STATUS.OK)
                        .clearCookie("refreshToken", options)
                        .clearCookie("accessToken", options)
                        .json(
                                new ApiResponse(
                                        HTTP_STATUS.NO_CONTENT,
                                        `USER CONTROLLER, LOGOUT, User {${user._id}: ${user.userName}} logged out successfully.`
                                )
                        );
        } catch (error) {
                throw new ApiError(
                        error.status || HTTP_STATUS.INTERNAL_SERVER_ERROR,
                        error.message ||
                                "USER CONTROLLER, LOGOUT, An error occurred while logging out the user."
                );
        }
});

export { registerUser, loginUser, logoutUser };
