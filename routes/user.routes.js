import {Router} from 'express'
const router = Router()
import {newUser,login,getMyProfile,logout,searchUser, sendFriendRequest, acceptFriendRequest, getAllNotifications, getMyFriends} from '../controllers/user.controller.js'
import {singleAvatar,} from '../middlewares/multer.middleware.js'
import { isAuthenticated, isAuthorized } from '../middlewares/protect.js'
import { loginValidator, validateHandler, registerValidator, sendRequestValidator, acceptRequestValidator } from '../lib/express.validator.js'
 
router.post('/newuser', singleAvatar, registerValidator(), validateHandler, newUser)
router.post('/login', loginValidator(), validateHandler, login)
 
//!only login users use these routes
router.use(isAuthenticated)
router.use(isAuthorized('user'))
router.get('/getprofile', getMyProfile)
router.get('/logout',  logout)
router.get('/search',searchUser)

router.put('/sendrequest', sendRequestValidator(), validateHandler,  sendFriendRequest)
router.put('/acceptrequest', acceptRequestValidator(), validateHandler,  acceptFriendRequest)

router.get('/notifications' ,getAllNotifications)

//my accepted friends
router.get('/myfriends', getMyFriends)

export default router 