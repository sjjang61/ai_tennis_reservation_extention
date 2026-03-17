const HOME_URL = 'https://reservation.nowonsc.kr/sports/courtReserve_date?cate1=1&cate2=16';

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'navigate') {
    handleNavigate(sendResponse);
    return true; // 비동기 응답
  }
});

async function handleNavigate(sendResponse) {
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
