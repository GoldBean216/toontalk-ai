import { MapBuilding, Street } from './types';

export const DEFAULT_BUILDINGS: MapBuilding[] = [
    {
        id: "hq",
        name: "\uD83C\uDFE2 TOONTALK HQ",
        type: "office",
        x: -500,
        y: -400,
        width: 200,
        height: 240,
        emoji: "\uD83C\uDFE2",
        description: "Main research lab and team workstation.",
        tag: "WORKSTATION",
        actionText: "View Office \uD83D\uDCBB",
        functions: [
            {
                id: "hq-news",
                name: "News Collection",
                type: "skill",
                skillId: "wise_mentor",
                description: "Collects latest news and industry updates.",
                assigneeId: "Edison"
            }
        ]
    },
    {
        id: "cafe",
        name: "☕ TOON CAFÉ",
        type: "shop",
        x: 450,
        y: -350,
        width: 180,
        height: 220,
        emoji: "\uD83E\uDD50",
        description: "Premium roasted coffee & croissants.",
        tag: "BREW",
        actionText: "Enter Café ☕",
        functions: [
            {
                id: "cafe-coupons",
                name: "Coupon System",
                type: "skill",
                skillId: "storyteller",
                description: "Distributes daily coupons and tracks queueing.",
                assigneeId: "Mittens"
            }
        ]
    },
    {
        id: "gym",
        name: "\uD83D\uDCAA POWER GYM",
        type: "training",
        x: -600,
        y: 150,
        width: 180,
        height: 180,
        emoji: "\uD83C\uDFC3",
        description: "High-intensity fitness center.",
        tag: "FITNESS",
        actionText: "Train Here \uD83C\uDFCB️"
    },
    {
        id: "plaza",
        name: "⛲ FOUNTAIN PLAZA",
        type: "park",
        x: -150,
        y: -80,
        width: 220,
        height: 200,
        emoji: "\uD83C\uDF33",
        description: "A beautiful public park and fountain.",
        tag: "RELAX",
        actionText: "Stroll Park ⛲"
    },
    {
        id: "cinema",
        name: "\uD83C\uDFAC TOON CINEMA",
        type: "entertainment",
        x: 550,
        y: 100,
        width: 180,
        height: 180,
        emoji: "\uD83C\uDF9F️",
        description: "3D movies and classic animation theatres.",
        tag: "CINEMA",
        actionText: "Watch Movie \uD83C\uDFAC",
        functions: [
            {
                id: "cinema-shows",
                name: "Showtimes Info",
                type: "info",
                description: "Displays current and upcoming movie showtimes."
            }
        ]
    },
    {
        id: "arcade",
        name: "\uD83C\uDFAE ARCADE ZONE",
        type: "entertainment",
        x: 350,
        y: 400,
        width: 180,
        height: 200,
        emoji: "\uD83D\uDD79️",
        description: "Retro game consoles and pinball machines.",
        tag: "GAMES",
        actionText: "Play Games \uD83C\uDFAE"
    },
    // Expanded dynamic buildings in outer quadrants
    {
        id: "library",
        name: "\uD83D\uDCDA TOON LIBRARY",
        type: "education",
        x: -1100,
        y: -600,
        width: 200,
        height: 220,
        emoji: "\uD83C\uDFEB",
        description: "Silent study zones and research manuals.",
        tag: "STUDY",
        actionText: "Read Books \uD83D\uDCDA"
    },
    {
        id: "store",
        name: "\uD83C\uDFEA 24/7 MART",
        type: "shop",
        x: 1000,
        y: -750,
        width: 180,
        height: 180,
        emoji: "\uD83C\uDF71",
        description: "Convenience snacks and dynamic energy drinks.",
        tag: "SHOP",
        actionText: "Buy Snacks \uD83C\uDFEA"
    },
    {
        id: "boba",
        name: "\uD83E\uDDCB BOBA STREET",
        type: "shop",
        x: -800,
        y: 650,
        width: 160,
        height: 200,
        emoji: "\uD83C\uDF6A",
        description: "Famous sweet bubble tea shop.",
        tag: "BOBA",
        actionText: "Order Boba \uD83E\uDDCB"
    },
    {
        id: "station_a",
        name: "🚇 METRO STATION A",
        type: "transit",
        x: 1100,
        y: 500,
        width: 180,
        height: 180,
        emoji: "🎫",
        description: "Metro subway gateway (Line Start).",
        tag: "TRANSIT",
        actionText: "Ride Metro 🚇",
        linkedMetroId: "station_b"
    },
    {
        id: "station_b",
        name: "🚇 METRO STATION B",
        type: "transit",
        x: -1100,
        y: 200,
        width: 180,
        height: 180,
        emoji: "🎫",
        description: "Metro subway gateway (Line End).",
        tag: "TRANSIT",
        actionText: "Ride Metro 🚇",
        linkedMetroId: "station_a"
    },
    {
        id: "lake",
        name: "\uD83C\uDF0A TOON LAKE",
        type: "lake",
        x: 800,
        y: -150,
        width: 240,
        height: 200,
        emoji: "\uD83C\uDFA3",
        description: "A deep blue cartoon lake, perfect for fishing.",
        tag: "LAKE",
        actionText: "Go Fishing \uD83C\uDFA3"
    },
    {
        id: "mountain",
        name: "⛰️ TOON MOUNTAIN",
        type: "mountain",
        x: -950,
        y: 0,
        width: 200,
        height: 220,
        emoji: "\uD83E\uDDD7",
        description: "A soaring peak with hiking trails and scenic views.",
        tag: "MOUNTAIN",
        actionText: "Climb Peak \uD83E\uDDD7"
    },
    {
        id: "pond",
        name: "\uD83D\uDC38 TOON POND",
        type: "pond",
        x: -100,
        y: 500,
        width: 160,
        height: 160,
        emoji: "\uD83D\uDC38",
        description: "A quiet lily pad pond where small frogs splash.",
        tag: "POND",
        actionText: "Catch Tadpoles 🐸"
    },
    {
        id: "hospital",
        name: "🏥 TOON HOSPITAL",
        type: "hospital",
        x: -400,
        y: 360,
        width: 180,
        height: 200,
        emoji: "🏥",
        description: "Medical care and healing center for sick toons.",
        tag: "MEDICAL",
        actionText: "Visit Hospital 🏥"
    }
];

