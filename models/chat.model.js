import mongoose, {Schema, Types, model} from 'mongoose'

const chatSchema = new Schema({

    name: {
        type: String,
        required:[true, 'name required']
    },
    groupChat:{
        type: Boolean,
       default: false
    },
    creator: {
        type: Types.ObjectId,
        ref: 'User'
    },
   members: [
    {
        type: Types.ObjectId,
        ref: 'User'
    }
   ]


},{timestamps: true})


const Chat = mongoose.models.Chat || model('Chat', chatSchema)


export default Chat