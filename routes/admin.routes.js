import {Router} from 'express'
import AdminController from '../controllers/Admin.controller.js'
import { isAuthenticated, isAuthorized, onlyAdmin } from '../middlewares/protect.js'
import { adminAuthenticatedValidatot, validateHandler } from '../lib/express.validator.js'

const router = Router()

// router.use(isAuthenticated)
// router.use(isAuthorized('admin'))

router.post('/verify', adminAuthenticatedValidatot(), validateHandler, AdminController.adminLogin )
router.get('/logout', AdminController.adminLogout)

//!only admin can access this route
router.use(onlyAdmin)

router.get('/', AdminController.getAdminData)
router.get('/users', AdminController.getAllUsers)
router.get('/chats', AdminController.getAllChats)
router.get('/messages', AdminController.getAllMessages)
router.get('/stats', AdminController.getDashboardStats)

export default router 