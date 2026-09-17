import { CategoryId, CategoryInfo } from '../types';

export const DEFAULT_CATEGORIES: CategoryInfo[] = [
  {
    id: 'food',
    name: 'Ăn uống & Cà phê',
    icon: 'Utensils',
    color: '#ea580c', // orange-600
    bgColor: '#fff7ed', // orange-50
    borderColor: '#fed7aa', // orange-200
    defaultBudget: 4500000, // 4.5 triệu
    keywords: [
      'coffee', 'cafe', 'highlands', 'starbucks', 'phuc long', 'tra sua',
      'com', 'pho', 'bun', 'lau', 'nuong', 'kichi', 'gogi', 'pizza',
      'lotteria', 'kfc', 'mcdonald', 'burger', 'an sang', 'an trua', 'an toi',
      'banh mi', 'grabfood', 'shopeefood', 'baemin', 'quan an', 'nha hang'
    ],
  },
  {
    id: 'shopping',
    name: 'Mua sắm & Tiêu dùng',
    icon: 'ShoppingBag',
    color: '#2563eb', // blue-600
    bgColor: '#eff6ff',
    borderColor: '#bfdbfe',
    defaultBudget: 3500000,
    keywords: [
      'shopee', 'lazada', 'tiki', 'tiktok shop', 'winmart', 'bach hoa xanh',
      'coopmart', 'big c', 'go!', 'lotte mart', 'aeon', 'sieu thi', 'mua sam',
      'quan ao', 'giay dep', 'my pham', 'uniqlo', 'zara', 'h&m', 'hasaki'
    ],
  },
  {
    id: 'transport',
    name: 'Di chuyển & Xăng xe',
    icon: 'Car',
    color: '#059669', // emerald-600
    bgColor: '#ecfdf5',
    borderColor: '#a7f3d0',
    defaultBudget: 1500000,
    keywords: [
      'grab', 'be', 'xanh sm', 'gojek', 'taxi', 'mai linh', 'vinasun',
      'xang', 'petrolimex', 'pvoil', 'do xang', 'vetc', 'epass', 'gui xe',
      've xe', 've tau', 'may bay', 'vietnam airlines', 'vietjet', 'bamboo'
    ],
  },
  {
    id: 'bills',
    name: 'Hóa đơn & Tiện ích',
    icon: 'Zap',
    color: '#d97706', // amber-600
    bgColor: '#fffbeb',
    borderColor: '#fde68a',
    defaultBudget: 2000000,
    keywords: [
      'tien dien', 'dien evn', 'evn', 'tien nuoc', 'sawaco', 'cap nuoc',
      'internet', 'wifi', 'fpt telecom', 'viettel telecom', 'vnpt', 'cuoc dt',
      'nap tien dt', 'truyen hinh', 'phi ve sinh', 'rac'
    ],
  },
  {
    id: 'housing',
    name: 'Nhà cửa & Dịch vụ',
    icon: 'Home',
    color: '#7c3aed', // violet-600
    bgColor: '#f5f3ff',
    borderColor: '#ddd6fe',
    defaultBudget: 6000000,
    keywords: [
      'tien nha', 'tien phong', 'thue nha', 'phi chung cu', 'bql',
      'phi quan ly', 'sua nha', 'dien nuoc', 'noi that', 'khoa cua', 'gas'
    ],
  },
  {
    id: 'health',
    name: 'Sức khỏe & Y tế',
    icon: 'HeartPulse',
    color: '#e11d48', // rose-600
    bgColor: '#fff1f2',
    borderColor: '#fecdd3',
    defaultBudget: 1000000,
    keywords: [
      'thuoc', 'pharmacity', 'long chau', 'an khang', 'benh vien', 'phong kham',
      'kham benh', 'nha khoa', 'rang', 'kinh mat', 'xet nghiem', 'gym', 'yoga'
    ],
  },
  {
    id: 'education',
    name: 'Giáo dục & Phát triển',
    icon: 'GraduationCap',
    color: '#0891b2', // cyan-600
    bgColor: '#ecfeff',
    borderColor: '#a5f3fc',
    defaultBudget: 1200000,
    keywords: [
      'hoc phi', 'khoa hoc', 'sach', 'nha sach', 'tiki book', 'fahasa',
      'tieng anh', 'ielts', 'toeic', 'udemy', 'coursera', 'hoc them'
    ],
  },
  {
    id: 'entertainment',
    name: 'Giải trí & Du lịch',
    icon: 'Film',
    color: '#db2777', // pink-600
    bgColor: '#fdf2f8',
    borderColor: '#fbcfe8',
    defaultBudget: 1500000,
    keywords: [
      'netflix', 'spotify', 'cgv', 'lotte cinema', 'bhd', 'galaxy', 'xem phim',
      'rap chieu', 'steam', 'game', 'du lich', 'khach san', 'hotel', 'resort',
      'agoda', 'booking.com', 'traveloka', 'karaoke', 'bar', 'pub'
    ],
  },
  {
    id: 'investment',
    name: 'Tài chính & Đầu tư',
    icon: 'TrendingUp',
    color: '#4f46e5', // indigo-600
    bgColor: '#eef2ff',
    borderColor: '#c7d2fe',
    defaultBudget: 3000000,
    keywords: [
      'tiet kiem', 'chung khoan', 'vps', 'ssi', 'tcbs', 'vndirect', 'tra no',
      'vay', 'bao hiem', 'manulife', 'prudential', 'phi duy tri', 'phi the'
    ],
  },
  {
    id: 'other',
    name: 'Chi tiêu khác',
    icon: 'MoreHorizontal',
    color: '#64748b', // slate-500
    bgColor: '#f8fafc',
    borderColor: '#e2e8f0',
    defaultBudget: 1000000,
    keywords: ['chuyen tien', 'rut tien', 'atm', 'khac', 'chi tieu'],
  },
];

export const CATEGORY_MAP = new Map<CategoryId, CategoryInfo>(
  DEFAULT_CATEGORIES.map((c) => [c.id, c])
);

export function getCategoryById(id: CategoryId): CategoryInfo {
  return CATEGORY_MAP.get(id) || DEFAULT_CATEGORIES[DEFAULT_CATEGORIES.length - 1];
}
