import User from "../models/user.model.js";
import Chat from "../models/chat.model.js";
import Request from "../models/request.model.js";
import catchAsync from "../utils/catchAsync.js";
import AppError from "../utils/appError.js";
import httpStatus from "http-status";
import { cookieOptions, emitEvent, sendJwtToken, uploadFilesToCloudinary } from "../utils/features.js";
import { NEW_REQUEST, REFETCH_CHATS } from "../constants/events.js";
import { getOtherMember } from "../lib/helper.js";

//create a new user and save it to the database and save cookie
const newUser = catchAsync(async (req, res, next) => {
  console.log(req.body)
  const { name, username, password, bio } = req.body;
  
  if(!req.file) return next(new AppError('Please upload avatar',httpStatus.BAD_REQUEST))
    
    const file =  req.file

    //upload image on cloudinary
    const result = await uploadFilesToCloudinary([file])

    console.log(result)

  const avatar = {
    public_id: result[0].public_id,
    url: result[0].url, 
  };

  const existingUser = await User.findOne({ username: username });

  if (existingUser)
    return next(
      new AppError("User already registered", httpStatus.BAD_REQUEST)
    );

  const user = await User.create({
    name,
    username,
    bio,
    password,
    avatar,
  });

  if (!user)
    return next(
      new AppError("user not created", httpStatus.INTERNAL_SERVER_ERROR)
    );
  const jwtToken = sendJwtToken(user._id);
  return res
    .status(httpStatus.CREATED)
    .cookie("chatapp-token", jwtToken, cookieOptions)
    .json({
      status: "success",
      jwtToken,
      message: `Welcome, ${name}`,
      user: user,
    });
});

const login = catchAsync(async (req, res, next) => {
  const { username, password } = req.body;
  if (!username || !password)
    return next(new AppError("Provide credentials", httpStatus.BAD_REQUEST));

  const user = await User.findOne({ username }).select("+password");

  if (!user)
    return next(
      new AppError("Provide valid credentials", httpStatus.BAD_REQUEST)
    );

  if (!user || !(await user.correctPassword(password, user.password))) {
    return next(new AppError("invalid credentials", httpStatus.NOT_FOUND));
  }
  const jwtToken = sendJwtToken(user._id);
  user.password = undefined;
  return res
    .status(httpStatus.OK)
    .cookie("chatapp-token", jwtToken, cookieOptions)
    .json({
      status: "success",
      jwtToken,
      message: `Welcome Back, ${user.name}`,
      user: user,
    });
});

const logout = catchAsync(async (req, res, next) => {
  return res
    .status(httpStatus.OK)
    .cookie("chatapp-token", "", { ...cookieOptions, maxAge: 0 })
    .json({
      status: "success",
      message: "logout successfully",
    });
});

const getMyProfile = catchAsync(async (req, res, next) => {
  //const user = req.currentUser;

  const user = await User.findById(req.currentUser._id)
  if(!user) return next(AppError('User not found', httpStatus.NOT_FOUND))

  return res.status(httpStatus.OK).json({
    message: "my profile",
    user,
  });
});

const searchUser = catchAsync(async (req, res, next) => {
  const { name = "" } = req.query;
  //console.log(req.currentUser._id)
  const myChats = await Chat.find({
    groupChat: false,
    members: req.currentUser._id,
  });

  //ye saare wo log hai jinke sath meri chat hai
  const allUsersFromMyChats = myChats.flatMap((chat) => chat.members);

  //ye uper jo id list nikal hai humne jinke sath meri chat hai unko chhod ke baki dusre users ko search kar lega
  const allUsersExceptMeAndFriends = await User.find({
    _id: { $nin: allUsersFromMyChats },
    name: { $regex: name, $options: "i" },
  });

  const users = allUsersExceptMeAndFriends.map(({ _id, name, avatar }) => ({
    _id,
    name,
    avatar: avatar.url,
  }));

  return res.status(httpStatus.OK).json({
    total: myChats.length,
    status: "success",
    message: "user",
    users,
  });
});

const sendFriendRequest = catchAsync(async (req, res, next) => {
  const { receiverId } = req.body;
  const request = await Request.findOne({
    $or: [
      { sender: req.currentUser._id, receiver: receiverId },
      { sender: receiverId, receiver: req.currentUser._id },
    ],
  });

  if (request)
    return next(new AppError("Request already sent", httpStatus.BAD_REQUEST));

  await Request.create({
    sender: req.currentUser._id,
    receiver: receiverId,
  });

  emitEvent(req, NEW_REQUEST, [receiverId]);

  return res.status(httpStatus.OK).json({
    status: "success",
    message: "Friend request sent",
  });
});

const acceptFriendRequest = catchAsync(async (req, res, next) => {
  const { requestId, accept } = req.body;

  const request = await Request.findById(requestId)
    .populate("sender", "name")
    .populate("receiver", "name");

  if (!request)
    return next(new AppError("Request not found", httpStatus.NOT_FOUND));

  if (request.receiver._id.toString() !== req.currentUser._id.toString())
    return next(
      new AppError(
        "You are not authorized to accept this request",
        httpStatus.FORBIDDEN
      )
    );

  if (!accept) {
    await request.deleteOne();
    return res.status(httpStatus.OK).json({
      status: "success",
      message: "Friend request rejected",
    });
  }

  const members = [request.sender._id, request.receiver._id];

  await Promise.all([
    Chat.create({
      members,
      name: `${request.sender.name}-${request.receiver.name}`,
    }),
    request.deleteOne(),
  ]);

  emitEvent(req, REFETCH_CHATS, members);

  return res.status(httpStatus.OK).json({
    status: "success",
    message: "Friend request accepted",
    senderId: request.sender._id,
  });
});

const getAllNotifications = catchAsync(async (req, res, next) => {
  const request = await Request.find({
    receiver: req.currentUser._id,
  }).populate("sender", "name avatar");

  //if(!request || request.length === 0) return next(new AppError('No notifications', httpStatus.NOT_FOUND))

  const allRequest = request.map(({ _id, sender }) => ({
    _id,
    sender: {
      _id: sender._id,
      name: sender.name,
      avatar: sender.avatar.url,
    },
  }));

  return res.status(httpStatus.OK).json({
    success: true,
    requests: allRequest,
  });
});

//get my accepted friends
const getMyFriends = catchAsync(async (req, res, next) => {
  const chatId = req.query.chatid;

  const chats = await Chat.find({
    members: req.currentUser._id,
    groupChat: false,
  }).populate("members", "name avatar");

  const friends = chats.map(({ members }) => {
    const otherUsers = getOtherMember(members, req.currentUser._id);

    return {
      _id: otherUsers._id,
      name: otherUsers.name,
      avatar: otherUsers.avatar.url,
    };
  });

  //ye group me add karne ke liye friends hai agar group me already hue to show nahi honge
  if (chatId) {
    const chat = await Chat.findById(chatId);
    const availableFriends = friends.filter(
      (friend) => !chat.members.includes(friend._id)
    );
    return res.status(httpStatus.OK).json({
      status: "success",
      message: "Available friends",
      availableFriends,
    });
  } else {
    return res.status(httpStatus.OK).json({
      status: "success",
      message: "My accepted friend members",
      friends,
    });
  }
});

export {
  newUser,
  login,
  getMyProfile,
  logout,
  searchUser,
  sendFriendRequest,
  acceptFriendRequest,
  getAllNotifications,
  getMyFriends,
};

//5:03:32
