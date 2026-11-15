const { Comment, User, Restaurant } = require('../models')
const { createError } = require('../helpers/error-helpers')
const commentServices = {
  postComment: (req, cb) => {
    const { restaurantId, text } = req.body
    const userId = req.user.id
    if (!text) throw createError('Comment text is required!', 400)
    return Promise.all([
      User.findByPk(userId),
      Restaurant.findByPk(restaurantId)
    ])
      .then(([user, restaurant]) => {
        if (!user) throw createError("User didn't exist!", 404)
        if (!restaurant) throw createError("Restaurant didn't exist!", 404)
        return Comment.create({
          text,
          restaurantId,
          userId
        })
      })
      .then(newComment => cb(null, { comment: newComment }))
      .catch(err => cb(err))
  },
  deleteComment: (req, cb) => {
    return Comment.findByPk(req.params.id)
      .then(comment => {
        if (!comment) throw createError("Comment didn't exist!", 404)
        return comment.destroy()
      })
      .then(deletedComment => cb(null, { comment: deletedComment }))
      .catch(err => cb(err))
  }
}
module.exports = commentServices
