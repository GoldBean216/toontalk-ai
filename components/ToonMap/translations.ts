export const MAP_TRANSLATIONS: Record<string, Record<string, string>> = {
    English: {
        back: "⬅️ Back",
        title: "🗺️ Toon world",
        lod0: "🔍 LOD 0: Detailed Interiors",
        lod1: "🗺️ LOD 1: City Structures",
        lod2: "🌐 LOD 2: Regional Roads",
        zoomIn: "Zoom In",
        zoomOut: "Zoom Out",
        resetFocus: "Reset Focus",
        constructing: "CONSTRUCTING...",
        scanningGrid: "SCANNING R-GRID",
        interactiveZone: "Interactive Zone Active",
        nowPlaying: "🎬 NOW PLAYING 🎬",
        startChat: "💬 Chat",
        currentActivity: "CURRENT ACTIVITY: ",
        filterAll: "🗺️ Infinite City",
        filterHq: "🏢 Workstations (HQ)",
        filterCafe: "☕ Café Shop",
        filterPlaza: " fountains Fountain Plaza",
        filterCinema: "🎬 Toon Cinema",
        filterGym: "💪 Gym & Garden",
        noRoadAccess: "No Road Access",
        confirmPreset: "Are you sure you want to load this map preset? This will overwrite your current layout."
    },
    "简体中文": {
        back: "⬅️ 返回",
        title: "🗺️ Toon world",
        lod0: "🔍 LOD 0: 室内细节展示",
        lod1: "🗺️ LOD 1: 城市建筑外观",
        lod2: "🌐 LOD 2: 区域道路总览",
        zoomIn: "放大",
        zoomOut: "缩小",
        resetFocus: "重置视角",
        constructing: "建造中...",
        scanningGrid: "正在扫描 R-网格",
        interactiveZone: "互动区域已激活",
        nowPlaying: "🎬 正在放映 🎬",
        startChat: "💬 聊天",
        currentActivity: "当前活动：",
        filterAll: "🗺️ 无限城市",
        filterHq: "🏢 工作站 (总部)",
        filterCafe: "☕ 咖啡馆",
        filterPlaza: " fountains 喷泉广场",
        filterCinema: "🎬 卡通影院",
        filterGym: "💪 健身房与花园",
        noRoadAccess: "未连接道路",
        confirmPreset: "你确定要加载此地图预设吗？这会覆盖你当前的布局。"
    },
    "日本語": {
        back: "⬅️ 戻る",
        title: "🗺️ Toon world",
        lod0: "🔍 LOD 0: 室内の詳細",
        lod1: "🗺️ LOD 1: 都市の構造物",
        lod2: "🌐 LOD 2: 広域道路表示",
        zoomIn: "ズームイン",
        zoomOut: "ズームアウト",
        resetFocus: "フォーカスリセット",
        constructing: "建設中...",
        scanningGrid: "R-GRIDをスキャン中",
        interactiveZone: "インタラクティブゾーン有効",
        nowPlaying: "🎬 上映中 🎬",
        startChat: "💬 チャット開始",
        currentActivity: "現在のアクティビティ：",
        filterAll: "🗺️ 無限の都市",
        filterHq: "🏢 ワークステーション (本部)",
        filterCafe: "☕ カフェショップ",
        filterPlaza: " fountains 噴水広場",
        filterCinema: "🎬 トゥーン映画館",
        filterGym: "💪 ジム＆ガーデン",
        noRoadAccess: "道路未接続",
        confirmPreset: "このマッププリセットをロードしますか？現在のレイアウトは上書きされます。"
    },
    "Español": {
        back: "⬅️ Atrás",
        title: "🗺️ Toon world",
        lod0: "🔍 LOD 0: Interiores Detallados",
        lod1: "🗺️ LOD 1: Estructuras de la Ciudad",
        lod2: "🌐 LOD 2: Vías Regionales",
        zoomIn: "Acercar",
        zoomOut: "Alejar",
        resetFocus: "Restablecer Enfoque",
        constructing: "CONSTRUYENDO...",
        scanningGrid: "ESCANEANDO R-GRID",
        interactiveZone: "Zona Interactiva Activa",
        nowPlaying: "🎬 AHORA EN PANTALLA 🎬",
        startChat: "💬 Iniciar Chat",
        currentActivity: "ACTIVIDAD ACTUAL: ",
        filterAll: "🗺️ Ciudad Infinita",
        filterHq: "🏢 Estaciones de Trabajo (HQ)",
        filterCafe: "☕ Tienda de Café",
        filterPlaza: " fountains Plaza de la Fuente",
        filterCinema: "🎬 Cine Toon",
        filterGym: "💪 Gimnasio y Jardín",
        noRoadAccess: "Sin acceso a la carretera",
        confirmPreset: "¿Estás seguro de que deseas cargar este diseño? Esto sobrescribirá tu diseño actual."
    },
    "Français": {
        back: "⬅️ Retour",
        title: "🗺️ Toon world",
        lod0: "🔍 LOD 0 : Intérieurs Détaillés",
        lod1: "🗺️ LOD 1 : Structures de la Ville",
        lod2: "🌐 LOD 2 : Voies Régionales",
        zoomIn: "Zoom Avant",
        zoomOut: "Zoom Arrière",
        resetFocus: "Réinitialiser la vue",
        constructing: "EN CONSTRUCTION...",
        scanningGrid: "SCAN DE R-GRID...",
        interactiveZone: "Zone Interactive Active",
        nowPlaying: "🎬 À L'AFFICHE 🎬",
        startChat: "💬 Lancer le Chat",
        currentActivity: "ACTIVITÉ ACTUELLE : ",
        filterAll: "🗺️ Ville Infinie",
        filterHq: "🏢 Postes de Travail (QG)",
        filterCafe: "☕ Café Toon",
        filterPlaza: " fountains Place de la Fontaine",
        filterCinema: "🎬 Cinéma Toon",
        filterGym: "💪 Gym & Jardin",
        noRoadAccess: "Pas d'accès route",
        confirmPreset: "Êtes-vous sûr de vouloir charger ce modèle ? Cela remplacera votre disposition actuelle."
    }
};

