import jwt from "jsonwebtoken";
import ApiError from "../utils/ApiError.js";
import { User } from "../models/user.model.js";
import ApiResponse from "../utils/ApiResponse.js";
import asyncHandler from "../utils/asyncHandler.js";
import { HTTP_STATUS, COOKIE_OPTIONS } from "../constants.js";
import { uploadOnCloud, deleteFromCloud } from "../utils/cloudinary.js";

/**
 * Generate Refresh and Access Tokens.
 * @param 	{Object} user - User's Instance from DB.
 *
 * @returns 	{Object} The Refresh and Access Tokens created.
 */
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

                user.refreshToken = refreshToken;
                await user.save({ validateBeforeSave: false });

                return { accessToken, refreshToken };
        } catch (error) {
                throw new ApiError(
                        error.status || HTTP_STATUS.INTERNAL_SERVER_ERROR,
                        error.message ||
                                "USER CONTROLLER, GEN ACC REF TOKEN, CATCH, An error occurred while generating tokens.",
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

                const avatar = await uploadOnCloud(avatarLocalPath);
                const coverImage = await uploadOnCloud(coverImageLocalPath);

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

                const createdUser = await User.findById(newUser?._id).select(
                        "-password -refreshToken -__v"
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
                                "USER CONTROLLER, REGISTER, CATCH, An error occurred while registering the user.",
                        [error.message],
                        error.stack
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
                }).select("+password +refreshToken");

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

                res.status(HTTP_STATUS.OK)
                        .cookie("accessToken", accessToken, COOKIE_OPTIONS)
                        .cookie("refreshToken", refreshToken, COOKIE_OPTIONS)
                        .json(
                                new ApiResponse(
                                        HTTP_STATUS.ACCEPTED,
                                        `USER CONTROLLER, LOGIN, User {${userInstance._id}: ${userInstance.userName}} logged in successfully.`,
                                        {
                                                user: userInstance,
                                                accessToken,
                                                refreshToken,
                                        }
                                )
                        );
        } catch (error) {
                throw new ApiError(
                        error.status || HTTP_STATUS.INTERNAL_SERVER_ERROR,
                        error.message ||
                                "USER CONTROLLER, LOGIN, CATCH, An error occurred while logging in the user.",
                        [error.message],
                        error.stack
                );
        }
});

const logoutUser = asyncHandler(async (req, res) => {
        try {
                const userInstance = await User.findByIdAndUpdate(
                        req.user?._id,
                        { $set: { refreshToken: null } },
                        { new: true }
                );

                res.status(HTTP_STATUS.OK)
                        .clearCookie("accessToken", COOKIE_OPTIONS)
                        .clearCookie("refreshToken", COOKIE_OPTIONS)
                        .json(
                                new ApiResponse(
                                        HTTP_STATUS.NO_CONTENT,
                                        `USER CONTROLLER, LOGOUT, User {${userInstance._id}: ${userInstance.userName}} logged out successfully.`
                                )
                        );
        } catch (error) {
                throw new ApiError(
                        error.status || HTTP_STATUS.INTERNAL_SERVER_ERROR,
                        error.message ||
                                "USER CONTROLLER, LOGOUT, CATCH, An error occurred while logging out the user.",
                        [error.message],
                        error.stack
                );
        }
});

const refreshAccessToken = asyncHandler(async (req, res) => {
        try {
                const token =
                        req.cookies?.refreshToken || req.body?.refreshToken;
                if (!token) {
                        throw new ApiError(
                                HTTP_STATUS.UNAUTHORIZED,
                                "USER CONTROLLER, REFACC TOKEN, Token not provided."
                        );
                }

                const decodedToken = jwt.verify(
                        token,
                        process.env.REFRESH_TOKEN_SECRET
                );

                const userInstance = await User.findById(
                        decodedToken?._id
                ).select("+refreshToken");
                if (!userInstance) {
                        throw new ApiError(
                                HTTP_STATUS.UNAUTHORIZED,
                                "USER CONTROLLER, REFACC TOKEN, Invalid token provided."
                        );
                }

                if (token !== userInstance.refreshToken) {
                        throw new ApiError(
                                HTTP_STATUS.UNAUTHORIZED,
                                "USER CONTROLLER, REFACC TOKEN, Refresh Token is Expired or Invalid."
                        );
                }

                const { accessToken, refreshToken } =
                        await generateAccessRefreshToken(userInstance);

                res.status(HTTP_STATUS.OK)
                        .cookie("accessToken", accessToken, COOKIE_OPTIONS)
                        .cookie("refreshToken", refreshToken, COOKIE_OPTIONS)
                        .json(
                                new ApiResponse(
                                        HTTP_STATUS.ACCEPTED,
                                        `USER CONTROLLER, LOGIN, User {${userInstance._id}: ${userInstance.userName}} logged in successfully.`,
                                        {
                                                user: userInstance,
                                                accessToken,
                                                refreshToken,
                                        }
                                )
                        );
        } catch (error) {
                throw new ApiError(
                        error.status || HTTP_STATUS.UNAUTHORIZED,
                        error.message ||
                                "USER CONTROLLER, REFACC TOKEN, CATCH, Invalid token provided.",
                        [error.message],
                        error.stack
                );
        }
});

