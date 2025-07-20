import mongoose, { Schema } from "mongoose";

const subscriptionSchema = new Schema(
        {
                // One who is Subscribing
                subscriber: {
                        type: Schema.Types.ObjectId,
                        ref: "User",
                        required: [true, "Subscriber is required"],
                },
                // One to whome 'Subscriber' is Subscribing
                channel: {
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
