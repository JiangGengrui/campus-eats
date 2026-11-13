/** 业务错误码：唯一来源（ARCHITECTURE §6），前后端共用，禁止裸数字 */
export const ERROR_CODES = {
  // 1xxx 账户
  USERNAME_TAKEN: 1001,
  INVALID_CREDENTIALS: 1002,
  VALIDATION_FAILED: 1003,
  UNAUTHORIZED: 1004,
  // 2xxx 业务
  DISH_UNAVAILABLE: 2001,
  BELOW_MIN_PRICE: 2002,
  EMPTY_CART: 2003,
  ADDRESS_NOT_FOUND: 2004,
  SHOP_NOT_FOUND: 2005,
  // 3xxx 流程
  INVALID_TRANSITION: 3001,
  // 4xxx 权限
  FORBIDDEN: 4001,
  NOT_FOUND: 4040,
  // 429x 频率限制
  RATE_LIMITED: 4290,
  // 5xxx 上传/服务器
  UPLOAD_INVALID: 5001,
  UPLOAD_TOO_LARGE: 5002,
  INTERNAL_ERROR: 5000,
} as const;

export type ErrorCodeValue = (typeof ERROR_CODES)[keyof typeof ERROR_CODES];

/** 默认用户提示文案（前端可按码映射） */
export const ERROR_MESSAGES: Record<number, string> = {
  [ERROR_CODES.USERNAME_TAKEN]: "用户名已存在",
  [ERROR_CODES.INVALID_CREDENTIALS]: "用户名或密码错误",
  [ERROR_CODES.VALIDATION_FAILED]: "输入不合法，请检查表单",
  [ERROR_CODES.UNAUTHORIZED]: "请先登录",
  [ERROR_CODES.DISH_UNAVAILABLE]: "部分菜品已下架，请重新确认",
  [ERROR_CODES.BELOW_MIN_PRICE]: "未达到店铺起送价",
  [ERROR_CODES.EMPTY_CART]: "购物车为空",
  [ERROR_CODES.ADDRESS_NOT_FOUND]: "收货地址不存在",
  [ERROR_CODES.SHOP_NOT_FOUND]: "店铺不存在或已下架",
  [ERROR_CODES.INVALID_TRANSITION]: "当前状态不允许该操作",
  [ERROR_CODES.FORBIDDEN]: "没有权限执行该操作",
  [ERROR_CODES.NOT_FOUND]: "资源不存在",
  [ERROR_CODES.RATE_LIMITED]: "尝试过于频繁，请稍后再试",
  [ERROR_CODES.UPLOAD_INVALID]: "仅支持 jpg/png/webp 图片",
  [ERROR_CODES.UPLOAD_TOO_LARGE]: "图片不能超过 2MB",
  [ERROR_CODES.INTERNAL_ERROR]: "服务器内部错误",
};