const changeCurrentPassword = asyncHandler(async (req, res) => {
        try {
                const { currPass, newPass } = req.body;

                const userInstance = await User.findById(req.user?._id).select(
                        "+password +refreshToken"
                );
                if (!userInstance) {
                        throw new ApiError(
                                HTTP_STATUS.UNAUTHORIZED,
                                "USER CONTROLLER, CHANGE CURR PASS, User details INVALID."
                        );
                }

                const isPassCorrect =
                        await userInstance.comparePassword(currPass);
                if (!isPassCorrect) {
                        throw new ApiError(
                                HTTP_STATUS.UNAUTHORIZED,
                                "USER CONTROLLER, CHANGE CURR PASS, INVALID current password."
                        );
                }

                userInstance.password = newPass;
                await userInstance.save({ validateBeforeSave: false });

                res.status(HTTP_STATUS.OK).json(
                        new ApiResponse(
                                HTTP_STATUS.OK,
                                `USER CONTROLLER, CHANG CURR PASS, User ${userInstance.userName} password updated successfully.`
                        )
                );
        } catch (error) {
                throw new ApiError(
                        error.status || HTTP_STATUS.INTERNAL_SERVER_ERROR,
                        error.message ||
                                "USER CONTROLLER, CHANGE CURR PASS, CATCH, An error occurred while changing the user password.",
                        [error.message],
                        error.stack
                );
        }
});

const getCurrentUser = asyncHandler(async (req, res) => {
        try {
                res.status(HTTP_STATUS.OK).json(
                        new ApiResponse(
                                HTTP_STATUS.OK,
                                `USER CONTROLLER, GET CURR USER, User ${req.user.userName} fetched successfully.`,
                                req.user
                        )
                );
        } catch (error) {
                throw new ApiError(
                        error.status || HTTP_STATUS.INTERNAL_SERVER_ERROR,
                        error.message ||
                                "USER CONTROLLER, GET CURR USER, CATCH, An error occurred while fetching the user.",
                        [error.message],
                        error.stack
                );
        }
});

const updateAccountDetails = asyncHandler(async (req, res) => {
        try {
                const { email, fullName } = req.body;
                if (!fullName && !email) {
                        throw new ApiError(
                                HTTP_STATUS.NO_CONTENT,
                                "USER CONTROLLER, UPD USR DETAILS, updation fields required."
                        );
                }

                const updatedUser = await User.findByIdAndUpdate(
                        req.user?._id,
                        { $set: { fullName, email } },
                        { new: true }
                );

                res.status(HTTP_STATUS.OK).json(
                        new ApiResponse(
                                HTTP_STATUS.OK,
                                `USER CONTROLLER, UPD USR DETAILS, User ${updatedUser.userName} updated successfully.`,
                                updatedUser
                        )
                );
        } catch (error) {
                throw new ApiError(
                        error.status || HTTP_STATUS.INTERNAL_SERVER_ERROR,
                        error.message ||
                                "USER CONTROLLER, UPD USR DETAILS, CATCH, An error occurred while updating user details.",
                        [error.message],
                        error.stack
                );
        }
});

