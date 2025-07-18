import mongoose, { Schema } from "mongoose";

const playlistSchema = new Schema(
        {
                name: {
                        type: String,
                        required: [true, "Playlist name is required"],
                        index: true,
                },
                description: {
                        type: String,
                        required: [true, "Playlist name is required"],
                },
                owner: {
                        type: Schema.Types.ObjectId,
                        ref: "User",
                        required: [true, "Playlist owner is required"],
                },
                videos: [
                        {
                                type: Schema.Types.ObjectId,
                                ref: "Video",
                                required: [
                                        true,
                                        "At least one video is required in the playlist",
                                ],
                        },
                ],
        },
        {
                timestamps: true,
        }
);

export const Playlist = mongoose.model("Playlist", playlistSchema);
