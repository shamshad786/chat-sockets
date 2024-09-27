//! this is our global error middleware handler
import AppError from "../utils/appError.js";

/*
//! Mongoose casting errors
const handleCastErrorDb = (err) => {
    const message = `Invalid  ${err.path} and ${err.value}.`
  //  console.log('aperrorMessage: ',message)
    return new AppError(message, 400);
}


//! Mongoose Dublicate Feilds Error
const handleDublicateMongoField = (err)=>{
    const value = err.message.match(/(["'])(?:(?=(\\?))\2.)*?\1/);
    const message =  `Dublicate Field Value: ${value} this field should be unique`

    return new AppError(message,400);
}

//! Mongoose Validation Error
const handleMongoDBValidationError = (err)=>{
    const errors  = Object.values(err.errors).map(el => el.message);
    const message =  `Invalid Input Data ${errors.join(', ')}`
    return new AppError(message,400);
}

const handleJwtTokenError = (err)=>{
    return new AppError('Invalid Token Log In Again', 401);
}

const handleExpireJwtToken = (err)=>{
    return new AppError('Token has been expire login again', 401);
}

const SendErrorDev = (err,res)=>{
    res.status(err.statusCode).json({
        status: err.status,
        error: err,
        message: err.message,
        stack: err.stack
    });
}

const SendErrorProd = (err,res)=>{
// operational trust error: send message to the client
//console.log(err.isOperational)
    if(err.isOperational){
       // console.log('pro isOperational: ',err.isOperational)
        res.status(err.statusCode).json({
            status: err.status,
            message: err.message
        })
    }else{
        // programming or other known error: dont leak error details
        console.error('Error: 🐡 ', err)
        //Send Generic Message
        res.status(500).json({
            status:'production error',
            message: 'Something went very wrong !',
            error: err
        })
    }
}

export default (err,req,res,next)=>{
    //console.log(err.stack)
    err.statusCode = err.statusCode || 500;
    err.status =  err.status || 'Global Error'
  
    if(process.env.NODE_ENV === 'development'){

        SendErrorDev(err,res)

    }else if(process.env.NODE_ENV === 'production'){ 

        let error =  { ...err };
        let erRes;

        if(err.name === 'CastError'){
            erRes =  handleCastErrorDb(err)
            SendErrorProd(erRes,res)
        }else if(err.code === 11000){
            erRes =  handleDublicateMongoField(err)
            SendErrorProd(erRes,res)
        }else if(err.name === 'ValidationError'){
            console.log(err.name)
            erRes =  handleMongoDBValidationError(err);
            SendErrorProd(erRes,res)
        } else if(err.name === 'JsonWebTokenError'){
               erRes =  handleJwtTokenError(err)     
               SendErrorProd(erRes,res)
        } else if(err.name === 'TokenExpiredError'){
            erRes = handleExpireJwtToken(err)
            SendErrorProd(erRes,res)
        }   else{
             SendErrorProd(error,res)
        }
    }  

}
*/



//! Mongoose casting errors
const handleCastErrorDb = (err) => {
    const message = `Invalid ${err.path}: ${err.value}.`;
    return new AppError(message, 400);
};

//! Mongoose Duplicate Fields Error
const handleDuplicateMongoField = (err) => {
    const value = err.message.match(/(["'])(?:(?=(\\?))\2.)*?\1/);
    const message = `Duplicate field value: ${value}. This field must be unique.`;
    return new AppError(message, 400);
};

//! Mongoose Validation Error
const handleMongoDBValidationError = (err) => {
    const errors = Object.values(err.errors).map(el => el.message);
    const message = `Invalid input data. ${errors.join(', ')}`;
    return new AppError(message, 400);
};

//! JWT token errors
const handleJwtTokenError = () => new AppError('Invalid token. Please log in again.', 401);
const handleExpireJwtToken = () => new AppError('Token has expired. Please log in again.', 401);

//! Error handling in development mode
const sendErrorDev = (err, res) => {
    res.status(err.statusCode).json({
        status: err.status,
        error: err,
        message: err.message,
        stack: err.stack
    });
};

//! Error handling in production mode
const sendErrorProd = (err, res) => {
    if (err.isOperational) {
        res.status(err.statusCode).json({
            status: err.status,
            message: err.message
        });
    } else {
        console.error('ERROR 💥', err);
        res.status(500).json({
            status: 'error',
            message: 'Something went very wrong!'
        });
    }
};

export default (err, req, res, next) => {
    err.statusCode = err.statusCode || 500;
    err.status = err.status || 'error';

    if (process.env.NODE_ENV === 'development') {
        sendErrorDev(err, res);
    } else if (process.env.NODE_ENV === 'production') {
        let error = { ...err };
        error.message = err.message;

        if (err.name === 'CastError') error = handleCastErrorDb(err);
        if (err.code === 11000) error = handleDuplicateMongoField(err);
        if (err.name === 'ValidationError') error = handleMongoDBValidationError(err);
        if (err.name === 'JsonWebTokenError') error = handleJwtTokenError();
        if (err.name === 'TokenExpiredError') error = handleExpireJwtToken();

        sendErrorProd(error, res);
    }
};