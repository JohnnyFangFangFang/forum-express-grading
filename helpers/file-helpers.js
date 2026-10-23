const fs = require('fs') // 引入 fs 模組
const cloudinary = require('cloudinary').v2 // 引入 cloudinary SDK
cloudinary.config({ // 用 .env 裡的三個值設定 cloudinary
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
})
const localFileHandler = file => { // file 是 multer 處理完的檔案
  return new Promise((resolve, reject) => {
    if (!file) return resolve(null)
    const fileName = `upload/${file.originalname}`
    return fs.promises.readFile(file.path)
      .then(data => fs.promises.writeFile(fileName, data))
      .then(() => resolve(`/${fileName}`))
      .catch(err => reject(err))
  })
}
const cloudinaryFileHandler = file => { // file 是 multer 處理完的檔案
  return new Promise((resolve, reject) => {
    if (!file) return resolve(null)
    return cloudinary.uploader.upload(file.path) // 把 temp/ 裡的暫存檔上傳到 cloudinary
      .then(result => resolve(result?.secure_url || null)) // 回傳圖片的 https 網址
      .catch(err => reject(err))
  })
}
module.exports = {
  localFileHandler,
  cloudinaryFileHandler
}
