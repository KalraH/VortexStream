import mongoose, { Schema } from "mongoose";
import mongooseAggegatePaginate from "mongoose-aggregate-paginate-v2";

const videoSchema = new Schema(
        {
                videoFile: {
                        type: {
                                public_id: {
                                        type: String,
                                        required: [
                                                true,
                                                "Video File's Public ID is required",
                                        ],
                                },
                                secure_url: {
                                        type: String,
                                        required: [
                                                true,
                                                "Video File's Secured URL is required",
                                        ],
                                }, // Cloudinary URL
                        },
                        required: [true, "Video file is required"],
                },
                thumbnail: {
                        type: {
                                public_id: {
                                        type: String,
                                        required: [
                                                true,
                                                "Thumbnail Public ID is required",
                                        ],
                                },
                                secure_url: {
                                        type: String,
                                        required: [
                                                true,
                                                "Thumbnail Secured URL is required",
                                        ],
                                }, // Cloudinary URL
                        },
                        required: [true, "Thumbnail is required"],
                },
                title: {
                        type: String,
                        required: [true, "Title is required"],
                        minlength: [
                                3,
                                "Title must be at least 3 characters long",
                        ],
                },
                description: {
                        type: String,
                        required: [true, "Description is required"],
                        minlength: [
                                10,
                                "Description must be at least 10 characters long",
                        ],
                },
                owner: {
                        type: Schema.Types.ObjectId,
                        ref: "User",
                },
                duration: {
                        type: Number,
                        required: [true, "Duration is required"],
                        min: [0, "Duration cannot be negative"],
                },
                views: {
                        type: Number,
                        default: 0,
                },
                isPublished: {
                        type: Boolean,
                        default: false,
                },
        },
        {
                timestamps: true,
        }
);

// Add pagination plugin
videoSchema.plugin(mongooseAggegatePaginate);

export const Video = mongoose.model("Video", videoSchema);