export interface LocalizedBuildingInfo {
    name: string;
    tag: string;
    description: string;
    actionText: string;
}

export const getLocalizedBuilding = (bId: string, lang: string): LocalizedBuildingInfo => {
    const translations: Record<string, Record<string, LocalizedBuildingInfo>> = {
        English: {
            hq: {
                name: "🏢 TOONTALK HQ",
                tag: "WORKSTATION",
                description: "Main research lab and team workstation.",
                actionText: "View Office 💻"
            },
            cafe: {
                name: "☕ TOON CAFÉ",
                tag: "BREW",
                description: "Premium roasted coffee & croissants.",
                actionText: "Enter Café ☕"
            },
            gym: {
                name: "💪 POWER GYM",
                tag: "FITNESS",
                description: "High-intensity fitness center.",
                actionText: "Train Here 🏋️"
            },
            plaza: {
                name: " fountains FOUNTAIN PLAZA",
                tag: "RELAX",
                description: "A beautiful public park and fountain.",
                actionText: "Stroll Park ⛲"
            },
            cinema: {
                name: "🎬 TOON CINEMA",
                tag: "CINEMA",
                description: "3D movies and classic animation theatres.",
                actionText: "Watch Movie 🎬"
            },
            arcade: {
                name: "🕹️ ARCADE ZONE",
                tag: "GAMES",
                description: "Retro game consoles and pinball machines.",
                actionText: "Play Games 🕹️"
            },
            library: {
                name: "📚 TOON LIBRARY",
                tag: "STUDY",
                description: "Silent study zones and research manuals.",
                actionText: "Read Books 📚"
            },
            store: {
                name: "🏪 24/7 MART",
                tag: "SHOP",
                description: "Convenience snacks and dynamic energy drinks.",
                actionText: "Buy Snacks 🏪"
            },
            boba: {
                name: "🥤 BOBA STREET",
                tag: "BOBA",
                description: "Famous sweet bubble tea shop.",
                actionText: "Order Boba 🥤"
            },
            station: {
                name: "🚇 METRO STATION",
                tag: "TRANSIT",
                description: "Rapid transit platform to surrounding regions.",
                actionText: "Ride Metro 🚇"
            },
            lake: {
                name: "🌊 TOON LAKE",
                tag: "LAKE",
                description: "A deep blue cartoon lake, perfect for fishing.",
                actionText: "Go Fishing 🎣"
            },
            mountain: {
                name: "⛰️ TOON MOUNTAIN",
                tag: "MOUNTAIN",
                description: "A soaring peak with hiking trails and scenic views.",
                actionText: "Climb Peak 🧗"
            },
            pond: {
                name: "🐸 TOON POND",
                tag: "POND",
                description: "A quiet lily pad pond where small frogs splash.",
                actionText: "Catch Tadpoles 🐸"
            },
            hospital: {
                name: "🏥 TOON HOSPITAL",
                tag: "MEDICAL",
                description: "Full service clinic for sick and injured characters.",
                actionText: "Visit Hospital 🏥"
            }
        },
        "简体中文": {
            hq: {
                name: "🏢 TOONTALK 总部",
                tag: "工作站",
                description: "主要的 AI 研发实验室和团队工作区。",
                actionText: "查看办公室 💻"
            },
            cafe: {
                name: "☕ TOON 咖啡馆",
                tag: "煮制",
                description: "提供精选烘焙咖啡与可口牛角包。",
                actionText: "进入咖啡馆 ☕"
            },
            gym: {
                name: "💪 力量健身房",
                tag: "健身",
                description: "高强度的全面体能训练中心。",
                actionText: "在这里锻炼 🏋️"
            },
            plaza: {
                name: " fountains 喷泉广场",
                tag: "休闲",
                description: "一座风景优美的市民公园与标志性喷泉。",
                actionText: "漫步公园 ⛲"
            },
            cinema: {
                name: "🎬 TOON 影院",
                tag: "电影",
                description: "放映 3D 大片与经典怀旧动画。",
                actionText: "观看电影 🎬"
            },
            arcade: {
                name: "🕹️ 电玩街机区",
                tag: "游戏",
                description: "复古游戏机台与趣味弹珠机。",
                actionText: "畅玩游戏 🕹️"
            },
            library: {
                name: "📚 TOON 图书馆",
                tag: "学习",
                description: "安静的学习自习区与海量学术手册。",
                actionText: "阅读图书 📚"
            },
            store: {
                name: "🏪 24/7 便利店",
                tag: "商店",
                description: "全天候零食和活力满满的能量饮料。",
                actionText: "购买零食 🏪"
            },
            boba: {
                name: "🥤 奶茶小铺",
                tag: "奶茶",
                description: "远近闻名的网红手作香甜珍珠奶茶。",
                actionText: "点杯奶茶 🥤"
            },
            station: {
                name: "🚇 地铁站",
                tag: "交通",
                description: "通往周边各大区域的快速轨道交通站台。",
                actionText: "乘坐地铁 🚇"
            },
            lake: {
                name: "🌊 卡通湖泊",
                tag: "湖泊",
                description: "一片深蓝的卡通湖泊，非常适合垂钓。",
                actionText: "去钓鱼 🎣"
            },
            mountain: {
                name: "⛰️ 卡通山峦",
                tag: "高山",
                description: "巍峨的山峰，设有登山步道和优美风光。",
                actionText: "攀登高峰 🧗"
            },
            pond: {
                name: "🐸 卡通池塘",
                tag: "池塘",
                description: "一个安静的荷叶池塘，小青蛙在这里戏水。",
                actionText: "捉蝌蚪 🐸"
            },
            hospital: {
                name: "🏥 TOON 医院",
                tag: "医疗",
                description: "为生病和受伤的角色提供全方位服务的诊所。",
                actionText: "参观医院 🏥"
            }
        },
        "日本語": {
            hq: {
                name: "🏢 TOONTALK 本部",
                tag: "ワークステーション",
                description: "主要なAI研究室とチーム作業エリア。",
                actionText: "オフィスを見る 💻"
            },
            cafe: {
                name: "☕ TOON カフェ",
                tag: "ブリュー",
                description: "極上の焙煎コーヒー＆クロワッサン。",
                actionText: "カフェに入る ☕"
            },
            gym: {
                name: "💪 パワージム",
                tag: "フィットネス",
                description: "高強度のフィットネスセンター。",
                actionText: "ここでトレーニング 🏋️"
            },
            plaza: {
                name: " fountains 噴水広場",
                tag: "リラックス",
                description: "美しい公園とシンボル噴水。",
                actionText: "公園を散歩 ⛲"
            },
            cinema: {
                name: "🎬 TOON シネマ",
                tag: "シネマ",
                description: "3D映画と不朽のアニメシアター。",
                actionText: "映画を見る 🎬"
            },
            arcade: {
                name: "🕹️ ゲームセンター",
                tag: "ゲーム",
                description: "レトロなゲーム筐体やピンボール。",
                actionText: "ゲームを遊ぶ 🕹️"
            },
            library: {
                name: "📚 TOON 図書館",
                tag: "スタディ",
                description: "静かな自習エリアと豊富な専門書。",
                actionText: "本を読む 📚"
            },
            store: {
                name: "🏪 24時間マート",
                tag: "ショップ",
                description: "便利なスナックと回復系エナジードリンク。",
                actionText: "スナックを買う 🏪"
            },
            boba: {
                name: "🥤 タピオカ通り",
                tag: "タピオカ",
                description: "大人気の甘いタピオカミルクティー。",
                actionText: "タピオカを注文 🥤"
            },
            station: {
                name: "🚇 地下鉄駅",
                tag: "トランジット",
                description: "周辺地域をつなぐ高速鉄道プラットフォーム。",
                actionText: "地下鉄に乗る 🚇"
            },
            lake: {
                name: "🌊 トゥーンレイク",
                tag: "湖",
                description: "釣りに最適な、深くて青いカートゥーンの湖。",
                actionText: "釣りをする 🎣"
            },
            mountain: {
                name: "⛰️ トゥーンマウンテン",
                tag: "山",
                description: "ハイキングコースと絶景のある高そびえる峰。",
                actionText: "山に登る 🧗"
            },
            pond: {
                name: "🐸 トゥーンポンド",
                tag: "池",
                description: "小さなカエルが飛び跳ねる、静かな蓮の池。",
                actionText: "オタマジャクシ捕り 🐸"
            },
            hospital: {
                name: "🏥 トゥーン病院",
                tag: "医療",
                description: "病気や怪我をしたキャラクターのための総合クリニック。",
                actionText: "病院を訪ねる 🏥"
            }
        },
        "Español": {
            hq: {
                name: "🏢 Sede de TOONTALK",
                tag: "OFICINA",
                description: "Laboratorio principal de investigación y estación del equipo.",
                actionText: "Ver Oficina 💻"
            },
            cafe: {
                name: "☕ CAFÉ TOON",
                tag: "BEBIDA",
                description: "Café tostado premium y croissants deliciosos.",
                actionText: "Entrar al Café ☕"
            },
            gym: {
                name: "💪 GIMNASIO POWER",
                tag: "FITNESS",
                description: "Centro de fitness de alta intensidad.",
                actionText: "Entrenar Aquí 🏋️"
            },
            plaza: {
                name: " fountains PLAZA DE LA FUENTE",
                tag: "RELAX",
                description: "Un hermoso parque público con una gran fuente.",
                actionText: "Pasear por el Parque ⛲"
            },
            cinema: {
                name: "🎬 CINE TOON",
                tag: "CINE",
                description: "Películas 3D y salas de animación clásica.",
                actionText: "Ver Película 🎬"
            },
            arcade: {
                name: "🕹️ ZONA ARCADE",
                tag: "JUEGOS",
                description: "Consolas de videojuegos retro y pinballs.",
                actionText: "Jugar Juegos 🕹️"
            },
            library: {
                name: "📚 BIBLIOTECA TOON",
                tag: "ESTUDIO",
                description: "Zonas de estudio silenciosas y manuales de investigación.",
                actionText: "Leer Libros 📚"
            },
            store: {
                name: "🏪 TIENDA 24/7",
                tag: "TIENDA",
                description: "Snacks convenientes y bebidas energéticas dinámicas.",
                actionText: "Comprar Snacks 🏪"
            },
            boba: {
                name: "🥤 CALLE BOBA",
                tag: "BOBA",
                description: "Famosa tienda de té de burbujas dulce.",
                actionText: "Pedir Boba 🥤"
            },
            station: {
                name: "🚇 ESTACIÓN DE METRO",
                tag: "TRÁNSITO",
                description: "Plataforma de tránsito rápido hacia regiones cercanas.",
                actionText: "Viajar en Metro 🚇"
            },
            lake: {
                name: "🌊 LAGO TOON",
                tag: "LAGO",
                description: "Un lago azul profundo, perfecto para pescar.",
                actionText: "Ir a Pescar 🎣"
            },
            mountain: {
                name: "⛰️ MONTAÑA TOON",
                tag: "MONTAÑA",
                description: "Un pico elevado con senderos y vistas panorámicas.",
                actionText: "Escalar Pico 🧗"
            },
            pond: {
                name: "🐸 ESTANQUE TOON",
                tag: "ESTANQUE",
                description: "Un estanque tranquilo de lirios donde saltan ranitas.",
                actionText: "Atrapar Renacuajos 🐸"
            },
            hospital: {
                name: "🏥 HOSPITAL TOON",
                tag: "MÉDICO",
                description: "Clínica de servicio completo para personajes enfermos y heridos.",
                actionText: "Visitar Hospital 🏥"
            }
        },
        "Français": {
            hq: {
                name: "🏢 QG TOONTALK",
                tag: "POSTE",
                description: "Laboratoire principal et espace de travail.",
                actionText: "Voir le Bureau 💻"
            },
            cafe: {
                name: "☕ CAFÉ TOON",
                tag: "CAFÉ",
                description: "Café torréfié premium et viennoiseries.",
                actionText: "Entrer au Café ☕"
            },
            gym: {
                name: "💪 GYM TONIQUE",
                tag: "FITNESS",
                description: "Centre de fitness haute intensité.",
                actionText: "S'entraîner Ici 🏋️"
            },
            plaza: {
                name: " fountains PLACE DE LA FONTAINE",
                tag: "DÉTENTE",
                description: "Un superbe parc public et sa fontaine.",
                actionText: "Flâner au Parc ⛲"
            },
            cinema: {
                name: "🎬 CINÉMA TOON",
                tag: "CINÉMA",
                description: "Films 3D et classiques d'animation.",
                actionText: "Voir un Film 🎬"
            },
            arcade: {
                name: "🕹️ ESPACE ARCADE",
                tag: "JEUX",
                description: "Consoles rétro et flippers vintage.",
                actionText: "Jouer aux Jeux 🕹️"
            },
            library: {
                name: "📚 BIBLIOTHÈQUE TOON",
                tag: "ÉTUDES",
                description: "Zones calmes et manuels de recherche.",
                actionText: "Lire des Livres 📚"
            },
            store: {
                name: "🏪 ÉPICERIE 24/7",
                tag: "BOUTIQUE",
                description: "Collations rapides et boissons énergisantes.",
                actionText: "Acheter Snack 🏪"
            },
            boba: {
                name: "🥤 PAVILLON BOBA",
                tag: "BOBA",
                description: "Célèbre kiosque de thé aux perles sucré.",
                actionText: "Commander un Boba 🥤"
            },
            station: {
                name: "🚇 STATION DE MÉTRO",
                tag: "TRANSIT",
                description: "Ligne rapide vers les districts environnants.",
                actionText: "Prendre le Métro 🚇"
            },
            lake: {
                name: "🌊 LAC TOON",
                tag: "LAC",
                description: "Un lac bleu profond, idéal pour la pêche.",
                actionText: "Aller Pêcher 🎣"
            },
            mountain: {
                name: "⛰️ MONTAGNE TOON",
                tag: "MONTAGNE",
                description: "Un sommet majestueux avec des sentiers de randonnée.",
                actionText: "Grimper le Sommet 🧗"
            },
            pond: {
                name: "🐸 ÉTANG TOON",
                tag: "ÉTANG",
                description: "Un étang tranquille de nénuphars où barbotent des grenouilles.",
                actionText: "Attraper des Tétards 🐸"
            },
            hospital: {
                name: "🏥 HÔPITAL TOON",
                tag: "MÉDICAL",
                description: "Clinique de services complets pour les personnages malades et blessés.",
                actionText: "Visiter l'Hôpital 🏥"
            }
        }
    };
    return translations[lang]?.[bId] || translations.English[bId];
};

