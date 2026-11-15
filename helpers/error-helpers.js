// 建立帶有 HTTP 狀態碼的 Error，apiErrorHandler 會用 err.status 當作回應的狀態碼
const createError = (message, status) => {
  const err = new Error(message)
  err.status = status
  return err
}
module.exports = { createError }
