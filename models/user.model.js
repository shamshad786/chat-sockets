import mongoose,{Schema, model} from 'mongoose'
import bcrypt from 'bcrypt'

const userSchema = new Schema({

    name: {
        type: String,
        required:[true, 'name required']
    },
    username:{
        type: String,
        required: [true, 'username required'],
        unique: true
    },
    bio:{
        type: String,
        required: [true, 'bio required'],
    },
    password: {
        type: String,
        required: [true, 'password required'],
        select: false
    },
    avatar:{
        public_id:{
            type: String,
            required: true
        },
        url:{
            type: String,
            required: true
        }
    },
    role:{
        type: String,
        default: 'user'
    }


},{timestamps: true})


//encrypt password
userSchema.pre('save', async function(next){
    try {
        if (!this.isModified("password")) {
          return next();
        }
        const hashedPassword = await bcrypt.hash(this.password, 10);
        this.password = hashedPassword;
        next();
      } catch (error) {
        next(error);
      }
})

//decrypt password
userSchema.methods.correctPassword = async function(password, userPassword) {
    return await bcrypt.compare(password,userPassword);
}


const User = mongoose.models.User || model('User', userSchema)
export default User