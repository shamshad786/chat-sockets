import mongoose,{ Schema, Types, model } from "mongoose";

const requestSchema = new Schema(
  {
     status:{
        type: String,
        default: "pending",
        enum:["pending", "accepted","rejected"]
     },
     sender: {
        type: Types.ObjectId,
        ref: "User",
        required: [true, "sender is required"],
      },
      receiver:{
        type: Types.ObjectId,
        ref: "User",
        required: [true, "sender is required"],
      }
  },
  { timestamps: true }
);

const Request = mongoose.models.Request || model("Request", requestSchema);

export default Request;
