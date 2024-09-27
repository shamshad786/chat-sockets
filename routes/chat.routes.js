import {Router} from 'express'
import { isAuthenticated, isAuthorized } from '../middlewares/protect.js'
const router = Router()
import ChatController from '../controllers/Chat.controller.js'
import { attachmentsMulter } from '../middlewares/multer.middleware.js'
import { addMembersValidator, deleteChatValidator, getChatDetailValidator, getMessageValidator, leaveGroupValidator, newGroupChatValidator, removeMembersValidator, renameGroupValidator, sendAttachmentValidator, validateHandler } from '../lib/express.validator.js'

//!only login users use these routes
router.use(isAuthenticated)
router.use(isAuthorized('user'))

router.post('/newgroup', newGroupChatValidator(), validateHandler,  ChatController.newGroup)
router.get('/getmychats', ChatController.getMyChats)
router.get('/my/groups',ChatController.getMyGroups)
router.put('/add/member',addMembersValidator(), validateHandler,  ChatController.addMembers)
router.put('/remove/member',removeMembersValidator(), validateHandler,  ChatController.removeMembers)

router.delete('/leavegroup/:id', leaveGroupValidator(), validateHandler,   ChatController.leaveGroup)

//send attachments
router.post('/message', attachmentsMulter, sendAttachmentValidator(), validateHandler, ChatController.sendAttachments)

router.get('/messages/:id', getMessageValidator(), validateHandler,  ChatController.getMessages)

//get chat details, rename,delete
router.route('/singlechat/:id').get(getChatDetailValidator(), validateHandler,  ChatController.getChatDetails).put( renameGroupValidator(), validateHandler, ChatController.renameGroup).delete(deleteChatValidator(), validateHandler, ChatController.deleteChat)

export default router  