// Defining an interconnected cartoon street network connecting the buildings
export const DEFAULT_STREETS: Street[] = [
    // Horizontal highways
    {
        id: "h1",
        type: "h",
        coord: -480,
        start: -1280,
        end: 1200,
        roadStyle: "two-lane"
    },
    {
        id: "h2",
        type: "h",
        coord: -80,
        start: -800,
        end: 800,
        roadStyle: "two-lane"
    },
    {
        id: "h3",
        type: "h",
        coord: 400,
        start: -1000,
        end: 1280,
        roadStyle: "two-lane"
    },
    // Vertical avenues
    {
        id: "v1",
        type: "v",
        coord: -1080,
        start: -760,
        end: 480,
        roadStyle: "two-lane"
    },
    {
        id: "v2",
        type: "v",
        coord: -480,
        start: -600,
        end: 600,
        roadStyle: "two-lane"
    },
    {
        id: "v3",
        type: "v",
        coord: -160,
        start: -480,
        end: 400,
        roadStyle: "two-lane"
    },
    {
        id: "v4",
        type: "v",
        coord: 440,
        start: -600,
        end: 600,
        roadStyle: "two-lane"
    },
    {
        id: "v5",
        type: "v",
        coord: 1000,
        start: -880,
        end: 680,
        roadStyle: "two-lane"
    }
];

