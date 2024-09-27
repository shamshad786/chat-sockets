import multer from 'multer'

//default image buffer me save hoti hai
const multerUpload = multer({
    //5 mb
    limits: {
        fileSize: 1024 * 1024 * 5,
    }
})

const singleAvatar = multerUpload.single('avatar')

const attachmentsMulter = multerUpload.array('files',5)


export {singleAvatar,attachmentsMulter}