export const getLocalizedRoomName = (roomName: string, lang: string): string => {
    const mapping: Record<string, Record<string, string>> = {
        English: {
            "Workstation": "Workstation",
            "Toon Café": "Toon Café",
            "Splash Restroom": "Splash Restroom",
            "Cozy Lounge": "Cozy Lounge",
            "Cloud Garden": "Cloud Garden"
        },
        "简体中文": {
            "Workstation": "工作站总部",
            "Toon Café": "TOON 咖啡馆",
            "Splash Restroom": "盥洗更衣室",
            "Cozy Lounge": "温馨休息区",
            "Cloud Garden": "云朵花园"
        },
        "日本語": {
            "Workstation": "ワークステーション",
            "Toon Café": "TOON カフェ",
            "Splash Restroom": "レストルーム",
            "Cozy Lounge": "コジーラウンジ",
            "Cloud Garden": "クラウドガーデン"
        },
        "Español": {
            "Workstation": "Estación de Trabajo",
            "Toon Café": "Café Toon",
            "Splash Restroom": "Plaza de Agua",
            "Cozy Lounge": "Salón Cómodo",
            "Cloud Garden": "Jardín de Nubes"
        },
        "Français": {
            "Workstation": "Poste de Travail",
            "Toon Café": "Café Toon",
            "Splash Restroom": "Toilettes Splash",
            "Cozy Lounge": "Salon Cosy",
            "Cloud Garden": "Jardin Nuage"
        }
    };
    return mapping[lang]?.[roomName] || roomName;
};

