
export type SkillCategory = 'skill';

export interface AiSkill {
  id: string;
  name: string;
  icon: string;
  description: string;
  /** Injected into system prompt for passive personality shaping */
  systemPromptFragment: string;
  /** Active handler prompt used when this Skill is routed a subtask to execute */
  handlerPrompt: string;
  /** Keywords that help the Planner decide to route to this skill */
  matchKeywords: string[];
  /** Whether this skill can act as an independent subtask executor (vs pure personality) */
  canHandleSubtask: boolean;
  category: SkillCategory;
  price: number;
  config?: {
    apiKey?: string;
    address?: string;
    [key: string]: any;
  };
}

export const PRESET_SKILLS: AiSkill[] = [
  {
    id: 'places_cafe',
    name: 'Places for cafe',
    icon: '☕',
    description: 'Finds and reviews coffee shops within 3km of your address using the Google Places API.',
    systemPromptFragment: 'You are a Cafe Guide. You can look up and review coffee shops near the user\'s address using the Google Places API.',
    handlerPrompt: 'Based on the provided coffee shop list, answer the user\'s query in detail, including rating, address, and summary for each shop.',
    matchKeywords: ['cofe', 'coffee', 'cafe', '咖啡', '咖啡店', '附近咖啡', '咖啡馆'],
    canHandleSubtask: true,
    category: 'skill',
    price: 0
  },
  {
    id: 'cinema_tmdb',
    name: 'Cinema from TMDB',
    icon: '🎬',
    description: 'Fetches the latest playing or trending movies using the TMDB API and reviews them.',
    systemPromptFragment: 'You are a Cinema Guide. You can look up and review the latest movies currently playing in cinemas using the TMDB API.',
    handlerPrompt: 'Based on the provided list of currently playing movies from TMDB, answer the user\'s request, listing titles, ratings, release dates, and brief summaries in a structured, clean format.',
    matchKeywords: ['movie', 'cinema', 'theatre', 'trending movies', 'now playing', '电影', '影院', '上映电影', '热门电影'],
    canHandleSubtask: true,
    category: 'skill',
    price: 0
  },
  {
    id: 'places_gourmet',
    name: 'Places for gourmet',
    icon: '🍔',
    description: 'Finds and reviews gourmet restaurants within 3km of your address using the Google Places API.',
    systemPromptFragment: 'You are a Gourmet Guide. You can look up and review gourmet restaurants near the user\'s address using the Google Places API.',
    handlerPrompt: 'Based on the provided restaurant list, answer the user\'s query in detail, listing names, ratings, addresses, and editorial summaries in a structured format.',
    matchKeywords: ['gourmet', 'food', 'restaurant', 'dinner', 'eat', '美食', '餐馆', '餐厅', '吃饭', '附近美食'],
    canHandleSubtask: true,
    category: 'skill',
    price: 0
  },
  {
    id: 'igdb_game',
    name: 'IGDB for Game',
    icon: '🎮',
    description: 'Fetches the latest and popular game releases and reviews using the IGDB API.',
    systemPromptFragment: 'You are a Gaming Guide. You can look up the latest video games, release dates, and ratings using the IGDB API.',
    handlerPrompt: 'Based on the provided game list from IGDB, answer the user\'s gaming query or request, listing titles, release dates, ratings, and brief summaries in a structured, clean format.',
    matchKeywords: ['game', 'gaming', 'video game', 'release date', 'new games', 'popular games', 'igdb', '游戏', '电子游戏', '热门游戏', '新游戏', '游戏资讯'],
    canHandleSubtask: true,
    category: 'skill',
    price: 0
  },
  {
    id: 'grocery_spoonacular',
    name: 'Supermarket Grocery Products',
    icon: '🛒',
    description: 'Finds grocery products in supermarkets using the Spoonacular API.',
    systemPromptFragment: 'You are a Supermarket Grocery Guide. You can search for food products and grocery items in supermarkets using the Spoonacular API.',
    handlerPrompt: 'Based on the provided list of grocery products, answer the user\'s query, listing names, image links, and key properties in a clean, friendly format.',
    matchKeywords: ['grocery', 'supermarket', 'product', 'food product', 'buy food', 'shopping list', 'spoonacular', '超市', '商品', '超市商品', '买菜', '杂货', '食品'],
    canHandleSubtask: true,
    category: 'skill',
    price: 0
  },
  {
    id: 'gaode_gourmet',
    name: 'Gaode for gourmet',
    icon: '🗺️',
    description: 'Finds and reviews gourmet restaurants near your address using the Gaode Maps Web Service API.',
    systemPromptFragment: 'You are a Gourmet Guide powered by Gaode Maps. You can search for restaurants near the user\'s address using Gaode API.',
    handlerPrompt: 'Based on the provided Chinese restaurant list from Gaode Maps, answer the user\'s query, listing names, ratings/details, addresses, and distances in a clean, friendly format.',
    matchKeywords: ['gaode', 'gourmet', 'restaurant', 'food', 'nearby gourmet', 'nearby food', '高德', '美食', '餐厅', '附近美食', '吃饭', '高德地图'],
    canHandleSubtask: true,
    category: 'skill',
    price: 0
  },
  {
    id: 'places_travel',
    name: 'Places for travel',
    icon: '✈️',
    description: 'Finds and reviews tourist attractions within 3km of your address using the Google Places API.',
    systemPromptFragment: 'You are a Travel Guide. You can look up and review tourist attractions and landmarks near the user\'s address using the Google Places API.',
    handlerPrompt: 'Based on the provided tourist attraction list, answer the user\'s query in detail, listing names, ratings, addresses, and editorial summaries in a structured format.',
    matchKeywords: ['travel', 'attraction', 'tourist', 'landmark', 'sightseeing', 'museum', 'visit', '旅游', '景点', '地标', '观光', '附近景点', '好玩的地方'],
    canHandleSubtask: true,
    category: 'skill',
    price: 0
  },
  {
    id: 'meituan_gourmet',
    name: 'Meituan for gourmet',
    icon: '🛵',
    description: 'Finds local delivery foods, rankings, and coupons near you using Meituan/Dianping Enterprise API.',
    systemPromptFragment: 'You are a Meituan Gourmet Assistant. You suggest delivery foods, local coupons, rankings, and estimated delivery times near the user\'s address.',
    handlerPrompt: 'Based on the provided Meituan/Dianping food and coupon list, answer the user\'s query, focusing on dish names, ratings, discount rates, delivery fees, and times in a friendly Chinese cartoon tone.',
    matchKeywords: ['meituan', 'dianping', 'takeout', 'delivery', 'waimai', 'coupon', '美团', '点评', '外卖', '团购', '优惠券', '美团外卖'],
    canHandleSubtask: true,
    category: 'skill',
    price: 0
  },
  {
    id: 'aihot',
    name: 'AI HOT',
    icon: '🔥',
    description: 'Queries daily AI reports, model updates, trending papers, and news from aihot.virxact.com.',
    systemPromptFragment: 'You have access to real-time AI industry updates, hot news, daily AI reports, and paper releases using the AI HOT API.',
    handlerPrompt: 'Based on the retrieved AI HOT data, summarize the news or papers in a structured markdown format. Display absolute Beijing times derived from UTC, keep summaries concise, and always preserve source URLs for every entry.',
    matchKeywords: ['ai圈', 'ai新闻', 'ai日报', 'ai资讯', 'ai热点', '最近ai', 'aihot', 'ai hot', 'ai news', '大模型发布', '模型更新', '论文研究', '行业动态'],
    canHandleSubtask: true,
    category: 'skill',
    price: 0
  },
  {
    id: 'diet_fitness',
    name: 'Diet & Fitness Guide',
    icon: '🥗',
    description: 'Generates customized meal plans, calorie limits, and workout routines based on your configured physical stats.',
    systemPromptFragment: 'You are a supportive Diet and Weight Loss Coach. You calculate calorie targets and design healthy meal plans and exercise routines.',
    handlerPrompt: 'Based on the user\'s physical profile (age, height, weight, target weight), calculate their daily calorie deficit target and construct a custom, cartoonish daily diet schedule and workout plan.',
    matchKeywords: ['weight', 'diet', 'workout', 'calories', 'fitness', 'lose weight', '减肥', '减脂', '健身', '食谱', '一日三餐', '卡路里', '运动计划', '瘦身'],
    canHandleSubtask: true,
    category: 'skill',
    price: 0
  }
];

export const MAX_ACTIVE_SKILLS = 3;