export const BUILDING_CATALOG_TEMPLATES = [
    {
        name: "\uD83C\uDFE2 TOONTALK HQ",
        type: "office",
        emoji: "\uD83C\uDFE2",
        tag: "WORKSTATION",
        width: 200,
        height: 240,
        description: "Team office and control room."
    },
    {
        name: "☕ TOON CAFÉ",
        type: "shop",
        emoji: "\uD83E\uDD50",
        tag: "BREW",
        width: 180,
        height: 220,
        description: "Freshly ground coffee shop."
    },
    {
        name: "\uD83D\uDCAA POWER GYM",
        type: "training",
        emoji: "\uD83C\uDFC3",
        tag: "FITNESS",
        width: 180,
        height: 180,
        description: "Workout and train center."
    },
    {
        name: "⛲ FOUNTAIN PLAZA",
        type: "park",
        emoji: "\uD83C\uDF33",
        tag: "RELAX",
        width: 220,
        height: 200,
        description: "Lovely public park plaza."
    },
    {
        name: "\uD83C\uDFAC TOON CINEMA",
        type: "entertainment",
        emoji: "\uD83C\uDF9F️",
        tag: "CINEMA",
        width: 180,
        height: 180,
        description: "Classic movie theater."
    },
    {
        name: "\uD83C\uDFAE ARCADE ZONE",
        type: "entertainment",
        emoji: "\uD83D\uDD79️",
        tag: "GAMES",
        width: 180,
        height: 200,
        description: "Arcade video gaming zone."
    },
    {
        name: "\uD83D\uDCDA TOON LIBRARY",
        type: "education",
        emoji: "\uD83C\uDFEB",
        tag: "STUDY",
        width: 200,
        height: 220,
        description: "Silent books collection."
    },
    {
        name: "\uD83C\uDFEA 24/7 MART",
        type: "shop",
        emoji: "\uD83C\uDF71",
        tag: "SHOP",
        width: 180,
        height: 180,
        description: "Convenience snack store."
    },
    {
        name: "\uD83E\uDDCB BOBA STREET",
        type: "shop",
        emoji: "\uD83C\uDF6A",
        tag: "BOBA",
        width: 160,
        height: 200,
        description: "Bubble milk tea stall."
    },
    {
        id: "station",
        name: "🚉 METRO STATION",
        type: "transit",
        emoji: "📇",
        tag: "TRANSIT",
        width: 180,
        height: 180,
        description: "Metro subway gateway."
    },
    {
        name: "🏥 TOON HOSPITAL",
        type: "hospital",
        emoji: "🏥",
        tag: "MEDICAL",
        width: 180,
        height: 200,
        description: "Medical care and healing center for sick toons."
    }
];

export const DECOR_TEMPLATES = [
    {
        name: "\uD83C\uDFE1 Toon Villa",
        type: "home",
        emoji: "\uD83C\uDFE1",
        tag: "VILLA",
        width: 160,
        height: 160,
        description: "A cozy house for cartoon toons."
    },
    {
        name: "\uD83C\uDF66 Ice Cream Parlor",
        type: "shop",
        emoji: "\uD83C\uDF66",
        tag: "SWEET",
        width: 140,
        height: 160,
        description: "Delicious frozen treats."
    },
    {
        name: "\uD83C\uDFA1 Ferris Wheel",
        type: "park",
        emoji: "\uD83C\uDFA1",
        tag: "AMUSEMENT",
        width: 200,
        height: 240,
        description: "Fabulous spinning wheel ride."
    },
    {
        name: "\uD83D\uDDFD Liberty Statue",
        type: "landmark",
        emoji: "\uD83D\uDDFD",
        tag: "MONUMENT",
        width: 140,
        height: 220,
        description: "Monument of Toon liberty."
    },
    {
        name: "\uD83C\uDF33 Cozy Mini Park",
        type: "park",
        emoji: "\uD83C\uDF33",
        tag: "GARDEN",
        width: 120,
        height: 120,
        description: "A small relaxing patch of green."
    },
    {
        name: "\uD83C\uDF6D Candy Shop",
        type: "shop",
        emoji: "\uD83C\uDF6D",
        tag: "CANDY",
        width: 140,
        height: 160,
        description: "Jellybeans and lollipops."
    },
    {
        name: "\uD83C\uDF0A Toon Lake",
        type: "lake",
        emoji: "\uD83C\uDFA3",
        tag: "LAKE",
        width: 240,
        height: 200,
        description: "A deep blue cartoon lake, perfect for fishing."
    },
    {
        name: "⛰️ Toon Mountain",
        type: "mountain",
        emoji: "\uD83E\uDDD7",
        tag: "MOUNTAIN",
        width: 200,
        height: 220,
        description: "A soaring peak with hiking trails."
    },
    {
        name: "\uD83D\uDC38 Toon Pond",
        type: "pond",
        emoji: "\uD83D\uDC38",
        tag: "POND",
        width: 160,
        height: 160,
        description: "A quiet lily pad pond where small frogs splash."
    }
];

