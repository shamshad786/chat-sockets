import mongoose from "mongoose";


const connnection = ()=> {
    mongoose.connect(process.env.MONGO_URI).then(() =>{
        console.log('Database connected ✅');
    }).catch((e)=>{
        console.log('Database connection failed ❌')
    });
}

export default connnection