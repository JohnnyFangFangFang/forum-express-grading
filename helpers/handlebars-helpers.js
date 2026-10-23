const dayjs = require('dayjs') // 載入 dayjs 套件
module.exports = {
  currentYear: () => dayjs().year(), // 取得當年年份作為 currentYear 的屬性值，並導出
  ifCond: function (a, b, options) { // 比較兩個值是否相等，用 function 才能取得樣板的 this
    return a === b ? options.fn(this) : options.inverse(this)
  }
}