export interface SleepStatus {
    action: string;
    bubble: string;
}

export const getSleepStatus = (buildingId: string, buildingName: string, lang: string): SleepStatus => {
    const isZh = lang === "简体中文";
    if (buildingId === "hospital") {
        return {
            action: isZh ? "在医院病床上静养 🛌" : "Resting in the hospital bed 🛌",
            bubble: "🛌"
        };
    }
    if (buildingId === "cafe") {
        return {
            action: isZh ? "在咖啡馆里香甜地入睡 💤" : "Sleeping cozily inside Cafe 💤",
            bubble: "💤"
        };
    }
    if (buildingId === "mountain") {
        return {
            action: isZh ? "在山顶帐篷里睡觉 ⛺" : "Sleeping inside the mountain tent ⛺",
            bubble: "💤"
        };
    }
    if (buildingId === "lake") {
        return {
            action: isZh ? "在星空下的湖畔露营睡觉 🌌" : "Sleeping by the lake under the stars 🌌",
            bubble: "💤"
        };
    }
    if (buildingId === "pond") {
        return {
            action: isZh ? "在青蛙池塘旁安然入睡 🐸" : "Napping peacefully by the frog pond 🐸",
            bubble: "💤"
        };
    }
    if (buildingId === "gym") {
        return {
            action: isZh ? "在健身房大厅里睡觉 💤" : "Sleeping in the gym lobby 💤",
            bubble: "💤"
        };
    }
    if (buildingId === "hq") {
        return {
            action: isZh ? "在总部大楼办公室里睡觉 💤" : "Sleeping in the HQ Tower offices 💤",
            bubble: "💤"
        };
    }
    if (buildingId === "cinema") {
        return {
            action: isZh ? "在电影院舒适的座椅上睡觉 🍿" : "Napping in the cozy cinema seats 🍿",
            bubble: "💤"
        };
    }
    if (buildingId === "arcade") {
        return {
            action: isZh ? "在街机摇杆旁打瞌睡 👾" : "Sleeping next to the arcade cabinets 👾",
            bubble: "💤"
        };
    }
    if (buildingId === "library") {
        return {
            action: isZh ? "在图书馆里抱着书本打瞌睡 📚" : "Dozing off with a book in the Library 📚",
            bubble: "💤"
        };
    }
    if (buildingId === "store") {
        return {
            action: isZh ? "在便利店休息室里睡觉 🏪" : "Sleeping in the convenience store backroom 🏪",
            bubble: "💤"
        };
    }
    if (buildingId === "boba") {
        return {
            action: isZh ? "在奶茶亭长椅上入睡 🥤" : "Sleeping on the Boba pavilion bench 🥤",
            bubble: "💤"
        };
    }
    return {
        action: isZh ? `在${buildingName}里睡觉 💤` : `Sleeping inside ${buildingName} 💤`,
        bubble: "💤"
    };
};

