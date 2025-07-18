import mongoose, { Schema } from "mongoose";

const subscriptionSchema = new Schema(
        {
                subscriber: {
                        type: Schema.Types.ObjectId,
                        ref: "User",
                        required: [true, "Subscriber is required"],
                },
                subscribedTo: {
                        type: Schema.Types.ObjectId,
                        ref: "User",
                        required: [true, "Subscribed user is required"],
                },
        },
        {
                timestamps: true,
        }
);

export const Subscription = mongoose.model("Subscription", subscriptionSchema);
