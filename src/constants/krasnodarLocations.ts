export type KrasnodarMunicipalityType = "city_district" | "municipal_okrug" | "district";

export type KrasnodarMunicipality = {
  id: string;
  label: string;
  type: KrasnodarMunicipalityType;
};

export type KanevskyPlaceType = "town" | "village" | "hamlet";

export type KanevskyPlace = {
  id: string;
  name: string;
  type: KanevskyPlaceType;
  lat: number;
  lon: number;
};

export const KANEVSKY_MUNICIPALITY_ID = "kanevskoy_district";

export const krasnodarMunicipalities: readonly KrasnodarMunicipality[] = [
  { id: "armavir_city", label: "Армавир", type: "city_district" },
  { id: "gelendzhik_city", label: "Геленджик", type: "city_district" },
  { id: "krasnodar_city", label: "Краснодар", type: "city_district" },
  { id: "novorossiysk_city", label: "Новороссийск", type: "city_district" },
  { id: "sochi_city", label: "Сочи", type: "city_district" },
  { id: "anapa_okrug", label: "Анапа", type: "municipal_okrug" },
  { id: "goryachiy_klyuch_okrug", label: "Горячий Ключ", type: "municipal_okrug" },
  { id: "leningradskiy_okrug", label: "Ленинградский округ", type: "municipal_okrug" },
  { id: "primorsko_akhtarskiy_okrug", label: "Приморско-Ахтарский округ", type: "municipal_okrug" },
  { id: "tuapsinskiy_okrug", label: "Туапсинский округ", type: "municipal_okrug" },
  { id: "abinskiy_district", label: "Абинский район", type: "district" },
  { id: "apsheronskiy_district", label: "Апшеронский район", type: "district" },
  { id: "beloglinskiy_district", label: "Белоглинский район", type: "district" },
  { id: "belorechenskiy_district", label: "Белореченский район", type: "district" },
  { id: "bryukhovetskiy_district", label: "Брюховецкий район", type: "district" },
  { id: "vyselkovskiy_district", label: "Выселковский район", type: "district" },
  { id: "gulkevichskiy_district", label: "Гулькевичский район", type: "district" },
  { id: "dinskoy_district", label: "Динской район", type: "district" },
  { id: "yeyskiy_district", label: "Ейский район", type: "district" },
  { id: "kavkazskiy_district", label: "Кавказский район", type: "district" },
  { id: "kalininskiy_district", label: "Калининский район", type: "district" },
  { id: KANEVSKY_MUNICIPALITY_ID, label: "Каневской район", type: "district" },
  { id: "korenovskiy_district", label: "Кореновский район", type: "district" },
  { id: "krasnoarmeyskiy_district", label: "Красноармейский район", type: "district" },
  { id: "krylovskiy_district", label: "Крыловский район", type: "district" },
  { id: "krymskiy_district", label: "Крымский район", type: "district" },
  { id: "kurganinskiy_district", label: "Курганинский район", type: "district" },
  { id: "kushchevskiy_district", label: "Кущёвский район", type: "district" },
  { id: "labinskiy_district", label: "Лабинский район", type: "district" },
  { id: "mostovskiy_district", label: "Мостовский район", type: "district" },
  { id: "novokubanskiy_district", label: "Новокубанский район", type: "district" },
  { id: "novopokrovskiy_district", label: "Новопокровский район", type: "district" },
  { id: "otradnenskiy_district", label: "Отрадненский район", type: "district" },
  { id: "pavlovskiy_district", label: "Павловский район", type: "district" },
  { id: "severskiy_district", label: "Северский район", type: "district" },
  { id: "slavyanskiy_district", label: "Славянский район", type: "district" },
  { id: "starominskiy_district", label: "Староминский район", type: "district" },
  { id: "tbilisskiy_district", label: "Тбилисский район", type: "district" },
  { id: "temryukskiy_district", label: "Темрюкский район", type: "district" },
  { id: "timashevskiy_district", label: "Тимашевский район", type: "district" },
  { id: "tikhoretskiy_district", label: "Тихорецкий район", type: "district" },
  { id: "uspenskiy_district", label: "Успенский район", type: "district" },
  { id: "ust_labinskiy_district", label: "Усть-Лабинский район", type: "district" },
  { id: "shcherbinovskiy_district", label: "Щербиновский район", type: "district" },
];