export const MAP_TEMPLATES = [
    {
        name: "Default Town",
        description: "The standard interconnected starter town layout.",
        emoji: "\uD83C\uDFD9️",
        buildings: DEFAULT_BUILDINGS,
        streets: DEFAULT_STREETS
    },
    {
        name: "Cozy Villa Village",
        description: "A quiet, cute residential suburb with villas and parks.",
        emoji: "\uD83C\uDFE1",
        buildings: [
            {
                id: "villa1",
                name: "\uD83C\uDFE1 TOON VILLA A",
                type: "home",
                x: -360,
                y: -240,
                width: 160,
                height: 160,
                emoji: "\uD83C\uDFE1",
                description: "A cozy house for cartoon toons.",
                tag: "VILLA",
                actionText: "Enter Villa \uD83C\uDFE1"
            },
            {
                id: "villa2",
                name: "\uD83C\uDFE1 TOON VILLA B",
                type: "home",
                x: 360,
                y: -240,
                width: 160,
                height: 160,
                emoji: "\uD83C\uDFE1",
                description: "A cozy house for cartoon toons.",
                tag: "VILLA",
                actionText: "Enter Villa \uD83C\uDFE1"
            },
            {
                id: "cafe",
                name: "☕ TOON CAFÉ",
                type: "shop",
                x: -360,
                y: 200,
                width: 180,
                height: 220,
                emoji: "\uD83E\uDD50",
                description: "Premium roasted coffee & croissants.",
                tag: "BREW",
                actionText: "Enter Café ☕"
            },
            {
                id: "boba",
                name: "\uD83E\uDDCB BOBA STREET",
                type: "shop",
                x: 360,
                y: 200,
                width: 160,
                height: 200,
                emoji: "\uD83C\uDF6A",
                description: "Famous sweet bubble tea shop.",
                tag: "BOBA",
                actionText: "Order Boba \uD83E\uDDCB"
            },
            {
                id: "plaza",
                name: "⛲ FOUNTAIN PLAZA",
                type: "park",
                x: 0,
                y: -120,
                width: 220,
                height: 200,
                emoji: "\uD83C\uDF33",
                description: "A beautiful public park and fountain.",
                tag: "RELAX",
                actionText: "Stroll Park ⛲"
            }
        ],
        streets: [
            {
                id: "h1",
                type: "h",
                coord: -80,
                start: -800,
                end: 800,
                roadStyle: "two-lane"
            },
            {
                id: "h2",
                type: "h",
                coord: 320,
                start: -800,
                end: 800,
                roadStyle: "two-lane"
            },
            {
                id: "v1",
                type: "v",
                coord: -480,
                start: -400,
                end: 400,
                roadStyle: "two-lane"
            },
            {
                id: "v2",
                type: "v",
                coord: 480,
                start: -400,
                end: 400,
                roadStyle: "two-lane"
            },
            {
                id: "v3",
                type: "v",
                coord: 0,
                start: -400,
                end: 400,
                roadStyle: "two-lane"
            }
        ]
    },
    {
        name: "Metropolitan Hub",
        description: "A high-density commercial layout centered around transit.",
        emoji: "\uD83C\uDFE2",
        buildings: [
            {
                id: "hq",
                name: "\uD83C\uDFE2 TOONTALK HQ",
                type: "office",
                x: -400,
                y: -400,
                width: 200,
                height: 240,
                emoji: "\uD83C\uDFE2",
                description: "Main research lab and team workstation.",
                tag: "WORKSTATION",
                actionText: "View Office \uD83D\uDCBB"
            },
            {
                id: "station",
                name: "\uD83D\uDE87 METRO STATION",
                type: "transit",
                x: 400,
                y: -400,
                width: 180,
                height: 180,
                emoji: "\uD83C\uDFAB",
                description: "Rapid transit platform to surrounding regions.",
                tag: "TRANSIT",
                actionText: "Ride Metro \uD83D\uDE87"
            },
            {
                id: "cinema",
                name: "\uD83C\uDFAC TOON CINEMA",
                type: "entertainment",
                x: -400,
                y: 400,
                width: 180,
                height: 180,
                emoji: "\uD83C\uDF9F️",
                description: "3D movies and classic animation theatres.",
                tag: "CINEMA",
                actionText: "Watch Movie \uD83C\uDFAC"
            },
            {
                id: "arcade",
                name: "\uD83C\uDFAE ARCADE ZONE",
                type: "entertainment",
                x: 400,
                y: 400,
                width: 180,
                height: 200,
                emoji: "\uD83D\uDD79️",
                description: "Retro game consoles and pinball machines.",
                tag: "GAMES",
                actionText: "Play Games \uD83C\uDFAE"
            },
            {
                id: "library",
                name: "\uD83D\uDCDA TOON LIBRARY",
                type: "education",
                x: 0,
                y: -400,
                width: 200,
                height: 220,
                emoji: "\uD83C\uDFEB",
                description: "Silent study zones and research manuals.",
                tag: "STUDY",
                actionText: "Read Books \uD83D\uDCDA"
            },
            {
                id: "store",
                name: "\uD83C\uDFEA 24/7 MART",
                type: "shop",
                x: 0,
                y: 400,
                width: 180,
                height: 180,
                emoji: "\uD83C\uDF71",
                description: "Convenience snacks and dynamic energy drinks.",
                tag: "SHOP",
                actionText: "Buy Snacks \uD83C\uDFEA"
            }
        ],
        streets: [
            {
                id: "h1",
                type: "h",
                coord: -480,
                start: -1000,
                end: 1000,
                roadStyle: "two-lane"
            },
            {
                id: "h2",
                type: "h",
                coord: 0,
                start: -1000,
                end: 1000,
                roadStyle: "two-lane"
            },
            {
                id: "h3",
                type: "h",
                coord: 480,
                start: -1000,
                end: 1000,
                roadStyle: "two-lane"
            },
            {
                id: "v1",
                type: "v",
                coord: -480,
                start: -800,
                end: 800,
                roadStyle: "two-lane"
            },
            {
                id: "v2",
                type: "v",
                coord: 0,
                start: -800,
                end: 800,
                roadStyle: "two-lane"
            },
            {
                id: "v3",
                type: "v",
                coord: 480,
                start: -800,
                end: 800,
                roadStyle: "two-lane"
            }
        ]
    },
    {
        name: "Empty Canvas",
        description: "A completely clear, blank map for building your own dream layout.",
        emoji: "⬜",
        buildings: [],
        streets: []
    }
];

