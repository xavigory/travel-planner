export const STORAGE_KEY = "travel_app_v4";

export const CURRENCIES = [
  "TWD", "USD", "JPY", "EUR", "GBP", "AUD", "CAD", "HKD", "KRW",
  "SGD", "THB", "CNY", "MXN", "CHF", "NZD"
] as const;

export const EXP_CATS = ["餐飲", "交通", "住宿", "門票", "購物", "其他"] as const;

export const DEF_PACK = [
  "護照", "信用卡", "現金", "充電線", "轉接頭", "行動電源",
  "盥洗用品", "浴巾", "拖鞋", "藥品", "口罩", "雨傘", "防曬乳", "相機"
] as const;

export const ACC_PLAT = [
  "Booking.com", "Airbnb", "Agoda", "Hotels.com", "Expedia", "官方網站", "其他"
] as const;

export const TRANS_TYPES = ["機票", "火車", "巴士", "渡輪", "租車", "其他"] as const;

export const TABS = [
  ["🗓️", "行程"],
  ["📍", "景點"],
  ["🏨", "住宿交通"],
  ["💰", "記帳"],
  ["🧳", "行李"]
] as const;

export const TIMEZONES = [
  "Asia/Taipei", "Asia/Tokyo", "Asia/Seoul", "Asia/Bangkok", "Asia/Singapore",
  "Asia/Hong_Kong", "Asia/Shanghai", "Asia/Dubai", "Europe/London",
  "Europe/Paris", "America/New_York", "America/Los_Angeles", "America/Chicago",
  "Australia/Sydney", "Pacific/Auckland"
] as const;
