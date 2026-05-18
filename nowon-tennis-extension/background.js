// 장소 id → 예약 페이지 cate2 파라미터
const LOCATION_CATE2 = {
  madeul:   16,
  choansan: 17,
  buramsan: 15,
  suraksan: 117,
};
const DEFAULT_LOCATION = 'madeul';

function buildHomeUrl(location) {
  const cate2 = LOCATION_CATE2[location] || LOCATION_CATE2[DEFAULT_LOCATION];
  return `https://reservation.nowonsc.kr/sports/courtReserve_date?cate1=1&cate2=${cate2}`;
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'navigate') {
    handleNavigate(message.location, sendResponse);
    return true; // 비동기 응답
  }
});

async function handleNavigate(location, sendResponse) {
  const HOME_URL = buildHomeUrl(location);
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

    if (tab && tab.url && tab.url.includes('reservation.nowonsc.kr')) {
      // 현재 탭이 예약 사이트면 현재 탭에서 이동
      await chrome.tabs.update(tab.id, { url: HOME_URL });
    } else {
      // 아니면 새 탭으로 열기
      await chrome.tabs.create({ url: HOME_URL });
    }

    sendResponse({ success: true });
  } catch (err) {
    sendResponse({ success: false, error: err.message });
  }
}
