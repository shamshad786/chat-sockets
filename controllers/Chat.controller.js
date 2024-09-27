import httpStatus from "http-status";
import AppError from "../utils/appError.js";
import catchAsync from "../utils/catchAsync.js";
import Chat from "../models/chat.model.js";
import Message from "../models/message.model.js";
import { deleteFilesFromCloudinary, emitEvent, uploadFilesToCloudinary } from "../utils/features.js";
import {
  ALERT,
  NEW_ATTACHMENT,
  NEW_MESSAGE,
  NEW_MESSAGE_ALERT,
  REFETCH_CHATS,
} from "../constants/events.js";
import { getOtherMember } from "../lib/helper.js";
import User from "../models/user.model.js";

class ChatController {
  newGroup = catchAsync(async (req, res, next) => {
    const { name, members } = req.body;
    if (members.length < 2)
      return next(
        new AppError(
          "Group chat must have at least 3 members",
          httpStatus.BAD_REQUEST
        )
      );
 
    const allMembers = [...members, req.currentUser._id];

    const createGroup = await Chat.create({
      name,
      groupChat: true,
      creator: req.currentUser._id,
      members: allMembers,
    });

    if (!createGroup)
      return next(
        new AppError(
          "Group not created something wrong",
          httpStatus.INTERNAL_SERVER_ERROR
        )
      );

    emitEvent(req, ALERT, allMembers, `Welcome to ${name} group chat`);
    emitEvent(req, REFETCH_CHATS, members);

    return res.status(httpStatus.CREATED).json({
      status: "success",
      message: "Group Created",
      group: createGroup,
    });
  });

  getMyChats = catchAsync(async (req, res, next) => {
    const chats = await Chat.find({ members: req.currentUser._id }).populate(
      "members",
      "name avatar username"
    );
    if (!chats || chats.length === 0) {
      return next(new AppError("Not chats found", httpStatus.NOT_FOUND));
    }

    //yaha group chat ka logo ke liye sirf 3 members ke dp ka url le rahe hai taki group ka logo dikha sake left side bar me, aur agar group nahi hua to, hum jis user se chat kar rahe us user ka left side bar me uska dp dikahyenge
    const transformedChats = chats.map(({ _id, name, members, groupChat }) => {

      const otherMember = getOtherMember(members, req.currentUser._id);
      return {
        _id,
        groupChat,
        avatar: groupChat
          ? members.slice(0, 3).map(({ avatar }) => avatar.url)
          : [otherMember.avatar.url],
        name: groupChat ? name : otherMember.name,
        //  members: members
        members: members.reduce((prev, curr) => {
          // yaha hum sirf member ki id le rahe hai
          if (curr._id.toString() !== req.currentUser._id.toString()) {
            prev.push(curr._id);
          }
          return prev;
        }, []),
      };
    });


    return res.status(httpStatus.OK).json({
      status: "success",
      message: "chats found",
      chats: transformedChats,
    });
  });

  getMyGroups = catchAsync(async (req, res, next) => {
    const chats = await Chat.find({
      members: req.currentUser._id, 
      groupChat: true,
      creator: req.currentUser._id,
    }).populate("members", "name avatar");

    if (!chats || chats.length === 0)
      return next(
        new AppError("You did not create any group yet", httpStatus.NOT_FOUND)
      );

    const transFormedGroups = chats.map(
      ({ members, _id, groupChat, name }) => ({
        _id,
        groupChat,
        name,
        avatar: members.slice(0, 3).map(({ avatar }) => avatar.url),
      })
    );

    return res.status(httpStatus.OK).json({
      status: "success",
      groups: transFormedGroups,
    });
  });

  //add member in group
  addMembers = catchAsync(async (req, res, next) => {
    const { chatId, members } = req.body;

    if (!members || members.length < 1) {
      return next(
        new AppError("Please provide members", httpStatus.BAD_REQUEST)
      );
    }

    const chat = await Chat.findById(chatId);

    if (!chat)
      return next(new AppError("Chat not found", httpStatus.NOT_FOUND));

    if (!chat.groupChat)
      return next(
        new AppError("This is not a group chat", httpStatus.BAD_REQUEST)
      );

    if (chat.creator.toString() !== req.currentUser._id.toString()) {
      return next(
        new AppError("You are not allowed to add members", httpStatus.FORBIDDEN)
      );
    }

    const allNewMembersPromise = members.map((member) => User.findById(member));
    const allNewMembers = await Promise.all(allNewMembersPromise);

    //add only new member and don't add already added member
    const uniqueMember = allNewMembers
      .filter((member) => !chat.members.includes(member._id.toString()))
      .map((member) => member._id);

    if (uniqueMember.length === 0)
      return next(
        new AppError("This member already added", httpStatus.BAD_REQUEST)
      );

    chat.members.push(...uniqueMember);

    if (chat.members.length > 100) {
      return next(
        new AppError("Group members limit reached", httpStatus.BAD_REQUEST)
      );
    }

    await chat.save();

    const allUserName = allNewMembers.map((member) => member.name).join(",");

    emitEvent(
      req,
      ALERT,
      chat.members,
      `${allUserName} has been added in the group`
    );
    emitEvent(req, REFETCH_CHATS, chat.members);

    return res.status(httpStatus.OK).json({
      status: "success",
      message: "Members added succefully",
    });
  });

