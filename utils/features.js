import jwt from 'jsonwebtoken'
import {v4 as uuid} from 'uuid'
import {v2 as cloudinary} from 'cloudinary'
import { getBase64, getSockets } from '../lib/helper.js';

const sendJwtToken = (userId) =>{
    return jwt.sign({ id: userId }, process.env.JWT_SECRET, {
        expiresIn: process.env.JWT_EXPIRES_IN,
      });
}

const cookieOptions = {
  maxAge: 15 * 24 * 60 * 60 * 1000,  // 15 days
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",  // Only secure in production (HTTPS)
  sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
  domain: process.env.NODE_ENV === "production" ? "https://infotechsol.vercel.app" : "localhost",  // Domain for cross-site cookies
  path: "/",  // Root path
};
// const cookieOptions = {
//   //15 days (15 * 24 * 60 * 60 * 1000 => day,hour,minute,second,millisecond)
//   maxAge: 15 * 24 * 60 * 60 * 1000,
//   sameSite: "none",
//   httpOnly: true,
//   secure: true,
// };

const emitEvent = (req,event,users,data) =>{

  console.log('Emmiting event: ', event)
  //!ye io humne app.js me set kiya hai fir req ke ander se hum usko use kar sakte hai
  const io = req.app.get("io")
  const userSocket = getSockets(users);
  io.to(userSocket).emit(event, data)
  
}


//upload profile image on cloudinary
const uploadFilesToCloudinary = async(files=[]) =>{
  const options = {
    resource_type: "auto", //"auto" isliye rakha hi kyu file audio, video, image kuch bhi ho sakta hai
    public_id: uuid()
  }

  const uploadPromises = files.map((file)=>{
    return new Promise((resolve, reject)=>{
      cloudinary.uploader.upload(getBase64(file), options, (error,result) =>{
        if(error) return reject(error)
          resolve(result)
      })
    })
  })

  try{
    const results = await Promise.all(uploadPromises)
    const formattedResults = results.map((result)=>({
      public_id: result.public_id,
      url: result.secure_url
    }))

    return formattedResults
  }catch(err){
    throw new Error('Error uploading files to cloudinary',err);
  }

}

//delete profile image on cloudinary
const deleteFilesFromCloudinary = async(public_id)=>{
  //
}

export {sendJwtToken,cookieOptions,emitEvent,deleteFilesFromCloudinary,uploadFilesToCloudinary}