const updateAvatar = asyncHandler(async (req, res) => {
        try {
                const avatarLocalPath = req.file?.path || null;
                if (!avatarLocalPath) {
                        throw new ApiError(
                                HTTP_STATUS.NO_CONTENT,
                                "USER CONTROLLER, UPD AVATAR, updation field required."
                        );
                }

                const avatar = await uploadOnCloud(avatarLocalPath);
                if (!avatar) {
                        throw new ApiError(
                                HTTP_STATUS.BAD_REQUEST,
                                "USER CONTROLLER, UPD AVATAR, Avatar did't get upload to Cloudinary."
                        );
                }

                const userInstance = await User.findById(req.user?._id);
                if (!userInstance) {
                        throw new ApiError(
                                HTTP_STATUS.UNAUTHORIZED,
                                "USER CONTROLLER, UPD AVATAR, User details INVALID."
                        );
                }

                const oldAvatarURL = userInstance.avatar;
                if (!oldAvatarURL) {
                        console.error(
                                "USER CONTROLLER, UPD AVATAR,",
                                "Old Avatar URL not found."
                        );
                }

                // Updating the new Avatar Cloudinary URL into DB.
                userInstance.avatar = avatar;
                await userInstance.save({ validateBeforeSave: false });

                // Deleting Old Avatar from Cloudinary.
                await deleteFromCloud(oldAvatarURL);

                const updatedUser = await User.findById(userInstance._id);
                if (!updatedUser) {
                        throw new ApiError(
                                HTTP_STATUS.INTERNAL_SERVER_ERROR,
                                "USER CONTROLLER, UPD AVATAR, Updated user not found."
                        );
                }

                res.status(HTTP_STATUS.OK).json(
                        new ApiResponse(
                                HTTP_STATUS.OK,
                                `USER CONTROLLER, UPD AVATAR, User ${updatedUser.userName} Avatar updated successfully.`,
                                updatedUser
                        )
                );
        } catch (error) {
                throw new ApiError(
                        error.status || HTTP_STATUS.INTERNAL_SERVER_ERROR,
                        error.message ||
                                "USER CONTROLLER, UPD AVATAR, CATCH, An error occurred while updating Avatar.",
                        [error.message],
                        error.stack
                );
        }
});

const updateCoverImage = asyncHandler(async (req, res) => {
        try {
                const coverImgLocalPath = req.file?.path || null;
                if (!coverImgLocalPath) {
                        throw new ApiError(
                                HTTP_STATUS.NO_CONTENT,
                                "USER CONTROLLER, UPD COVER IMG, updation field required."
                        );
                }

                const coverImg = await uploadOnCloud(coverImgLocalPath);
                if (!coverImg) {
                        throw new ApiError(
                                HTTP_STATUS.BAD_REQUEST,
                                "USER CONTROLLER, UPD COVER IMG, Cover Image did't get upload to Cloudinary."
                        );
                }

                const userInstance = await User.findById(req.user?._id);
                if (!userInstance) {
                        throw new ApiError(
                                HTTP_STATUS.UNAUTHORIZED,
                                "USER CONTROLLER, UPD COVER IMG, User details INVALID."
                        );
                }

                const oldCoverImgURL = userInstance.coverImage;
                if (!oldCoverImgURL) {
                        console.error(
                                "USER CONTROLLER, UPD COVER IMG,",
                                "Old Cover Image URL not found."
                        );
                }

                // Updating the new Cover Image Cloudinary URL into DB.
                userInstance.coverImage = coverImg;
                await userInstance.save({ validateBeforeSave: false });

                // Deleting Old Cover image from Cloudinary.
                await deleteFromCloud(oldCoverImgURL);

                const updatedUser = await User.findById(userInstance._id);
                if (!updatedUser) {
                        throw new ApiError(
                                HTTP_STATUS.INTERNAL_SERVER_ERROR,
                                "USER CONTROLLER, UPD COVER IMG, Updated user not found."
                        );
                }

                res.status(HTTP_STATUS.OK).json(
                        new ApiResponse(
                                HTTP_STATUS.OK,
                                `USER CONTROLLER, UPD COVER IMG, User ${updatedUser.userName} Cover Image updated successfully.`,
                                updatedUser
                        )
                );
        } catch (error) {
                throw new ApiError(
                        error.status || HTTP_STATUS.INTERNAL_SERVER_ERROR,
                        error.message ||
                                "USER CONTROLLER, UPD COVER IMG, CATCH, An error occurred while updating Cover image.",
                        [error.message],
                        error.stack
                );
        }
});

export {
        loginUser,
        logoutUser,
        updateAvatar,
        registerUser,
        getCurrentUser,
        updateCoverImage,
        refreshAccessToken,
        updateAccountDetails,
        changeCurrentPassword,
};
