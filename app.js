import dotenv from "dotenv";
dotenv.config();
import express from "express";
import morgan from "morgan";
import cors from "cors";
import AppError from "./utils/appError.js";
import errorController from "./controllers/errorController.js";
const app = express();
const port = process.env.PORT || 8000;
import connnection from "./utils/database.connection.js";
import cookieParser from "cookie-parser";
import { Server } from "socket.io";
import { createServer } from "http";
import { v4 as uuid } from "uuid";
import helmet from "helmet";

//!routes
import userRoute from "./routes/user.routes.js";
import chatRoute from "./routes/chat.routes.js";
import adminRoute from "./routes/admin.routes.js";
import { ALERT, NEW_MESSAGE, NEW_MESSAGE_ALERT, START_TYPING, STOP_TYPING,ONLINE,OFFLINE, ONLINE_USERS } from "./constants/events.js";
import { getSockets } from "./lib/helper.js";
import Message from "./models/message.model.js";
import { v2 as cloudinary } from "cloudinary";
import { corsOptions } from "./constants/config.js";
import { socketAuthenticator } from "./middlewares/protect.js";

connnection();

//configure cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET_KEY,
});

app.use(
  cors(corsOptions)
);
app.options("*", cors());

app.use(helmet());
//hanling json data
app.use(express.json());
///handling form data (agar multer use karenge image handling ke liye 'express.urlencoded()' to iski jarurat nahi hai)
//app.use(express.urlencoded())

const server = createServer(app);

const io = new Server(server, {
  // pingTimeout: 60000,
  // pingInterval: 25000,
  cors: corsOptions
});
//! yaha hum io ke instance ko set kar rahe hai usko baar hum io ko kahi bhi use kar sakte hai get kar ke eg: req.app.get("io")
app.set("io", io)

app.use(cookieParser());

//development log
console.log(`This Project Runs in____${process.env.NODE_ENV}____mode`);
if (process.env.NODE_ENV === "development") {
  app.use(morgan("dev"));
}

//!seeders

//! Routes
app.use("/api/v1/users", userRoute);
app.use("/api/v1/chats", chatRoute);
app.use("/api/v1/admin", adminRoute);

app.all("*", (req, res, next) => {
  if (req.originalUrl === "/") return res.send("api running !! ✅");
  next(new AppError(`Error: ${req.originalUrl} is not found`, 404));
});

//!socket.io section
//socket middleware

//ye only authenticated users ko socket se  connect karne ke liye socket ka middleware  hai,
io.use((socket, next) => {
  cookieParser()(socket.request, socket.request.res, async(err)=>{
    await socketAuthenticator(err, socket,next)
  })
});

export const userSocketIDs = new Map();

const onlineUsers = new Set();

const onlineUsersArray =[]

io.on("connection", (socket) => {
  const user = socket.user
  
  userSocketIDs.set(user._id.toString(), socket.id);
  //console.log(user.name,'Connected');

  //! when user come online
  socket.on(ONLINE,({userId, members})=>{
    console.log('chat joined', userId)
    onlineUsers.add(userId.toString())
    const membersSocket = getSockets(members)
    io.to(membersSocket).emit(ONLINE_USERS, Array.from(onlineUsers))
  })

  //! when user offline
  socket.on(OFFLINE, ({userId,members})=>{
    console.log('chat leave', userId)
    onlineUsers.delete(userId.toString())
    const membersSocket = getSockets(members)
    io.to(membersSocket).emit(ONLINE_USERS, Array.from(onlineUsers))
  })
  //onlineUsersArray.push(user._id.toString())
  //socket.broadcast.emit(ONLINE, onlineUsersArray);
  // socket.on(ONLINE, (user) => {
  //   console.log(`${user.name} is online`);
  //   socket.broadcast.emit(ONLINE, { userId: user._id, userName: user.name });
  // });

  //!send message
  socket.on(NEW_MESSAGE, async ({ chatId, members, msg }) => {
    //ye event hai msg ka real time ke liye
    const messageForRealTime = {
      content: msg,
      _id: uuid(),
      sender: {
        _id: user._id,
        name: user.name,
      },
      chat: chatId,
      createdAt: new Date().toISOString(),
    };


    //ye event hai database se ke liye
    const messageForDB = {
      content: msg,
      chat: chatId,
      sender: user._id,
    };

    const membersSocket = getSockets(members);


    // console.log('Emmetting...', messageForRealTime)

    io.to(membersSocket).emit(NEW_MESSAGE, {
      chatId,
      message: messageForRealTime,
    });
    //!for alert user message counts
    io.to(membersSocket).emit(NEW_MESSAGE_ALERT, { chatId });
    //save in database
    try {
      await Message.create(messageForDB);
    } catch (err) {
      console.log(err);
    }
  });

  //! show typing when other member start typing
  socket.on(START_TYPING, ({members, chatId})=>{
  
    const membersSocket = getSockets(members)

    //send back to client
    socket.to(membersSocket).emit(START_TYPING, {chatId});

  })

  //! stop typing when other member stop typing
  socket.on(STOP_TYPING, ({members, chatId})=>{
  
    const membersSocket = getSockets(members)

    //send back to client
    socket.to(membersSocket).emit(STOP_TYPING, {chatId});
  })


  socket.on("disconnect", () => {
    const user = socket.user
    console.log(user.name, "disconnected");
    userSocketIDs.delete(user._id.toString());

    //! emit when user go offline
    onlineUsers.delete(user._id.toString())
    socket.broadcast.emit(ONLINE_USERS, Array.from(onlineUsers))
    //socket.broadcast.emit(OFFLINE, { userId: user._id, userName: user.name });
  });
});

app.use(errorController);

server.listen(port, () => {
  console.log(`Server Running on ${port}`);
});
