const express = require('express')
const router = express.Router()
const passport = require('../../config/passport')
const admin = require('./modules/admin')
const restController = require('../../controllers/apis/restaurant-controller')
const userController = require('../../controllers/apis/user-controller')
const { authenticated, authenticatedAdmin } = require('../../middleware/api-auth')
const { apiErrorHandler } = require('../../middleware/error-handler')
router.use('/admin', authenticated, authenticatedAdmin, admin) // 修改，後台路由加入 authenticated, authenticatedAdmin
router.get('/restaurants', authenticated, restController.getRestaurants) // 修改，前台路由加入 authenticated
router.post('/signin', passport.authenticate('local', { session: false }), userController.signIn) // 新增這行，設定 disable sessions
router.post('/signup', userController.signUp) // 註冊不需要驗證身份
router.use('/', apiErrorHandler)
module.exports = router