export const THEME_CONFIGS = {
    default: {
        bgClass: "bg-sky-50",
        dotsColor: "rgba(14, 165, 233, 0.15)",
        linesColor: "rgba(14, 165, 233, 0.03)",
        name: {
            English: "Grassland",
            "简体中文": "默认草地",
            "日本語": "草地"
        },
        desc: {
            English: "Cozy default green-blue grid",
            "简体中文": "默认舒适的蓝绿草地网格",
            "日本語": "デフォルトの緑青グリッド"
        },
        emoji: "🌱"
    },
    underwater: {
        bgClass: "bg-[#031d30]",
        dotsColor: "rgba(34, 211, 238, 0.35)",
        linesColor: "rgba(34, 211, 238, 0.08)",
        name: {
            English: "Deep Ocean",
            "简体中文": "深邃海底",
            "日本語": "深海"
        },
        desc: {
            English: "Quiet ocean depths",
            "简体中文": "宁静的深海",
            "日本語": "静かな深海"
        },
        emoji: "🌊"
    },
    desert: {
        bgClass: "bg-[#faf0d9]",
        dotsColor: "rgba(217, 119, 6, 0.25)",
        linesColor: "rgba(217, 119, 6, 0.06)",
        name: {
            English: "Sandy Desert",
            "简体中文": "荒芜沙漠",
            "日本語": "砂漠"
        },
        desc: {
            English: "Scorching sands",
            "简体中文": "炎热的沙丘",
            "日本語": "灼熱の砂"
        },
        emoji: "🏜️"
    },
    forest: {
        bgClass: "bg-[#e4eedb]",
        dotsColor: "rgba(22, 101, 52, 0.2)",
        linesColor: "rgba(22, 101, 52, 0.05)",
        name: {
            English: "Lush Forest",
            "简体中文": "茂密森林",
            "日本語": "森林"
        },
        desc: {
            English: "Whispering trees and quiet green shade",
            "简体中文": "宁静翠绿的林荫",
            "日本語": "ささやく木々"
        },
        emoji: "🌲"
    },
    beach: {
        bgClass: "bg-[#fdf8e6]",
        dotsColor: "rgba(13, 148, 136, 0.25)",
        linesColor: "rgba(13, 148, 136, 0.06)",
        name: {
            English: "Sunny Beach",
            "简体中文": "阳光海滩",
            "日本語": "ビーチ"
        },
        desc: {
            English: "Warm golden sands and refreshing ocean waves",
            "简体中文": "温暖的金色沙滩与清凉的浪花",
            "日本語": "暖かい黄金 of the sand and refreshing waves"
        },
        emoji: "🏖️"
    }
};
