const { Category } = require('../models')
const { createError } = require('../helpers/error-helpers')
const categoryServices = {
  getCategories: (req, cb) => {
    return Promise.all([
      Category.findAll({ raw: true }),
      req.params.id ? Category.findByPk(req.params.id, { raw: true }) : null
    ])
      .then(([categories, category]) => {
        if (req.params.id && !category) throw createError("Category doesn't exist!", 404)
        return cb(null, { categories, category })
      })
      .catch(err => cb(err))
  },
  postCategory: (req, cb) => {
    const { name } = req.body
    if (!name) throw createError('Category name is required!', 400)
    return Category.create({ name })
      .then(newCategory => cb(null, { category: newCategory }))
      .catch(err => cb(err))
  },
  putCategory: (req, cb) => {
    const { name } = req.body
    if (!name) throw createError('Category name is required!', 400)
    return Category.findByPk(req.params.id)
      .then(category => {
        if (!category) throw createError("Category doesn't exist!", 404)
        return category.update({ name })
      })
      .then(updatedCategory => cb(null, { category: updatedCategory }))
      .catch(err => cb(err))
  },
  deleteCategory: (req, cb) => {
    return Category.findByPk(req.params.id)
      .then(category => {
        if (!category) throw createError("Category didn't exist!", 404) // 反查，確認要刪除的類別存在，再進行下面刪除動作
        return category.destroy()
      })
      .then(deletedCategory => cb(null, { category: deletedCategory }))
      .catch(err => cb(err))
  }
}
module.exports = categoryServices
