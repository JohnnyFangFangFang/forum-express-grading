const express = require('express')
const router = express.Router()
const passport = require('../../config/passport')
const admin = require('./modules/admin')
const restController = require('../../controllers/apis/restaurant-controller')
const userController = require('../../controllers/apis/user-controller')
const commentController = require('../../controllers/apis/comment-controller')
const { authenticated, authenticatedAdmin } = require('../../middleware/api-auth')
const upload = require('../../middleware/multer')
const { apiErrorHandler } = require('../../middleware/error-handler')
// 後台
router.use('/admin', authenticated, authenticatedAdmin, admin) // 修改，後台路由加入 authenticated, authenticatedAdmin
// 註冊、登入（不需要驗證身份）
router.post('/signin', passport.authenticate('local', { session: false }), userController.signIn) // 新增這行，設定 disable sessions
router.post('/signup', userController.signUp) // 註冊不需要驗證身份
// 餐廳
router.get('/restaurants/feeds', authenticated, restController.getFeeds) // 要放在 /restaurants/:id 前面
router.get('/restaurants/top', authenticated, restController.getTopRestaurants)
router.get('/restaurants/:id/dashboard', authenticated, restController.getDashboard)
router.get('/restaurants/:id', authenticated, restController.getRestaurant)
router.get('/restaurants', authenticated, restController.getRestaurants) // 修改，前台路由加入 authenticated
// 使用者
router.get('/users/top', authenticated, userController.getTopUsers) // 要放在 /users/:id 前面
router.get('/users/:id', authenticated, userController.getUser)
router.put('/users/:id', authenticated, upload.single('image'), userController.putUser)
// 評論
router.post('/comments', authenticated, commentController.postComment)
router.delete('/comments/:id', authenticated, authenticatedAdmin, commentController.deleteComment) // 只有管理者可以刪評論
// 收藏、喜歡、追蹤
router.post('/favorites/:restaurantId', authenticated, userController.addFavorite)
router.delete('/favorites/:restaurantId', authenticated, userController.removeFavorite)
router.post('/likes/:restaurantId', authenticated, userController.addLike)
router.delete('/likes/:restaurantId', authenticated, userController.removeLike)
router.post('/followships/:userId', authenticated, userController.addFollowing)
router.delete('/followships/:userId', authenticated, userController.removeFollowing)
router.use('/', (req, res) => res.status(404).json({ status: 'error', message: 'API not found' })) // 沒有對應的 API，回 404 而不是被網頁版導向
router.use('/', apiErrorHandler)
module.exports = router
