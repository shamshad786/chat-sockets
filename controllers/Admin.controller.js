import httpStatus from "http-status";
import AppError from "../utils/appError.js";
import catchAsync from "../utils/catchAsync.js";
import User from "../models/user.model.js";
import Chat from "../models/chat.model.js";
import Message from "../models/message.model.js";
import jwt from "jsonwebtoken";
import { cookieOptions } from "../utils/features.js";

class AdminController {
  adminLogin = catchAsync(async (req, res, next) => {
    const { secretKey } = req.body;
    const adminSecretKey = process.env.ADMIN_SECRET_KEY || 'admin32712313';

    const isMatched = secretKey === adminSecretKey;
    if (!isMatched)
      return next(new AppError("Invalid secret key", httpStatus.UNAUTHORIZED));

    const token = jwt.sign(secretKey, process.env.JWT_SECRET);

    return res
      .status(httpStatus.OK)
      .cookie("chatapp-admin-token", token, {
        ...cookieOptions,
        maxAge: 1000 * 60 * 15,//15 mint baad apne aap logout ho jayega
      }).json({
        status: 'success',
        message: 'Authenticated admin successfully'
      });
  });

   adminLogout = catchAsync(async (req, res, next) => {
    return res
    .status(httpStatus.OK)
    .cookie("chatapp-admin-token", "", {
      ...cookieOptions,
      maxAge: 0,
    }).json({
      status: 'success',
      message: 'Logout admin successfully'
    });
   })

   getAdminData = catchAsync(async (req, res, next) => {
        return res.status(httpStatus.OK).json({
          status: 'success',
            admin: true
        })
   })

  getAllUsers = catchAsync(async (req, res, next) => {
    const users = await User.find({});

    const transformedUsers = await Promise.all(
      users.map(async ({ name, username, avatar, _id }) => {
        const [groups, friends] = await Promise.all([
          //find groups
          Chat.countDocuments({ groupChat: true, members: _id }),

          //find singular friends
          Chat.countDocuments({ groupChat: false, members: _id }),
        ]);

        return {
          name,
          username,
          avatar: avatar.url,
          _id,
          groups,
          friends,
        };
      })
    );

    return res.status(httpStatus.OK).json({
      total: users.length,
      status: "success",
      users: transformedUsers,
    });
  });

  getAllChats = catchAsync(async (req, res, next) => {
    const chats = await Chat.find({})
      .populate("members", "name avatar")
      .populate("creator", "name avatar");

    const transformedChats = await Promise.all(
      chats.map(async ({ _id, members, groupChat, name, creator }) => {
        const totalMessages = await Message.countDocuments({ chat: _id });
        return {
          _id,
          groupChat,
          name,
          avatar: members.slice(0, 3).map((member) => member.avatar.url),
          members: members.map(({ _id, name, avatar }) => ({
            _id,
            name,
            avatar: avatar.url,
          })),
          creator: {
            name: creator?.name || "None",
            avatar: creator?.avatar.url || "",
          },
          totalMembers: members.length,
          totalMessages,
        };
      })
    );

    return res.status(httpStatus.OK).json({
      status: "success",
      message: "total chats & messages",
      chats: transformedChats,
    });
  });

  getAllMessages = catchAsync(async (req, res, next) => {
    const messages = await Message.find({})
      .populate("sender", "name avatar")
      .populate("chat", "groupChat");

    const transformedMessages = messages.map(
      ({ content, attachments, _id, sender, createdAt, chat }) => ({
        content,
        attachments,
        _id,
        createdAt,
        chat: chat._id,
        groupChat: chat.groupChat,
        sender: {
          _id: sender._id,
          name: sender.name,
          avatar: sender.avatar.url,
        },
      })
    );

    return res.status(httpStatus.OK).json({
      status: "success",
      message: "All messages",
      messages: transformedMessages,
    });
  });

  getDashboardStats = catchAsync(async (req, res, next) => {
    const [groupsCount, userCount, messageCount, totalChatsCount] =
      await Promise.all([
        Chat.countDocuments({ groupChat: true }),
        User.countDocuments(),
        Message.countDocuments(),
        Chat.countDocuments(),
      ]);

    const today = new Date();
    const last7Days = new Date();
    last7Days.setDate(last7Days.getDate() - 7);

    const last7DaysMessages = await Message.find({
      createdAt: {
        $gte: last7Days,
        $lte: today,
      },
    }).select("createdAt");

    const messages = new Array(7).fill(0);
    const daysInMiliseconds = 1000 * 60 * 60 * 24;

    last7DaysMessages.forEach((message) => {
      const indexApprox =
        (today.getTime() - message.createdAt.getTime()) / daysInMiliseconds;

      const index = Math.floor(indexApprox);

      messages[6 - index]++;
    });

    const stats = {
      groupsCount,
      userCount,
      messageCount,
      totalChatsCount,
      messages,
    };

    return res.status(httpStatus.OK).json({
      status: "success",
      stats,
    });
  });
}

export default new AdminController();
