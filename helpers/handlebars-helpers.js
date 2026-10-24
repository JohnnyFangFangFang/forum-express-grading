const dayjs = require('dayjs') // 載入 dayjs 套件
const relativeTime = require('dayjs/plugin/relativeTime') // 增加這裡
dayjs.extend(relativeTime) // 增加這裡
module.exports = {
  currentYear: () => dayjs().year(), // 取得當年年份作為 currentYear 的屬性值，並導出
  relativeTimeFromNow: a => dayjs(a).fromNow(), // 增加這裡
  ifCond: function (a, b, options) { // 比較兩個值是否相等，用 function 才能取得樣板的 this
    return a === b ? options.fn(this) : options.inverse(this)
  }
}