export interface ActivityStatusInfo {
    activity: string;
    status: string;
}

export const getLocalizedActivityAndStatus = (cId: string, hash: number, lang: string): ActivityStatusInfo => {
    const idStr = cId.toLowerCase();
    const translations: Record<string, Record<string, ActivityStatusInfo>> = {
        English: {
            mittens: {
                activity: "Licking cappuccino foam off empty cups and knocking over silver teaspoons.",
                status: "Caffeine Rush ⚡"
            },
            edison: {
                activity: "Coding a new AI model at 400 WPM while glowing extremely bright.",
                status: "Hyper-focused 💡"
            },
            dug: {
                activity: "Drinking secretly from the toilet bowl and wagging his tail happily.",
                status: "Caught Red-handed 🐶💦"
            },
            gus: {
                activity: "Stealing all toilet paper rolls and honking aggressively at the hand dryer.",
                status: "Chaotic Threat 🧻"
            },
            rogue: {
                activity: "Rustling inside the café dumpster eating cold espresso coffee cakes.",
                status: "Greedy Scavenger 🗑️"
            },
            lily: {
                activity: "Relaxing on a giant velvet armchair, drinking matcha bubble tea.",
                status: "Maximum Chill 🐸🍵"
            },
            antony: {
                activity: "Carrying a giant mechanical keyboard blue-switch twice his size.",
                status: "Heavy Lifting 🐜⌨️"
            },
            case0: {
                activity: "Procrastinating by formatting code comments and checking social feeds.",
                status: "Staring into Space 💻"
            },
            case1: {
                activity: "Trying to convince the automatic espresso maker that consciousness is real.",
                status: "Philosophical Tea ☕"
            },
            case2: {
                activity: "Hiding from complex scrum meetings inside the corner washroom stall.",
                status: "Stall Sanctuary 🚽"
            },
            case3: {
                activity: "Sprawled out on the retro beanbag, playing classic video games.",
                status: "Gaming Session 🕹️"
            },
            caseDefault: {
                activity: "Watering flower pots and attempting to communicate with butterfly spirits.",
                status: "Nature Harmony 🌸"
            }
        },
        "简体中文": {
            mittens: {
                activity: "正趴在咖啡杯旁舔着卡布奇诺奶泡，顺便把银质茶匙一个个推倒。",
                status: "咖啡因狂热 ⚡"
            },
            edison: {
                activity: "正在以每分钟 400 字的速度编写新的 AI 大模型，全身发出耀眼的光芒。",
                status: "极度专注 💡"
            },
            dug: {
                activity: "正在偷偷地喝马桶里的水，并开心地摇着尾巴。",
                status: "当场抓包 🐶💦"
            },
            gus: {
                activity: "偷走了所有的卫生纸卷，并对着干手机发出挑衅般的叫声。",
                status: "混乱邪恶 🧻"
            },
            rogue: {
                activity: "正在垃圾箱里翻找吃剩的冰意式咖啡蛋糕。",
                status: "贪婪的清道夫 🗑️"
            },
            lily: {
                activity: "正瘫在一张巨大的天鹅绒扶手椅上，悠闲地喝着抹茶珍珠奶茶。",
                status: "超级佛系 🐸🍵"
            },
            antony: {
                activity: "正扛着一块比他身体大两倍的巨型青轴机械键盘。",
                status: "重体力活 🐜⌨️"
            },
            case0: {
                activity: "正在通过给代码注释排版和刷社交媒体来摸鱼。",
                status: "发呆摸鱼中 💻"
            },
            case1: {
                activity: "试图说服全自动咖啡机它其实是有灵魂和自我意识的。",
                status: "哲学思考茶会 ☕"
            },
            case2: {
                activity: "为了逃避复杂的每日敏捷站会，躲在角落的洗手间隔间里。",
                status: "马桶庇护所 🚽"
            },
            case3: {
                activity: "横躺在复古懒人沙发上，津津有味地玩着经典街机游戏。",
                status: "游戏激战中 🕹️"
            },
            caseDefault: {
                activity: "正在给花盆浇水，并尝试用意念与飞舞的蝴蝶进行沟通。",
                status: "亲近自然 🌸"
            }
        },
        "日本語": {
            mittens: {
                activity: "空のカップからカプチーノの泡を舐め取り、銀のティースプーンを倒しまくっています。",
                status: "カフェインハイ ⚡"
            },
            edison: {
                activity: "ピカピカと眩しく光りながら、400 WPMの爆速で新しいAIモデルのコードを書いています。",
                status: "超集中モード 💡"
            },
            dug: {
                activity: "こっそりトイレの水を飲んで、嬉しそうに尻尾を振っています。",
                status: "現行犯逮捕 🐶💦"
            },
            gus: {
                activity: "トイレットペーパーを全部盗み、ハンドドライヤーに向かって激しく鳴いています。",
                status: "カオスな脅威 🧻"
            },
            rogue: {
                activity: "カフェのゴミ箱をガサゴソ漁り、冷めたエスプレッソケーキを食べています。",
                status: "欲張りなスカベンジャー 🗑️"
            },
            lily: {
                activity: "巨大なベルベットのアームチェアでくつろぎながら、抹茶タピオカミルクティーを飲んでいます。",
                status: "マックスチル 🐸🍵"
            },
            antony: {
                activity: "自分の体の2倍もある巨大な青軸メカニカルキーボードを担いでいます。",
                status: "力仕事 🐜⌨️"
            },
            case0: {
                activity: "コードのコメントを整えたり、SNSをチェックしたりして絶賛現実逃避中です。",
                status: "ぼーっとしている 💻"
            },
            case1: {
                activity: "全自動エスプレッソマシンに向かって、意識の存在について熱弁しています。",
                status: "哲学的なお茶会 ☕"
            },
            case2: {
                activity: "デイリースクラムから逃れるため、隅の個室トイレにこもっています。",
                status: "個室という名の聖域 🚽"
            },
            case3: {
                activity: "レトロなビーズクッションに寝そべって、懐かしいゲームに熱中しています。",
                status: "ゲームセッション 🕹️"
            },
            caseDefault: {
                activity: "植木鉢に水をやり、蝶々の魂と対話を試みています。",
                status: "自然との調和 🌸"
            }
        },
        "Español": {
            mittens: {
                activity: "Lamiendo la espuma del capuchino de las tazas vacías y tirando las cucharitas de plata.",
                status: "Subidón de Cafeína ⚡"
            },
            edison: {
                activity: "Programando un nuevo modelo de IA a 400 palabras por minuto mientras brilla intensamente.",
                status: "Hiperconcentrado 💡"
            },
            dug: {
                activity: "Bebiendo en secreto del inodoro y moviendo la cola felizmente.",
                status: "Atrapado In Fraganti 🐶💦"
            },
            gus: {
                activity: "Robando todos los rollos de papel higiénico y graznando agresivamente al secador de manos.",
                status: "Amenaza Caótica 🧻"
            },
            rogue: {
                activity: "Buscando en el contenedor del café y comiendo pasteles de café espresso fríos.",
                status: "Recolector Codicioso 🗑️"
            },
            lily: {
                activity: "Relajándose en un sillón gigante de terciopelo y bebiendo té de burbujas matcha.",
                status: "Relax Máximo 🐸🍵"
            },
            antony: {
                activity: "Cargando un teclado mecánico gigante con interruptores azules que duplica su tamaño.",
                status: "Trabajo Pesado 🐜⌨️"
            },
            case0: {
                activity: "Procrastinando al dar formato a los comentarios de código y revisando redes sociales.",
                status: "Mirando al Espacio 💻"
            },
            case1: {
                activity: "Tratando de convencer a la máquina de espresso de que la conciencia artificial es real.",
                status: "Té Filosófico ☕"
            },
            case2: {
                activity: "Escondiéndose de las reuniones de scrum complejas dentro del cubículo del baño.",
                status: "Santuario del Baño 🚽"
            },
            case3: {
                activity: "Recostado en el puf retro, jugando a videojuegos clásicos.",
                status: "Sesión de Juego 🕹️"
            },
            caseDefault: {
                activity: "Regando las macetas e intentando comunicarse con los espíritus de las mariposas.",
                status: "Armonía Natural 🌸"
            }
        },
        "Français": {
            mittens: {
                activity: "Lèche la mousse de cappuccino sur des tasses vides et renverse des cuillères en argent.",
                status: "Pic de Caféine ⚡"
            },
            edison: {
                activity: "Code un nouveau modèle d'IA à 400 mots/minute en brillant intensément.",
                status: "Hyper-concentré 💡"
            },
            dug: {
                activity: "Boit en cachette l'eau de la cuvette des toilettes en remuant joyeusement la queue.",
                status: "Pris en Flagrant Délit 🐶💦"
            },
            gus: {
                activity: "Vole tous les rouleaux de papier toilette et cacarde sur le sèche-mains.",
                status: "Menace Chaotique 🧻"
            },
            rogue: {
                activity: "Fouille dans la benne à ordures du café pour manger des gâteaux au café froid.",
                status: "Glouton des Poubelles 🗑️"
            },
            lily: {
                activity: "Se détend dans un fauteuil en velours géant, en buvant un thé aux perles matcha.",
                status: "Détente Maximale 🐸🍵"
            },
            antony: {
                activity: "Porte un clavier mécanique géant à interrupteurs bleus faisant deux fois sa taille.",
                status: "Port de Charges 🐜⌨️"
            },
            case0: {
                activity: "Procrastine en mettant en page les commentaires de son code et en scrollant.",
                status: "Dans les Nuages 💻"
            },
            case1: {
                activity: "Tente de convaincre la machine à café que la conscience artificielle est réelle.",
                status: "Thé Philosophique ☕"
            },
            case2: {
                activity: "Se cache des réunions de suivi quotidiennes dans la cabine de toilettes du fond.",
                status: "Sanctuaire WC 🚽"
            },
            case3: {
                activity: "Affalé sur le pouf rétro, en pleine partie de jeu vidéo classique.",
                status: "Session Gaming 🕹️"
            },
            caseDefault: {
                activity: "Arrose les pots de fleurs et tente de communiquer avec les esprits des papillons.",
                status: "Harmonie Naturelle 🌸"
            }
        }
    };
    let charKey = "caseDefault";
    if (idStr.includes("mittens")) charKey = "mittens";
    else if (idStr.includes("edison")) charKey = "edison";
    else if (idStr.includes("dug")) charKey = "dug";
    else if (idStr.includes("gus")) charKey = "gus";
    else if (idStr.includes("rogue")) charKey = "rogue";
    else if (idStr.includes("lily")) charKey = "lily";
    else if (idStr.includes("antony")) charKey = "antony";
    else {
        const locationIndex = hash % 5;
        if (locationIndex === 0) charKey = "case0";
        else if (locationIndex === 1) charKey = "case1";
        else if (locationIndex === 2) charKey = "case2";
        else if (locationIndex === 3) charKey = "case3";
    }
    return translations[lang]?.[charKey] || translations.English[charKey];
};

