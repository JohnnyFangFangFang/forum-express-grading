const { Restaurant, Category, Comment, User } = require('../../models')
const restaurantServices = require('../../services/restaurant-services') // 引入 restaurant-services
const helpers = require('../../helpers/auth-helpers')
const restaurantController = {
  getRestaurants: (req, res, next) => {
    restaurantServices.getRestaurants(req, (err, data) => err ? next(err) : res.render('restaurants', data))
  },
  getRestaurant: (req, res, next) => {
    return Restaurant.findByPk(req.params.id, {
      include: [
        Category, // 拿出關聯的 Category model
        { model: Comment, include: User },
        { model: User, as: 'FavoritedUsers' },
        { model: User, as: 'LikedUsers' }
      ]
    })
      .then(restaurant => {
        if (!restaurant) throw new Error("Restaurant didn't exist!")
        return restaurant.increment('viewCounts') // 每瀏覽一次就把瀏覽次數 +1
      })
      .then(restaurant => {
        const isFavorited = restaurant.FavoritedUsers.some(f => f.id === req.user.id)
        const isLiked = restaurant.LikedUsers.some(l => l.id === req.user.id)
        res.render('restaurant', {
          restaurant: restaurant.toJSON(),
          isFavorited,
          isLiked
        })
      })
      .catch(err => next(err))
  },
  getDashboard: (req, res, next) => {
    return Restaurant.findByPk(req.params.id, {
      include: Category
    })
      .then(restaurant => {
        if (!restaurant) throw new Error("Restaurant didn't exist!")
        res.render('dashboard', {
          restaurant: restaurant.toJSON()
        })
      })
      .catch(err => next(err))
  },
  getFeeds: (req, res, next) => {
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
        include: [User, Restaurant],
        raw: true,
        nest: true
      })
    ])
      .then(([restaurants, comments]) => {
        res.render('feeds', {
          restaurants,
          comments
        })
      })
      .catch(err => next(err))
  },
  getTopRestaurants: (req, res, next) => {
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
        res.render('top-restaurants', { restaurants: result })
      })
      .catch(err => next(err))
  }
}
module.exports = restaurantController
