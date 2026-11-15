const { User } = require('../../models')
const userServices = require('../../services/user-services')
const helpers = require('../../helpers/auth-helpers')
const userController = {
  signUpPage: (req, res) => {
    res.render('signup')
  },
  signUp: (req, res, next) => {
    userServices.signUp(req, err => {
      if (err) return next(err) // 交給專門做錯誤處理的 middleware
      req.flash('success_messages', '成功註冊帳號！') // 並顯示成功訊息
      return res.redirect('/signin')
    })
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
    userServices.getUser(req, (err, data) => err ? next(err) : res.render('users/profile', data))
  },
  // 編輯個人資料的表單頁，只有網頁版需要
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
    userServices.putUser(req, (err, data) => {
      if (err) return next(err)
      req.flash('success_messages', '使用者資料編輯成功')
      return res.redirect(`/users/${data.user.id}`)
    })
  },
  addFavorite: (req, res, next) => {
    userServices.addFavorite(req, err => err ? next(err) : res.redirect('back'))
  },
  removeFavorite: (req, res, next) => {
    userServices.removeFavorite(req, err => err ? next(err) : res.redirect('back'))
  },
  addLike: (req, res, next) => {
    userServices.addLike(req, err => err ? next(err) : res.redirect('back'))
  },
  removeLike: (req, res, next) => {
    userServices.removeLike(req, err => err ? next(err) : res.redirect('back'))
  },
  getTopUsers: (req, res, next) => {
    userServices.getTopUsers(req, (err, data) => err ? next(err) : res.render('top-users', data))
  },
  addFollowing: (req, res, next) => {
    userServices.addFollowing(req, err => err ? next(err) : res.redirect('back'))
  },
  removeFollowing: (req, res, next) => {
    userServices.removeFollowing(req, err => err ? next(err) : res.redirect('back'))
  }
}
module.exports = userController
