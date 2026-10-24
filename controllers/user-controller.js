const bcrypt = require('bcryptjs') // 載入 bcrypt
const db = require('../models')
const { User, Comment, Restaurant } = db
const helpers = require('../helpers/auth-helpers')
const { cloudinaryFileHandler } = require('../helpers/file-helpers')
const userController = {
  signUpPage: (req, res) => {
    res.render('signup')
  },
  signUp: (req, res, next) => {
    // 如果兩次輸入的密碼不同，就建立一個 Error 物件並拋出
    if (req.body.password !== req.body.passwordCheck) throw new Error('Passwords do not match!')

    // 確認資料裡面沒有一樣的 email，若有，就建立一個 Error 物件並拋出
    return User.findOne({ where: { email: req.body.email } })
      .then(user => {
        if (user) throw new Error('Email already exists!')
        return bcrypt.hash(req.body.password, 10) // 前面加 return
      })
      .then(hash => User.create({ // 上面錯誤狀況都沒發生，就把使用者的資料寫入資料庫
        name: req.body.name,
        email: req.body.email,
        password: hash
      }))
      .then(() => {
        req.flash('success_messages', '成功註冊帳號！') // 並顯示成功訊息
        res.redirect('/signin')
      })
      .catch(err => next(err)) // 接住前面拋出的錯誤，呼叫專門做錯誤處理的 middleware
  },
  signInPage: (req, res) => {
    res.render('signin')
  },
  signIn: (req, res) => {
    req.flash('success_messages', '成功登入！')
    res.redirect('/restaurants')
  },
  logout: (req, res) => {
    req.flash('success_messages', '登出成功！')
    req.logout()
    res.redirect('/signin')
  },
  getUser: (req, res, next) => {
    return User.findByPk(req.params.id, {
      include: { model: Comment, include: Restaurant } // 一併撈出使用者的評論，以及每則評論對應的餐廳
    })
      .then(user => {
        if (!user) throw new Error("User didn't exist!")
        user = user.toJSON()
        const comments = user.Comments || [] // 沒有任何評論時，Comments 可能不存在
        // 同一間餐廳評論多次只列一次：用餐廳 id 當 key 去除重複
        const restaurantMap = new Map()
        comments.forEach(comment => {
          if (comment.Restaurant) restaurantMap.set(comment.Restaurant.id, comment.Restaurant)
        })
        const commentedRestaurants = [...restaurantMap.values()]
        res.render('users/profile', {
          user,
          commentedRestaurants,
          commentCount: comments.length
        })
      })
      .catch(err => next(err))
  },
  editUser: (req, res, next) => {
    const id = Number(req.params.id) // 網址上的參數是字串，轉成數字才能和登入者的 id 比較
    if (helpers.getUser(req).id !== id) throw new Error('只能編輯自己的資料！')
    return User.findByPk(id, { raw: true })
      .then(user => {
        if (!user) throw new Error("User didn't exist!")
        res.render('users/edit', { user })
      })
      .catch(err => next(err))
  },
  putUser: (req, res, next) => {
    const id = Number(req.params.id)
    if (helpers.getUser(req).id !== id) throw new Error('只能編輯自己的資料！')
    const { name } = req.body
    if (!name) throw new Error('User name is required!')
    const { file } = req
    return Promise.all([
      User.findByPk(id),
      cloudinaryFileHandler(file)
    ])
      .then(([user, filePath]) => {
        if (!user) throw new Error("User didn't exist!")
        return user.update({
          name,
          image: filePath || user.image // 沒有上傳新圖片就沿用舊的
        })
      })
      .then(() => {
        req.flash('success_messages', '使用者資料編輯成功')
        res.redirect(`/users/${id}`)
      })
      .catch(err => next(err))
  }
}
module.exports = userController
