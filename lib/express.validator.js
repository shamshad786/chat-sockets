import { body, param, validationResult } from "express-validator";
import httpStatus from "http-status";
import AppError from "../utils/appError.js";


//TODO: ye error middleware hai jo express validator ke message ko error response me send karega
const validateHandler = (req, res, next) => {
  const errors = validationResult(req);
  const errorMessages = errors
    .array()
    .map((err) => err.msg)
    .join(", ");
  if (errors.isEmpty()) return next();
  else next(new AppError(errorMessages, httpStatus.BAD_REQUEST));
};


//! new user register validator
const registerValidator = () => [
  //? hum ek baar me saare field aise validate kar sakte hai
  // body(["name","username","password","bio"]).notEmpty()

  //? aur hum har ek field ko validate ke sath message bhi de sakte hai
  body("name", "Please enter your name").notEmpty(),
  body("username", "Please enter username").notEmpty(),
  body("password", "Please enter password").notEmpty(),
  body("bio", "Please enter bio").notEmpty(),
 
];

//!login user validator
const loginValidator = () => [
  body("username", "Please enter username").notEmpty(),
  body("password", "Please enter password").notEmpty(),
];

//! new Group validator
const newGroupChatValidator = () => [
  body("name", "Please enter group name").notEmpty(),
  body("members").notEmpty().withMessage("Please enter members").isArray({min: 2, max: 100}).withMessage("Members should be between 2 to 100"),
];

//! add Members validator
const addMembersValidator = () => [
  body("chatId", "Please enter chat id").notEmpty(),
  body("members").notEmpty().withMessage("Please enter members").isArray({min: 1, max: 97}).withMessage("Members should be between 1 to 97"),
];
//! remove Members validator
const removeMembersValidator = () => [
  body("userId", "Please enter user id").notEmpty(),
  body("chatId", "Please enter chat id").notEmpty()

];

//! leave group validator
const leaveGroupValidator = () =>[
  param("id", "Please enter param id").notEmpty()
]

//!send attachment validator
const sendAttachmentValidator = () => [
  body("chatId", "Please enter chat id").notEmpty(),

]

//! get message  validator
const getMessageValidator = () =>[
  param("id", "Please enter param chat id").notEmpty()
]

//! get chat details  validator
const getChatDetailValidator = () =>[
  param("id", "Please enter param chat id").notEmpty()
]

//! rename group validator
const renameGroupValidator = () =>[
  param("id", "Please enter param chat id").notEmpty(),
  body("name", "Please enter group name").notEmpty()
]

//! delete chat validator
const deleteChatValidator = () =>[
  param("id", "Please enter param chat id").notEmpty()
]


//! send friend request validator
const sendRequestValidator = () => [
  body("receiverId", "Please enter receiver Id").notEmpty()
]

//! accept friend request validator
const acceptRequestValidator = () => [
  body("requestId", "Please enter request Id").notEmpty(),
  body("accept").notEmpty().withMessage("Please add accept").isBoolean().withMessage("Accept must be a boolean")
]

//! admin authenticated validator
const adminAuthenticatedValidatot = () => [
  body("secretKey", "Please provide admin secret key").notEmpty()
]

export {
  acceptRequestValidator, addMembersValidator, adminAuthenticatedValidatot, deleteChatValidator, getChatDetailValidator, getMessageValidator, leaveGroupValidator, loginValidator,
  newGroupChatValidator, registerValidator, removeMembersValidator, renameGroupValidator, sendAttachmentValidator, sendRequestValidator, validateHandler
};

