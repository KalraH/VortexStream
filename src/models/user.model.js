import JWT from "jsonwebtoken";
import bcryptjs from "bcryptjs";
import ApiError from "../utils/ApiError.js";
import mongoose, { Schema } from "mongoose";

const userSchema = new Schema(
        {
                userName: {
                        type: String,
                        required: [true, "User name is required"],
                        unique: [true, "User name must be unique"],
                        toLowerCase: true,
                        trim: true,
                        index: true,
                },
                email: {
                        type: String,
                        required: [true, "Email is required"],
                        unique: [true, "Email must be unique"],
                        lowercase: true,
                        trim: true,
                },
                password: {
                        type: String,
                        required: [true, "Password is required"],
                        minlength: [
                                6,
                                "Password must be at least 6 characters long",
                        ],
                },
                fullName: {
                        type: String,
                        required: [true, "Full name is required"],
                        trim: true,
                },
                avatar: {
                        type: String, // Cloudinary URL
                        required: [true, "Avatar is required"],
                },
                coverImage: {
                        type: String, // Cloudinary URL
                },
                watchHistory: [
                        {
                                type: Schema.Types.ObjectId,
                                ref: "Video",
                        },
                ],
                refereshToken: {
                        type: String,
                },
        },
        {
                timestamps: true,
        }
);

userSchema.pre("save", async function (next) {
        if (!this.isModified("password")) return next();

        try {
                const salt = await bcryptjs.genSalt(10);
                this.password = await bcryptjs.hash(this.password, salt);
                next();
        } catch (error) {
                next(error);
        }
});

userSchema.methods.comparePassword = async function (candidatePassword) {
        try {
                return await bcryptjs.compare(candidatePassword, this.password);
        } catch (error) {
                throw new ApiError(
                        500,
                        "USER MODEL, Password comparison failed",
                        [error.message],
                        error.stack
                );
        }
};

userSchema.methods.generateAccessToken = function () {
        try {
                return JWT.sign(
                        {
                                _id: this._id,
                                email: this.email,
                                userName: this.userName,
                                fullName: this.fullName,
                        },
                        process.env.ACCESS_TOKEN_SECRET,
                        { expiresIn: ACCESS_TOKEN__EXPIRATION }
                );
        } catch (error) {
                throw new ApiError(
                        500,
                        "USER MODEL, Access token generation failed",
                        [error.message],
                        error.stack
                );
        }
};

userSchema.methods.generateRefreshToken = function () {
        try {
                return JWT.sign(
                        { _id: this._id },
                        process.env.REFRESH_TOKEN_SECRET,
                        { expiresIn: REFRESH_TOKEN__EXPIRATION }
                );
        } catch (error) {
                throw new ApiError(
                        500,
                        "USER MODEL, Access token generation failed",
                        [error.message],
                        error.stack
                );
        }
};

export const User = mongoose.model("User", userSchema);
