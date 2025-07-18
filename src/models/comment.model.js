import mongoose, { Schema } from "mongoose";

const commentSchema = new Schema(
        {
                content: {
                        type: String,
                        required: [true, "Comment content is required"],
                        minlength: [
                                1,
                                "Comment must be at least 1 character long",
                        ],
                        maxlength: [
                                500,
                                "Comment cannot exceed 500 characters",
                        ],
                },
                video: {
                        type: Schema.Types.ObjectId,
                        ref: "Video",
                },
                owner: {
                        type: Schema.Types.ObjectId,
                        ref: "User",
                        required: [true, "Comment owner is required"],
                },
        },
        {
                timestamps: true,
        }
);

export const Comment = mongoose.model("Comment", commentSchema);