  //delete memeber in group
  removeMembers = catchAsync(async (req, res, next) => {
    const { userId, chatId } = req.body;
    const [chat, userThatWillBeRemoved] = await Promise.all([
      Chat.findById(chatId),
      User.findById(userId, "name"),
    ]);
    if (!chat)
      return next(new AppError("Chat not found", httpStatus.NOT_FOUND));
    if (!chat.groupChat)
      return next(
        new AppError("This is not a group chat", httpStatus.BAD_REQUEST)
      );

    if (chat.creator.toString() !== req.currentUser._id.toString()) {
      return next(
        new AppError(
          "You are not allowed to remove members",
          httpStatus.FORBIDDEN
        )
      );
    }

    if (chat.members.length <= 3) {
      return next(
        new AppError(
          "Group must have at least 3 members",
          httpStatus.BAD_REQUEST
        )
      );
    }

    const allChatMembers = chat.members.map((id)=> id.toString())

    //remove memeber
    chat.members = chat.members.filter(
      (memberId) => memberId.toString() !== userId.toString()
    );

    await chat.save();
    emitEvent(
      req,
      ALERT,
      chat.members,
      {
        message:  `${userThatWillBeRemoved.name} has been removed from the group`,
        chatId
      }
    );
    emitEvent(req, REFETCH_CHATS, allChatMembers);
    return res.status(httpStatus.OK).json({
      status: "success",
      message: ` ${userThatWillBeRemoved.name} member remove successfully`,
    });
  });

  //members and admin leave group
    leaveGroup = catchAsync(async (req, res, next) => {
    const chatId = req.params.id;
    const chat = await Chat.findById(chatId);
    if (!chat)
      return next(new AppError("chat not found", httpStatus.NOT_FOUND));

    if (!chat.groupChat)
      return next(
        new AppError("This is not group chat", httpStatus.BAD_REQUEST)
      );

    //remaining member
    const remainingMembers = chat.members.filter(
      (member) => member.toString() !== req.currentUser._id.toString()
    );

    if (remainingMembers.length < 3) {
      return next(
        new AppError(
          "Group must have at least 3 members",
          httpStatus.BAD_REQUEST
        )
      );
    }

    //when creator leave group
    if (chat.creator.toString() === req.currentUser._id.toString()) {
      //assign admin to another member

      //!assign any random user as group admin
      //const randomElement = Math.floor(Math.random() * remainingMembers.length);
      //const newCreator = remainingMembers[randomElement]
      //!assign first array index as group admin
      const newCreator = remainingMembers[0];
      chat.creator = newCreator;
    }

    //memberleave Group
    chat.members = remainingMembers;
    await chat.save();

    emitEvent(
      req,
      ALERT,
      chat.members,
      {
        message: `User ${req.currentUser.name} has left the group`,
        chatId
      }
    );

    return res.status(httpStatus.OK).json({
      status: "success",
      message: "group leave successfully",
    });
  });

  //send attachmets file
  sendAttachments = catchAsync(async (req, res, next) => {
    const { chatId } = req.body;

    console.log("Chat Id ",chatId)

    const files = req.files || [];


    if(!files.length)  return next (new AppError('Please upload attachments', httpStatus.BAD_REQUEST))
      if(files.length > 5) return next(new AppError('Files can\'t be more than 5', httpStatus.BAD_REQUEST))

    const [chat, user] = await Promise.all([
      Chat.findById(chatId),
      User.findById(req.currentUser._id, "name"),
    ]);
    if (!chat) return next(new AppError("Chat not found", httpStatus.NOT_FOUND));

 

    if (files.length < 1)
      return next(
        new AppError("Please provide attachment", httpStatus.BAD_REQUEST)
      );

    //! cloudinary
    //if files exist upload on cloudinary
    const attachments = await uploadFilesToCloudinary(files)

    //for save in databse
    const messageForDB = {
      content: "",
      attachments,
      sender: user._id,
      chat: chatId,
    };

    //for socket.io
    const messageForRealTime = {
      ...messageForDB,
      sender: {
        _id: user._id,
        name: user.name
      },
     // chat: chatId,
    };

    const message = await Message.create(messageForDB);

    if (!message)
      return next(
        new AppError(
          "message not save something error",
          httpStatus.INTERNAL_SERVER_ERROR
        )
      );

    emitEvent(req, NEW_MESSAGE, chat.members, {
      message: messageForRealTime,
      chatId,
    });

    emitEvent(req, NEW_MESSAGE_ALERT, chat.members, { chatId });

    res.status(httpStatus.CREATED).json({
      status: "success",
      message: message,
    });
  });