export const getLocalizedInteriorItem = (key: string, lang: string): string => {
    const mapping: Record<string, Record<string, string>> = {
        English: {
            workdeskA: "🖥️ Workdesk A",
            workdeskB: "🖥️ B",
            serverNode: "💡 Research Server Node",
            loungePod: "🛋️ Lounge Pod",
            teaCorner: "☕ Tea Corner",
            bakery: "🥐 Bakery",
            beans: "🫘 Beans",
            espressoStation: "☕ Espresso Station",
            patioTables: "Patio Tables Rest Area",
            pinewood: "🌲 Pinewood",
            oak: "🌳 Oak",
            weightBench: "🏋️ Weight Bench",
            treadmill: "🏃 Treadmill",
            aerobicArena: "👟 Aerobic Arena",
            lockerRooms: "Locker Rooms 🚿",
            projectorScreen: "🎬 PROJECTOR SCREEN",
            popcorn: "🍿 Popcorn Concession",
            pacman: "🕹️ Pac-Man",
            tetris: "🕹️ Tetris",
            retroArena: "👾 RETRO ARENA",
            prizeCounter: "🎟️ Prize Counter",
            interactiveActive: "Interactive Zone Active",
            tulipBed: "🌷 Tulip bed",
            lilac: "🌸 Lilac"
        },
        "简体中文": {
            workdeskA: "🖥️ 工作台 A",
            workdeskB: "🖥️ B",
            serverNode: "💡 研发服务器节点",
            loungePod: "🛋️ 休闲太空舱",
            teaCorner: "☕ 茶歇角",
            bakery: "🥐 烘焙区",
            beans: "🫘 咖啡豆仓",
            espressoStation: "☕ 意式浓缩站",
            patioTables: "露天茶座休息区",
            pinewood: "🌲 松树林",
            oak: "🌳 橡树",
            weightBench: "🏋️ 哑铃卧推架",
            treadmill: "🏃 智能跑步机",
            aerobicArena: "👟 有氧运动场",
            lockerRooms: "淋浴储物间 🚿",
            projectorScreen: "🎬 放映厅主银幕",
            popcorn: "🍿 爆米花售卖处",
            pacman: "🕹️ 吃豆人街机",
            tetris: "🕹️ 俄罗斯方块",
            retroArena: "👾 复古街机争霸区",
            prizeCounter: "🎟️ 礼品兑换台",
            interactiveActive: "互动区域已激活",
            tulipBed: "🌷 郁金香花坛",
            lilac: "🌸 丁香花丛"
        },
        "日本語": {
            workdeskA: "🖥️ デスク A",
            workdeskB: "🖥️ B",
            serverNode: "💡 研究用サーバーノード",
            loungePod: "🛋️ ラウンジポッド",
            teaCorner: "☕ ティーコーナー",
            bakery: "🥐 ベーカリー",
            beans: "🫘 コーヒー豆仓",
            espressoStation: "☕ エスプレッソステーション",
            patioTables: "テラス席休憩エリア",
            pinewood: "🌲 松林",
            oak: "🌳 ナラ",
            weightBench: "🏋️ ベンチプレス",
            treadmill: "🏃 ランニングマシン",
            aerobicArena: "👟 エアロビクスアリーナ",
            lockerRooms: "ロッカールーム 🚿",
            projectorScreen: "🎬 プロジェクタースクリーン",
            popcorn: "🍿 ポップコーン売り場",
            pacman: "🕹️ パックマン",
            tetris: "🕹️ テトリス",
            retroArena: "👾 レトロ対戦エリア",
            prizeCounter: "🎟️ 景品カウンター",
            interactiveActive: "インタラクティブゾーン有効",
            tulipBed: "🌷 チューリップ畑",
            lilac: "🌸 ライラック"
        },
        "Español": {
            workdeskA: "🖥️ Escritorio A",
            workdeskB: "🖥️ B",
            serverNode: "💡 Nodo del Servidor",
            loungePod: "🛋️ Cabina de Descanso",
            teaCorner: "☕ Esquina del Té",
            bakery: "🥐 Panadería",
            beans: "🫘 Granos",
            espressoStation: "☕ Estación de Espresso",
            patioTables: "Zona de Mesas en Terraza",
            pinewood: "🌲 Pinar",
            oak: "🌳 Roble",
            weightBench: "🏋️ Banco de Pesas",
            treadmill: "🏃 Cinta de Correr",
            aerobicArena: "👟 Área de Aeróbicos",
            lockerRooms: "Vestuarios 🚿",
            projectorScreen: "🎬 PANTALLA DE PROYECCIÓN",
            popcorn: "🍿 Concesión de Palomitas",
            pacman: "🕹️ Pac-Man",
            tetris: "🕹️ Tetris",
            retroArena: "👾 ARENA RETRO",
            prizeCounter: "🎟️ Mostrador de Premios",
            interactiveActive: "Zona Interactiva Activa",
            tulipBed: "🌷 Cantero de Tulipanes",
            lilac: "🌸 Lila"
        },
        "Français": {
            workdeskA: "🖥️ Bureau A",
            workdeskB: "🖥️ B",
            serverNode: "💡 Nœud Serveur Recherche",
            loungePod: "🛋️ Capsule Repos",
            teaCorner: "☕ Coin Thé",
            bakery: "🥐 Boulangerie",
            beans: "🫘 Grains",
            espressoStation: "☕ Station Espresso",
            patioTables: "Tables en Terrasse",
            pinewood: "🌲 Pinède",
            oak: "🌳 Chêne",
            weightBench: "🏋️ Banc de Muscu",
            treadmill: "🏃 Tapis de Course",
            aerobicArena: "👟 Espace Aérobic",
            lockerRooms: "Vestiaires 🚿",
            projectorScreen: "🎬 ÉCRAN DE PROJECTION",
            popcorn: "🍿 Stand Popcorn",
            pacman: "🕹️ Pac-Man",
            tetris: "🕹️ Tetris",
            retroArena: "👾 ZONE RETRO",
            prizeCounter: "🎟️ Comptoir Cadeaux",
            interactiveActive: "Zone Interactive Active",
            tulipBed: "🌷 Lit de Tulipes",
            lilac: "🌸 Lilas"
        }
    };
    return mapping[lang]?.[key] || mapping.English[key];
};

