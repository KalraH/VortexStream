import ApiError from "../utils/ApiError.js";
import { HTTP_STATUS } from "../constants.js";
import { User } from "../models/user.model.js";
import ApiResponse from "../utils/ApiResponse.js";
import asyncHandler from "../utils/asyncHandler.js";
import uploadOnCloudinary from "../utils/cloudinary.js";

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
		                        "USER CONTROLLER, All fields are required."
		                );
		        }
		
		        const existingUser = await User.findOne({
		                $or: [{ userName }, { email }],
		        });
		
		        if (existingUser) {
		                throw new ApiError(
		                        HTTP_STATUS.CONFLICT,
		                        "USER CONTROLLER, User with this email already exists."
		                );
		        }
		
		        // console.log("USER CONTROLLER,", "TESTING LOGGING START --------------------------------------------------------------");
		        // console.log(existingUser);
		        // console.log("USER CONTROLLER,", "TESTING LOGGING END ----------------------------------------------------------------");
		
		        const avatarLocalPath = req.files?.avatar?.[0]?.path || null;
		        const coverImageLocalPath = req.files?.coverImage?.[0]?.path || null;
		
		        if (!avatarLocalPath) {
		                throw new ApiError(
		                        HTTP_STATUS.BAD_REQUEST,
		                        "USER CONTROLLER, Avatar file path is missing."
		                );
		        }
		
		        const avatar = await uploadOnCloudinary(avatarLocalPath);
		        const coverImage = await uploadOnCloudinary(coverImageLocalPath);
		
		        if (!avatar) {
		                throw new ApiError(
		                        HTTP_STATUS.BAD_REQUEST,
		                        "USER CONTROLLER, Avatar did't get upload to Cloudinary."
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
		                        "USER CONTROLLER, User Creation failed."
		                );
		        }
		
		        res.status(HTTP_STATUS.OK).json(
		                new ApiResponse(
		                        HTTP_STATUS.CREATED,
		                        `USER CONTROLLER, User {${createdUser._id}: ${createdUser.userName}} registered successfully.`,
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
			error.message || "USER CONTROLLER, An error occurred while registering the user."
		);
	}
});

export { registerUser };