  //get single chat details
  getChatDetails = catchAsync(async (req, res, next) => {
    console.log(req.query);
    if (req.query.populate === "true") {
      //console.log("req.query.populate", req.query.populate);
      const chat = await Chat.findById(req.params.id)
        .populate("members", "name avatar")
        .lean(); //! .lean() method tab lagate hai jab humne mongodb ke kisi object ko database me save kar ke change nahi karna ho tab, agar .lean() method nahi lagayenge to niche 'await Chat.save()' dena hoga lekin wo database me memebers ko change kar dega. humne database me kuch change nahi karna hai aur populate karna hai to '.lean()' method lagayenge ye method database ke object ko change nahi karne dega aur populate bhi kar dega
      if (!chat)
        return next(new AppError("chat not found", httpStatus.NOT_FOUND));
      chat.members = chat.members.map(({ _id, name, avatar }) => ({
        _id,
        name,
        avatar: avatar.url,
      }));
      res.status(httpStatus.OK).json({
        status: "success",
        chat: chat,
      });
    } else {
     // console.log("req.query.populate not exist");
      const chat = await Chat.findById(req.params.id);
      if (!chat)
        return next(new AppError("chat not found", httpStatus.NOT_FOUND));
      return res.status(httpStatus.OK).json({
        status: "success",
        chat: chat,
      });
    }
  });

  //get messages
  getMessages = catchAsync(async (req, res, next) => {
    const chatId = req.params.id;
    const { page = 1 } = req.query;

    const limit = 20;
    const skip = (page - 1) * limit;

    const chat  = await Chat.findById(chatId)
    if(!chat) return next(new AppError('chat not found', httpStatus.NOT_FOUND))
     
      //jab user ko group se nikal denge to wo url copy kar ke messages nahi padh payega
      if(!chat.members.includes(req.currentUser._id.toString())){
        return next(new AppError('you\'re not allowed to access this chat', httpStatus.FORBIDDEN))
      }

    const [messages, totalMessageCount] = await Promise.all([
      Message.find({ chat: chatId })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate("sender", "name avatar")
        .lean(),
      Message.countDocuments({ chat: chatId }),
    ]);

    const totalPages = Math.ceil(totalMessageCount / limit);

    return res.status(httpStatus.OK).json({
      totalPages,
      success: "success",
      messages: messages.reverse(),
    });
  });

  //rename group name
  renameGroup = catchAsync(async (req, res, next) => {
    const chatId = req.params.id;
    const { name } = req.body;

    const chat = await Chat.findById(chatId);
    if (!chat)
      return next(new AppError("This is not chat", httpStatus.NOT_FOUND));
    if (!chat.groupChat)
      return next(
        new AppError("This is not group chat", httpStatus.BAD_REQUEST)
      );

    //only group admin can rename group
    if (chat.creator.toString() !== req.currentUser._id.toString()) {
      return next(
        new AppError(
          "You are not allowed to rename the group",
          httpStatus.FORBIDDEN
        )
      );
    }

    chat.name = name;
    await chat.save();

    emitEvent(req, REFETCH_CHATS, chat.members);
    return res.status(httpStatus.CREATED).json({
      status: "success",
      message: `Group name updated to ${chat.name}`,
      groupName: chat.name
    });
  });

  //delete group chat
  deleteChat = catchAsync(async (req, res, next) => {
    const chatId = req.params.id;
    const chat = await Chat.findById(chatId);
    if (!chat)
      return next(new AppError("Chat not found!", httpStatus.NOT_FOUND));

    const members = chat.members;

    //only admin can delete the group
    if (
      chat.groupChat &&
      chat.creator.toString() !== req.currentUser._id.toString()
    ) {
      return next(
        new AppError(
          "only admin allowed to delete the group",
          httpStatus.FORBIDDEN
        )
      );
    }

    //member who not a part of group also can not delete the group
    if (
      !chat.getMyChats &&
      !chat.members.includes(req.currentUser._id.toString())
    ) {
      return next(
        new AppError(
          "You are not allowed to delete the chat",
          httpStatus.FORBIDDEN
        )
      );
    }

    //here we have to delete all messages as well as attachments or files from cloudinary
    const messageWithAttachments = await Message.find({
      chat: chatId,
      attachments: { $exists: true, $ne: [] },
    });

    //cloudinary attachment public id
    const public_ids = [];
    messageWithAttachments.forEach(({ attachments }) => {
      attachments.forEach(({ public_id }) => {
        public_ids.push(public_id);
      });
    });

    await Promise.all([
      deleteFilesFromCloudinary(public_ids),
      chat.deleteOne(),
      Message.deleteMany({ chat: chatId }),
    ]);

    emitEvent(req, REFETCH_CHATS, members);

    return res.status(httpStatus.OK).json({
      status: "success",
      message: "chat deleted successfully",
    });
  });
}

export default new ChatController();
