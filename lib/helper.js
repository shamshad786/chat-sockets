import { userSocketIDs } from "../app.js"

export const getOtherMember =  (member, curUserId) =>{
    return member.find((member)=> member._id.toString() !== curUserId.toString())
}

export const getSockets = (users=[]) => {
    const sockets = users.map((user)=> userSocketIDs.get(user.toString()));
    return sockets
}

//conver image into base64
export const getBase64 = (file) =>{
    const convertedFile  = `data:${file.mimetype};base64,${file.buffer.toString('base64')}`
    return convertedFile
}