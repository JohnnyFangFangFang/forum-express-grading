const { Restaurant, Category, User } = require('../models')
const { cloudinaryFileHandler } = require('../helpers/file-helpers') // 引入處理檔案上傳的 helper
const { createError } = require('../helpers/error-helpers')
const adminServices = {
  getRestaurants: (req, cb) => {
    Restaurant.findAll({ raw: true, nest: true, include: [Category] })
      .then(restaurants => cb(null, { restaurants }))
      .catch(err => cb(err))
  },
  postRestaurant: (req, cb) => {
    const { name, tel, address, openingHours, description, categoryId } = req.body
    if (!name) throw createError('Restaurant name is required!', 400)
    const { file } = req
    cloudinaryFileHandler(file)
      .then(filePath => Restaurant.create({ name, tel, address, openingHours, description, image: filePath || null, categoryId }))
      .then(newRestaurant => cb(null, { restaurant: newRestaurant }))
      .catch(err => cb(err))
  },
  getRestaurant: (req, cb) => {
    return Restaurant.findByPk(req.params.id, { // 去資料庫用 id 找一筆資料
      raw: true, // 找到以後整理格式再回傳
      nest: true,
      include: [Category]
    })
      .then(restaurant => {
        if (!restaurant) throw createError("Restaurant didn't exist!", 404) //  如果找不到，回傳錯誤訊息，後面不執行
        return cb(null, { restaurant })
      })
      .catch(err => cb(err))
  },
  putRestaurant: (req, cb) => {
    const { name, tel, address, openingHours, description, categoryId } = req.body
    if (!name) throw createError('Restaurant name is required!', 400)
    const { file } = req // 把檔案取出來
    return Promise.all([ // 非同步處理
      Restaurant.findByPk(req.params.id), // 去資料庫查有沒有這間餐廳
      cloudinaryFileHandler(file) // 把檔案傳到 file-helper 處理
    ])
      .then(([restaurant, filePath]) => { // 以上兩樣事都做完以後
        if (!restaurant) throw createError("Restaurant didn't exist!", 404)
        return restaurant.update({ // 修改這筆資料
          name,
          tel,
          address,
          openingHours,
          description,
          image: filePath || restaurant.image, // 如果 filePath 是 Truthy (使用者有上傳新照片) 就用 filePath，是 Falsy (使用者沒有上傳新照片) 就沿用原本資料庫內的值
          categoryId
        })
      })
      .then(updatedRestaurant => cb(null, { restaurant: updatedRestaurant }))
      .catch(err => cb(err))
  },
  deleteRestaurant: (req, cb) => {
    Restaurant.findByPk(req.params.id)
      .then(restaurant => {
        if (!restaurant) throw createError("Restaurant didn't exist!", 404)
        return restaurant.destroy()
      })
      .then(deletedRestaurant => cb(null, { restaurant: deletedRestaurant }))
      .catch(err => cb(err))
  },
  getUsers: (req, cb) => {
    return User.findAll({
      raw: true,
      attributes: { exclude: ['password'] } // 不要把密碼雜湊回傳出去
    })
      .then(users => cb(null, { users }))
      .catch(err => cb(err))
  },
  patchUser: (req, cb) => {
    return User.findByPk(req.params.id, { attributes: { exclude: ['password'] } })
      .then(user => {
        if (!user) throw createError("User didn't exist!", 404)
        if (user.email === 'root@example.com') throw createError('禁止變更 root 權限', 403) // root 是超級使用者，權限不可被變更
        return user.update({ isAdmin: !user.isAdmin }) // 切換 admin / user
      })
      .then(updatedUser => cb(null, { user: updatedUser }))
      .catch(err => cb(err))
  }
}
module.exports = adminServices
