const { User, Restaurant, Comment, Favorite, Like, Followship } = require('../models')
const bcrypt = require('bcryptjs')
const helpers = require('../helpers/auth-helpers')
const { cloudinaryFileHandler } = require('../helpers/file-helpers')
const { createError } = require('../helpers/error-helpers')
const userServices = {
  signUp: (req, cb) => {
    // 如果兩次輸入的密碼不同，就建立一個 Error 物件並拋出
    if (req.body.password !== req.body.passwordCheck) throw createError('Passwords do not match!', 400)

    // 確認資料裡面沒有一樣的 email，若有，就建立一個 Error 物件並拋出
    return User.findOne({ where: { email: req.body.email } })
      .then(user => {
        if (user) throw createError('Email already exists!', 400)
        return bcrypt.hash(req.body.password, 10)
      })
      .then(hash => User.create({ // 上面錯誤狀況都沒發生，就把使用者的資料寫入資料庫
        name: req.body.name,
        email: req.body.email,
        password: hash
      }))
      .then(newUser => {
        const userData = newUser.toJSON()
        delete userData.password // 回傳的資料不要包含密碼
        return cb(null, { user: userData })
      })
      .catch(err => cb(err)) // 接住前面拋出的錯誤，交給 controller 處理
  },
  getUser: (req, cb) => {
    const userAttributes = ['id', 'name', 'image'] // 追蹤名單只需要顯示頭像和名字，不要把 email、密碼撈出來
    const restaurantAttributes = ['id', 'name', 'image']
    return User.findByPk(req.params.id, {
      attributes: { exclude: ['password'] }, // 個人頁面用不到密碼雜湊，不要撈出來
      include: [
        // 使用者的評論，以及每則評論對應的餐廳
        { model: Comment, attributes: ['id'], include: { model: Restaurant, attributes: restaurantAttributes } },
        // 收藏過的餐廳；through: { attributes: [] } 表示不要把 join table（Favorites）的欄位一起帶回來
        { model: Restaurant, as: 'FavoritedRestaurants', attributes: restaurantAttributes, through: { attributes: [] } },
        // 追蹤自己的人
        { model: User, as: 'Followers', attributes: userAttributes, through: { attributes: [] } },
        // 自己追蹤的人
        { model: User, as: 'Followings', attributes: userAttributes, through: { attributes: [] } }
      ]
    })
      .then(user => {
        if (!user) throw createError("User didn't exist!", 404)
        user = user.toJSON()
        // 沒有任何資料時，這些關聯可能不存在，統一給空陣列
        const comments = user.Comments || []
        const favoritedRestaurants = user.FavoritedRestaurants || []
        const followers = user.Followers || []
        const followings = user.Followings || []

        // 同一間餐廳評論多次只列一次：用餐廳 id 當 key 去除重複
        const restaurantMap = new Map()
        comments.forEach(comment => {
          if (comment.Restaurant) restaurantMap.set(comment.Restaurant.id, comment.Restaurant)
        })
        const commentedRestaurants = [...restaurantMap.values()]

        // 目前登入者是否已追蹤這個頁面的使用者（看自己的頁面時不顯示追蹤按鈕）
        const loginUser = helpers.getUser(req)
        const isSelf = Boolean(loginUser && loginUser.id === user.id)
        const isFollowed = Boolean(loginUser && loginUser.Followings &&
          loginUser.Followings.some(f => f.id === user.id))

        return cb(null, {
          user,
          commentedRestaurants,
          commentCount: comments.length,
          favoritedRestaurants,
          followers,
          followings,
          isSelf,
          isFollowed
        })
      })
      .catch(err => cb(err))
  },
  putUser: (req, cb) => {
    const id = Number(req.params.id) // 網址上的參數是字串，轉成數字才能和登入者的 id 比較
    if (helpers.getUser(req).id !== id) throw createError('只能編輯自己的資料！', 403)
    const { name } = req.body
    if (!name) throw createError('User name is required!', 400)
    const { file } = req
    return Promise.all([
      User.findByPk(id, { attributes: { exclude: ['password'] } }),
      cloudinaryFileHandler(file)
    ])
      .then(([user, filePath]) => {
        if (!user) throw createError("User didn't exist!", 404)
        return user.update({
          name,
          image: filePath || user.image // 沒有上傳新圖片就沿用舊的
        })
      })
      .then(updatedUser => cb(null, { user: updatedUser }))
      .catch(err => cb(err))
  },
  getTopUsers: (req, cb) => {
    // 撈出所有 User 與 followers 資料
    return User.findAll({
      attributes: { exclude: ['password'] },
      include: [{ model: User, as: 'Followers', attributes: ['id'] }] // 只是要算人數，只取 id 就好
    })
      .then(users => {
        const loginUser = helpers.getUser(req)
        const result = users
          // 整理 users 資料，把每個 user 項目都拿出來處理一次
          .map(user => ({
            // 整理格式
            ...user.toJSON(),
            // 計算追蹤者人數
            followerCount: user.Followers.length,
            // 判斷目前登入使用者是否已追蹤該 user 物件
            isFollowed: loginUser.Followings.some(f => f.id === user.id)
          }))
          // 依追蹤人數由多到少排序
          .sort((a, b) => b.followerCount - a.followerCount)
        return cb(null, { users: result })
      })
      .catch(err => cb(err))
  },
  addFavorite: (req, cb) => {
    const { restaurantId } = req.params
    return Promise.all([
      Restaurant.findByPk(restaurantId),
      Favorite.findOne({ where: { userId: req.user.id, restaurantId } })
    ])
      .then(([restaurant, favorite]) => {
        if (!restaurant) throw createError("Restaurant didn't exist!", 404)
        if (favorite) throw createError('You have favorited this restaurant!', 400)
        return Favorite.create({ userId: req.user.id, restaurantId })
      })
      .then(newFavorite => cb(null, { favorite: newFavorite }))
      .catch(err => cb(err))
  },
  removeFavorite: (req, cb) => {
    return Favorite.findOne({ where: { userId: req.user.id, restaurantId: req.params.restaurantId } })
      .then(favorite => {
        if (!favorite) throw createError("You haven't favorited this restaurant", 404)
        return favorite.destroy()
      })
      .then(deletedFavorite => cb(null, { favorite: deletedFavorite }))
      .catch(err => cb(err))
  },
  addLike: (req, cb) => {
    const { restaurantId } = req.params
    return Promise.all([
      Restaurant.findByPk(restaurantId),
      Like.findOne({ where: { userId: req.user.id, restaurantId } })
    ])
      .then(([restaurant, like]) => {
        if (!restaurant) throw createError("Restaurant didn't exist!", 404)
        if (like) throw createError('You have liked this restaurant!', 400)
        return Like.create({ userId: req.user.id, restaurantId })
      })
      .then(newLike => cb(null, { like: newLike }))
      .catch(err => cb(err))
  },
  removeLike: (req, cb) => {
    return Like.findOne({ where: { userId: req.user.id, restaurantId: req.params.restaurantId } })
      .then(like => {
        if (!like) throw createError("You haven't liked this restaurant", 404)
        return like.destroy()
      })
      .then(deletedLike => cb(null, { like: deletedLike }))
      .catch(err => cb(err))
  },
  addFollowing: (req, cb) => {
    const { userId } = req.params
    return Promise.all([
      User.findByPk(userId),
      Followship.findOne({ where: { followerId: req.user.id, followingId: userId } })
    ])
      .then(([user, followship]) => {
        if (!user) throw createError("User didn't exist!", 404)
        if (followship) throw createError('You are already following this user!', 400)
        return Followship.create({ followerId: req.user.id, followingId: userId })
      })
      .then(newFollowship => cb(null, { followship: newFollowship }))
      .catch(err => cb(err))
  },
  removeFollowing: (req, cb) => {
    return Followship.findOne({ where: { followerId: req.user.id, followingId: req.params.userId } })
      .then(followship => {
        if (!followship) throw createError("You haven't followed this user!", 404)
        return followship.destroy()
      })
      .then(deletedFollowship => cb(null, { followship: deletedFollowship }))
      .catch(err => cb(err))
  }
}
module.exports = userServices
