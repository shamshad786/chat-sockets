import httpStatus from "http-status";
import AppError from "../utils/appError.js";
import catchAsync from "../utils/catchAsync.js";
import jwt from "jsonwebtoken";
import util from "util";
import User from "../models/user.model.js";

const isAuthenticated = catchAsync(async (req, res, next) => {
  const token = req.cookies["chatapp-token"];
  if (!token)
    return next(new AppError("You are not logged in", httpStatus.FORBIDDEN));

  //const decodedData  = jwt.verify(token, process.env.JWT_SECRET)
  const decodedData = await util.promisify(jwt.verify)(
    token,
    process.env.JWT_SECRET
  );

  const currentUser = await User.findById(decodedData.id);
  if (!currentUser)
    return next(
      new AppError("This user not belong from this token", httpStatus.FORBIDDEN)
    );
  req.currentUser = currentUser;
  next();
});

const isAuthorized = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.currentUser.role)) {
      return next(
        new AppError(
          "You don't have permission to perform this action",
          httpStatus.FORBIDDEN
        )
      );
    }
    next();
  };
};

const onlyAdmin = catchAsync(async (req, res, next) => {
  const token = req.cookies["chatapp-admin-token"];

  if (!token)
    return next(
      new AppError("Only admin can access this route", httpStatus.UNAUTHORIZED)
    );
  const secretKey = jwt.verify(token, process.env.JWT_SECRET);
  const adminSecretKey = process.env.ADMIN_SECRET_KEY || "admin32712313";
  const isMatched = secretKey === adminSecretKey;
  if (!isMatched)
    return next(
      new AppError("Only admin can access this route", httpStatus.UNAUTHORIZED)
    );

  next();
});

//! sirf authenticated person connect honge socket se, ye socket.io ka middleware hai
const socketAuthenticator = async (err, socket, next) => {
  const chatAppToken = "chatapp-token";

  if (err) {
     throw new Error(err)
  }
  try {
    //ye cookies humne cookiParser packege ke wajah se milah hai humne hume app.js ke socket ke middleware me setup kiya h eg:  cookieParser()(socket.request, socket.request.res, async(err)=>{} ye diya hai to ye khud aa cookies get kar lega
    const authToken = socket.request.cookies[chatAppToken];

    if (!authToken)
      return next(
        new AppError(
          "Please login to connect with friends",
          httpStatus.BAD_REQUEST
        )
      );

    //decode jwt cookies
    const decodedData = await util.promisify(jwt.verify)(
      authToken,
      process.env.JWT_SECRET
    );
    const validUser = await User.findById(decodedData.id);
    if (!validUser) {
      return next(
        new AppError(
          "This user not belong from this socket token",
          httpStatus.FORBIDDEN
        )
      );
    }
    socket.user = validUser;
    return next();
  } catch (err) {
    console.log(err.message);
    return next(
      new AppError(
        err.message,
        httpStatus.BAD_REQUEST
      )
    );
  }
};

export { isAuthenticated, isAuthorized, onlyAdmin, socketAuthenticator };
