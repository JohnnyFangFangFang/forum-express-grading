const { Restaurant, Category, Comment, User } = require('../models')
const { getOffset, getPagination } = require('../helpers/pagination-helper')
const { createError } = require('../helpers/error-helpers')
const helpers = require('../helpers/auth-helpers')
const userWithoutPassword = { attributes: { exclude: ['password'] } } // 關聯到 User 時不要把密碼雜湊帶出來
const restaurantServices = {
  getRestaurants: (req, cb) => {
    const DEFAULT_LIMIT = 9
    const categoryId = Number(req.query.categoryId) || ''
    const page = Number(req.query.page) || 1
    const limit = Number(req.query.limit) || DEFAULT_LIMIT
    const offset = getOffset(limit, page)
    Promise.all([
      Restaurant.findAndCountAll({
        include: Category,
        where: {
          ...categoryId ? { categoryId } : {}
        },
        limit,
        offset,
        nest: true,
        raw: true
      }),
      Category.findAll({ raw: true })
    ])
      .then(([restaurants, categories]) => {
        const favoritedRestaurantsId = req.user?.FavoritedRestaurants ? req.user.FavoritedRestaurants.map(fr => fr.id) : []
        const likedRestaurantsId = req.user?.LikedRestaurants ? req.user.LikedRestaurants.map(lr => lr.id) : []
        const data = restaurants.rows.map(r => ({
          ...r,
          description: r.description.substring(0, 50),
          isFavorited: favoritedRestaurantsId.includes(r.id),
          isLiked: likedRestaurantsId.includes(r.id)
        }))
        return cb(null, {
          restaurants: data,
          categories,
          categoryId,
          pagination: getPagination(limit, page, restaurants.count)
        })
      })
      .catch(err => cb(err))
  },
  getRestaurant: (req, cb) => {
    return Restaurant.findByPk(req.params.id, {
      include: [
        Category, // 拿出關聯的 Category model
        { model: Comment, include: { model: User, ...userWithoutPassword } },
        { model: User, as: 'FavoritedUsers', ...userWithoutPassword },
        { model: User, as: 'LikedUsers', ...userWithoutPassword }
      ]
    })
      .then(restaurant => {
        if (!restaurant) throw createError("Restaurant didn't exist!", 404)
        return restaurant.increment('viewCounts') // 每瀏覽一次就把瀏覽次數 +1
      })
      .then(restaurant => {
        const isFavorited = restaurant.FavoritedUsers.some(f => f.id === req.user.id)
        const isLiked = restaurant.LikedUsers.some(l => l.id === req.user.id)
        return cb(null, {
          restaurant: restaurant.toJSON(),
          isFavorited,
          isLiked
        })
      })
      .catch(err => cb(err))
  },
  getDashboard: (req, cb) => {
    return Restaurant.findByPk(req.params.id, {
      include: Category
    })
      .then(restaurant => {
        if (!restaurant) throw createError("Restaurant didn't exist!", 404)
        return cb(null, { restaurant: restaurant.toJSON() })
      })
      .catch(err => cb(err))
  },
  getFeeds: (req, cb) => {
    return Promise.all([
      Restaurant.findAll({
        limit: 10,
        order: [['createdAt', 'DESC']],
        include: [Category],
        raw: true,
        nest: true
      }),
      Comment.findAll({
        limit: 10,
        order: [['createdAt', 'DESC']],
        include: [{ model: User, ...userWithoutPassword }, Restaurant],
        raw: true,
        nest: true
      })
    ])
      .then(([restaurants, comments]) => cb(null, { restaurants, comments }))
      .catch(err => cb(err))
  },
  getTopRestaurants: (req, cb) => {
    // 撈出所有餐廳，並一併撈出收藏這間餐廳的使用者
    return Restaurant.findAll({
      include: [
        Category,
        { model: User, as: 'FavoritedUsers', attributes: ['id'] } // 只是要算人數，只取 id 就好
      ]
    })
      .then(restaurants => {
        const user = helpers.getUser(req)
        const favoritedRestaurantsId = (user && user.FavoritedRestaurants)
          ? user.FavoritedRestaurants.map(fr => fr.id)
          : []
        const result = restaurants
          .map(restaurant => {
            const r = restaurant.toJSON()
            return {
              ...r,
              favoritedCount: r.FavoritedUsers.length, // 收藏數
              isFavorited: favoritedRestaurantsId.includes(r.id) // 目前登入者是否已收藏
            }
          })
          .sort((a, b) => b.favoritedCount - a.favoritedCount) // 收藏數由多到少
          .slice(0, 10) // 只取前 10 名
        return cb(null, { restaurants: result })
      })
      .catch(err => cb(err))
  }
}
module.exports = restaurantServices