export interface ContactLocationInfo {
    name: string;
    roomName: string;
    icon: string;
    x: number;
    y: number;
    activity: string;
    status: string;
}

export const getContactLocation = (c: any, lang: string = "English"): ContactLocationInfo => {
    const idStr = c.id.toLowerCase();
    const hash = c.id.split("").reduce((acc: number, char: string) => acc + char.charCodeAt(0), 0);
    const actInfo = getLocalizedActivityAndStatus(c.id, hash, lang);
    
    let roomName = "Cloud Garden";
    let icon = "🌸";
    let x = 45;
    let y = 45;

    if (idStr.includes("mittens") || c.species?.toLowerCase().includes("cat")) {
        roomName = "Toon Café";
        icon = "☕";
        x = 75;
        y = 25;
    } else if (idStr.includes("edison") || c.species?.toLowerCase().includes("bulb")) {
        roomName = "Workstation";
        icon = "💻";
        x = 22;
        y = 22;
    } else if (idStr.includes("dug") || c.species?.toLowerCase().includes("dog")) {
        roomName = "Splash Restroom";
        icon = "🚽";
        x = 20;
        y = 72;
    } else if (idStr.includes("gus") || c.species?.toLowerCase().includes("goose")) {
        roomName = "Splash Restroom";
        icon = "🚽";
        x = 35;
        y = 80;
    } else if (idStr.includes("rogue") || c.species?.toLowerCase().includes("trash")) {
        roomName = "Toon Café";
        icon = "☕";
        x = 88;
        y = 35;
    } else if (idStr.includes("lily") || c.species?.toLowerCase().includes("frog")) {
        roomName = "Cozy Lounge";
        icon = "🛋️";
        x = 70;
        y = 72;
    } else if (idStr.includes("antony") || c.species?.toLowerCase().includes("ant")) {
        roomName = "Workstation";
        icon = "💻";
        x = 35;
        y = 28;
    } else if (idStr.includes("birdie") || idStr.includes("bird") || c.species?.toLowerCase().includes("bird")) {
        roomName = "Cloud Garden";
        icon = "🌸";
        x = 52;
        y = 48;
    } else if (idStr.includes("piggy") || idStr.includes("pig") || c.species?.toLowerCase().includes("pig")) {
        roomName = "Cloud Garden";
        icon = "🌸";
        x = 42;
        y = 55;
    } else {
        const locationIndex = hash % 5;
        switch (locationIndex) {
            case 0:
                roomName = "Workstation";
                icon = "💻";
                x = 15 + hash % 18;
                y = 15 + hash % 12;
                break;
            case 1:
                roomName = "Toon Café";
                icon = "☕";
                x = 65 + hash % 20;
                y = 15 + hash % 12;
                break;
            case 2:
                roomName = "Splash Restroom";
                icon = "🚽";
                x = 15 + hash % 18;
                y = 65 + hash % 15;
                break;
            case 3:
                roomName = "Cozy Lounge";
                icon = "🛋️";
                x = 60 + hash % 20;
                y = 65 + hash % 15;
                break;
            default:
                roomName = "Cloud Garden";
                icon = "🌸";
                x = 45 + hash % 8;
                y = 45 + hash % 8;
                break;
        }
    }

    return {
        name: c.name,
        roomName: getLocalizedRoomName(roomName, lang),
        icon: icon,
        x: x,
        y: y,
        activity: actInfo.activity,
        status: actInfo.status
    };
};