export const kanevskyPlaces: readonly KanevskyPlace[] = [
  { id: "n1324570369", name: "Албаши", type: "village", lat: 46.2559082, lon: 38.6181139 },
  { id: "n356773102", name: "Александровская", type: "village", lat: 46.213718, lon: 39.064148 },
  { id: "n1270914452", name: "Большие Челбасы", type: "village", lat: 46.1024439, lon: 39.1657425 },
  { id: "n1270921316", name: "Борец Труда", type: "hamlet", lat: 46.225964, lon: 38.839199 },
  { id: "n1270925025", name: "Бурсаки", type: "hamlet", lat: 46.1042546, lon: 39.1064552 },
  { id: "n616578881", name: "Весёлый", type: "hamlet", lat: 45.9662419, lon: 39.48925 },
  { id: "n1263088840", name: "Вольный", type: "hamlet", lat: 46.2057, lon: 38.736099 },
  { id: "n1263109464", name: "Восточный", type: "hamlet", lat: 46.3325301, lon: 38.8657359 },
  { id: "n1270929209", name: "Добровольный", type: "hamlet", lat: 46.0215795, lon: 38.7240054 },
  { id: "n928995180", name: "Калинино", type: "hamlet", lat: 45.9729303, lon: 39.2198767 },
  { id: "n296886274", name: "Каневская", type: "town", lat: 46.0845999, lon: 38.9721929 },
  { id: "n1301888177", name: "Красногвардеец", type: "village", lat: 46.158024, lon: 39.1671348 },
  { id: "n2392390878", name: "Красный Очаг", type: "hamlet", lat: 46.341286, lon: 38.830997 },
  { id: "n928995181", name: "Кубанская Степь", type: "village", lat: 45.9659039, lon: 39.2271241 },
  { id: "n1271882053", name: "Ленинский", type: "hamlet", lat: 46.188808, lon: 38.697277 },
  { id: "n1270933598", name: "Мигуты", type: "village", lat: 46.1545791, lon: 39.127501 },
  { id: "n356773064", name: "Новодеревянковская", type: "village", lat: 46.3265322, lon: 38.7502463 },
  { id: "n356773076", name: "Новоминская", type: "town", lat: 46.317478, lon: 38.955532 },
  { id: "n1270936532", name: "Орджоникидзе", type: "village", lat: 46.1267996, lon: 38.7780744 },
  { id: "n1270941562", name: "Партизанский", type: "village", lat: 45.9314727, lon: 39.0351599 },
  { id: "n356773260", name: "Привольная", type: "village", lat: 46.137077, lon: 38.695133 },
  { id: "n356773370", name: "Придорожная", type: "village", lat: 45.9934921, lon: 38.9673806 },
  { id: "n1270942770", name: "Приютный", type: "hamlet", lat: 46.1996439, lon: 38.7162364 },
  { id: "n1326234150", name: "Раздольный", type: "hamlet", lat: 46.294753, lon: 38.6184544 },
  { id: "n1271817700", name: "Сладкий Лиман", type: "village", lat: 46.183201, lon: 38.797298 },
  { id: "n1270913111", name: "Средние Челбасы", type: "village", lat: 46.0548988, lon: 39.1584253 },
  { id: "n296886275", name: "Стародеревянковская", type: "town", lat: 46.1277738, lon: 38.9713729 },
  { id: "n1270830180", name: "Степной", type: "village", lat: 45.9434853, lon: 39.1572898 },
  { id: "n929000855", name: "Сухие Челбасы", type: "village", lat: 45.9764044, lon: 39.1599245 },
  { id: "n367985853", name: "Труд", type: "village", lat: 46.1553659, lon: 38.5373704 },
  { id: "n1270954190", name: "Трудовая Армения", type: "hamlet", lat: 46.17741, lon: 38.837624 },
  { id: "n1270956445", name: "Ударный", type: "village", lat: 46.20218, lon: 39.0083829 },
  { id: "n1270964402", name: "Украинка", type: "hamlet", lat: 46.1149684, lon: 39.1534258 },
  { id: "n1923524949", name: "Чапаев", type: "hamlet", lat: 46.334309, lon: 38.991184 },
  { id: "n356773302", name: "Челбасская", type: "village", lat: 45.9784556, lon: 39.3753366 },
  { id: "n910412580", name: "Черкасский", type: "hamlet", lat: 46.1395045, lon: 38.9116797 },
  { id: "n1271936602", name: "Шевченко", type: "hamlet", lat: 46.1132774, lon: 39.1327316 },
];
