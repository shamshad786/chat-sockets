import mongoose, { Schema, Types, model } from "mongoose";

const messageSchema = new Schema(
  {
    content: {
      type: String,
    },
    attachments: [
      {
        public_id: {
          type: String,
          required: [true, "public id required"],
        },
        url: {
          type: String,
          required: true,
        },
      },
    ],
    sender: {
      type: Types.ObjectId,
      ref: "User",
      required: [true, "sender is required"],
    },
    chat: {
      type: Types.ObjectId,
      ref: "Chat",
      required: [true, "chat is required"],
    },
  },
  { timestamps: true }
);

const Message = mongoose.models.Message || model("Message", messageSchema);

export default Message;
