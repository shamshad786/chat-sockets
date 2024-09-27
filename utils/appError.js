class AppError extends Error {
    constructor(message, statusCode){
        super(message)// we call here parent class here is 'message'
        //so this is why we are not doing here this.message. so basically in here by doing this parent call we already set the message property to our incomming message 

        this.statusCode = statusCode;
        this.status = `${statusCode}`.startsWith('4') ? 'fail' : 'error'
        this.isOperational  = true; // we creating this property we know error code starts with 400,404,403 etc is operation error

        //for old error handling show message
        // Object.defineProperty(this, "message", {
        //     enumerable: true,
        //     value: message,
        //   });

        //stack trace implement 
        Error.captureStackTrace(this, this.constructor)

        console.log('message: ',message)
        console.log('statusCode', statusCode)
    }
}

export default AppError;