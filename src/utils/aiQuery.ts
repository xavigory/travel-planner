export interface AttrQueryResult {
  hours: string;
  price: string;   // Google Places API 無法提供精確票價，永遠回傳 ''
  website: string;
  note: string;
  mapsUrl: string; // googleMapsUri
}

const SEARCH_URL = 'https://places.googleapis.com/v1/places:searchText';
const DETAIL_URL = 'https://places.googleapis.com/v1';

interface PlacesSearchResponse {
  places?: Array<{ name: string }>;
}

interface PlaceDetailsResponse {
  regularOpeningHours?: { weekdayDescriptions: string[] };
  websiteUri?: string;
  googleMapsUri?: string;
  editorialSummary?: { text: string };
}

/**
 * 透過 Google Places API (New) 查詢景點的營業時間、官網、地圖連結與摘要。
 * 注意：Places API 沒有精確票價（price 欄位永遠回傳空字串，讓使用者自填）。
 * API key 設定於 .env.local 的 VITE_GOOGLE_PLACES_API_KEY。
 */
export async function queryAttraction(
  name: string,
  destination: string,
  _localCurrency: string,
): Promise<AttrQueryResult | null> {
  const apiKey = import.meta.env.VITE_GOOGLE_PLACES_API_KEY;
  if (!apiKey) return null;

  const headers = {
    'Content-Type': 'application/json',
    'X-Goog-Api-Key': apiKey,
  };

  // Step 1：Text Search — 用景點名稱 + 目的地搜尋，取得 place resource name
  let placeName: string;
  try {
    const searchRes = await fetch(SEARCH_URL, {
      method: 'POST',
      headers: { ...headers, 'X-Goog-FieldMask': 'places.name' },
      body: JSON.stringify({
        textQuery: `${name} ${destination}`,
        languageCode: 'zh-TW',
        maxResultCount: 1,
      }),
    });
    if (!searchRes.ok) return null;

    const searchData: PlacesSearchResponse = await searchRes.json();
    if (!searchData.places?.length) return null;
    placeName = searchData.places[0].name; // 格式：places/ChIJ...
  } catch {
    return null;
  }

  // Step 2：Place Details — 用 resource name 取得詳細資訊
  const empty: AttrQueryResult = { hours: '', price: '', website: '', note: '', mapsUrl: '' };
  try {
    const detailRes = await fetch(`${DETAIL_URL}/${placeName}`, {
      headers: {
        ...headers,
        'X-Goog-FieldMask': 'regularOpeningHours,websiteUri,googleMapsUri,editorialSummary',
      },
    });
    if (!detailRes.ok) return empty;

    const detail: PlaceDetailsResponse = await detailRes.json();
    return {
      hours: detail.regularOpeningHours?.weekdayDescriptions?.join('\n') ?? '',
      price: '',
      website: detail.websiteUri ?? '',
      note: detail.editorialSummary?.text ?? '',
      mapsUrl: detail.googleMapsUri ?? '',
    };
  } catch {
    return empty;
  }
}

/** 批次查詢，循序執行並透過 callback 即時回報進度 */
export async function queryAttractions(
  attractions: Array<{ id: string; name: string }>,
  destination: string,
  localCurrency: string,
  onResult: (id: string, result: AttrQueryResult | null) => void,
): Promise<void> {
  for (const a of attractions) {
    const result = await queryAttraction(a.name, destination, localCurrency);
    onResult(a.id, result);
  }
}
