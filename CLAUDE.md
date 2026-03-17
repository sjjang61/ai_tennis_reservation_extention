# 노원 마들 테니스장 예약 크롬 익스텐션

## 프로젝트 개요

노원 마들 테니스장 예약 사이트(https://reservation.nowonsc.kr)에서 날짜, 코트번호, 시간을 선택하면 예약 자바스크립트를 자동으로 실행해주는 크롬 익스텐션이다.

---

## 파일 구조

```
nowon-tennis-extension/
├── manifest.json          # 크롬 익스텐션 설정
├── popup.html             # 팝업 UI
├── popup.js               # 팝업 로직 (UI 이벤트, 유효성 검사, 메시지 전달)
├── content.js             # 실제 페이지에서 자바스크립트 실행
├── background.js          # 탭 관리 및 메시지 라우팅
└── icons/
    ├── icon16.png
    ├── icon48.png
    └── icon128.png
```

---

## manifest.json 명세

```json
{
  "manifest_version": 3,
  "name": "노원 마들 테니스장 예약",
  "version": "1.0.0",
  "description": "노원 마들 테니스장 코트 자동 예약 익스텐션",
  "permissions": ["activeTab", "scripting", "tabs"],
  "host_permissions": ["https://reservation.nowonsc.kr/*"],
  "action": {
    "default_popup": "popup.html",
    "default_icon": {
      "16": "icons/icon16.png",
      "48": "icons/icon48.png",
      "128": "icons/icon128.png"
    }
  },
  "content_scripts": [
    {
      "matches": ["https://reservation.nowonsc.kr/*"],
      "js": ["content.js"]
    }
  ],
  "background": {
    "service_worker": "background.js"
  }
}
```

---

## UI 명세 (popup.html / popup.js)

### 레이아웃 구성

팝업 크기: 너비 380px, 높이 auto (최대 600px)

```
┌─────────────────────────────────────┐
│  🎾 노원 마들 테니스장 예약           │  ← 헤더
├─────────────────────────────────────┤
│  날짜 선택                           │
│  [YYYY-MM-DD  ▼]                    │  ← date input (단일 선택)
├─────────────────────────────────────┤
│  코트 선택 (복수 선택)                │
│  [ ] 1번  [ ] 2번  [ ] 3번          │
│  [ ] 4번  [ ] 5번  [ ] 6번          │
│  [ ] 7번  [ ] 8번  [ ] 9번          │
├─────────────────────────────────────┤
│  시간 선택 (복수 선택)                │
│  [ ] 06:00  [ ] 07:00  [ ] 08:00   │
│  [ ] 09:00  [ ] 10:00  [ ] 11:00   │
│  [ ] 12:00  [ ] 13:00  [ ] 14:00   │
│  [ ] 15:00  [ ] 16:00  [ ] 17:00   │
│  [ ] 18:00  [ ] 19:00  [ ] 20:00   │
│  [ ] 21:00  [ ] 22:00              │
├─────────────────────────────────────┤
│  선택 현황: 코트 0개 × 시간 0개 = 0건 │  ← 실시간 카운터 (4건 초과시 빨간색)
├─────────────────────────────────────┤
│       [예약 홈으로 이동]              │
│            [예약하기]                │
└─────────────────────────────────────┘
```

### 입력 필드 상세

#### 날짜 선택
- `<input type="date">` 사용
- 단일 날짜만 선택 가능
- 오늘 날짜를 기본값으로 설정
- 과거 날짜는 선택 불가 (`min` 속성으로 오늘 날짜 설정)

#### 코트 번호 선택
- 코트 1번 ~ 9번
- 체크박스 멀티 선택 가능
- 3열 그리드 레이아웃으로 배치

#### 시간 선택
- 06:00 ~ 22:00, 1시간 단위 (총 17개 슬롯)
- 체크박스 멀티 선택 가능
- 3열 그리드 레이아웃으로 배치
- 시간 표기: `06:00`, `07:00`, ... `22:00`

---

## 유효성 검사 규칙

### 제약 조건
```
선택된 코트 수 × 선택된 시간 수 ≤ 4
```

### 검사 시점
1. **실시간**: 체크박스 변경 시마다 카운터 업데이트 및 경고 표시
2. **예약 시**: 예약하기 버튼 클릭 시 최종 검사

### 에러 처리
| 상황 | 처리 방법 |
|------|-----------|
| 날짜 미선택 | "날짜를 선택해주세요." alert |
| 코트 미선택 | "코트를 1개 이상 선택해주세요." alert |
| 시간 미선택 | "시간을 1개 이상 선택해주세요." alert |
| 총 예약 건수 > 4 | "코트 수 × 시간 수는 4건 이하여야 합니다. (현재: N건)" alert |

### 카운터 표시
- 정상 범위 (≤ 4): 회색 또는 초록색 텍스트
- 초과 (> 4): 빨간색 텍스트 + 경고 아이콘

---

## 예약 데이터 구조

```javascript
// popup.js에서 수집하는 예약 파라미터
const reservationParams = {
  date: "2025-03-20",           // YYYY-MM-DD 형식
  courts: [1, 3, 5],           // 선택된 코트 번호 배열 (1~9)
  times: ["09:00", "10:00"]    // 선택된 시간 배열 (HH:MM 형식)
};
```

---

## 메시지 통신 흐름

```
popup.js
  │
  │  chrome.tabs.sendMessage(tabId, { action: "reserve", params })
  ▼
content.js
  │
  │  예약 자바스크립트 실행 (동적)
  │  각 (코트, 시간) 조합에 대해 순차 실행
  ▼
  │  응답: { success: true/false, message: "..." }
  ▼
popup.js
  │  결과 표시 (성공/실패 메시지)
```

---

## content.js 명세

### 역할
- popup.js로부터 메시지를 수신하여 실제 예약 사이트에서 자바스크립트를 실행한다.
- 예약은 `(코트, 시간)` 조합의 카테시안 곱으로 생성된다.

### 예약 조합 생성 로직

```javascript
// 예약 조합 생성 예시
// courts: [1, 3], times: ["09:00", "10:00"]
// 조합: [(1, 09:00), (1, 10:00), (3, 09:00), (3, 10:00)]

const combinations = [];
for (const court of params.courts) {
  for (const time of params.times) {
    combinations.push({ court, time, date: params.date });
  }
}
```

### 예약 스크립트 실행 인터페이스

content.js는 각 조합에 대해 기존에 작성된 예약 자바스크립트를 호출한다.
아래 함수 시그니처를 기준으로 호출한다 (실제 구현은 기존 스크립트에 따름):

```javascript
// 기존 예약 스크립트가 노출하는 함수 (또는 동적 실행 방식으로 대체)
await reserveCourt({
  date: "2025-03-20",   // YYYY-MM-DD
  court: 1,             // 코트 번호 (1~9)
  time: "09:00"         // HH:MM
});
```

> **구현 시 주의**: 기존 예약 자바스크립트의 실제 함수명, 파라미터 형식, 실행 방식(eval, 함수 직접 호출 등)에 맞춰 content.js를 작성한다. 위 시그니처는 참고용이며, 실제 스크립트와 맞춰 조정 필요.

### 메시지 리스너

```javascript
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === "reserve") {
    executeReservation(message.params)
      .then(result => sendResponse({ success: true, result }))
      .catch(err => sendResponse({ success: false, error: err.message }));
    return true; // 비동기 응답을 위해 필수
  }
  if (message.action === "navigate") {
    window.location.href = message.url;
    sendResponse({ success: true });
  }
});
```

---

## background.js 명세

### 역할
- 활성 탭을 조회하여 popup.js와 content.js 간 메시지를 중계한다.
- "예약 홈으로 이동" 요청 시 해당 URL로 탭을 이동시킨다.

```javascript
// 예약 홈 URL
const HOME_URL = "https://reservation.nowonsc.kr/sports/courtReserve_date?cate1=1&cate2=16";
```

### 탭 이동 처리
- 현재 활성 탭이 `reservation.nowonsc.kr` 도메인이면 해당 탭에서 URL 이동
- 그 외에는 새 탭에서 HOME_URL 열기

---

## 버튼 동작 명세

### [예약 홈으로 이동] 버튼
- 클릭 시 `https://reservation.nowonsc.kr/sports/courtReserve_date?cate1=1&cate2=16` 로 이동
- 현재 탭이 해당 사이트면 현재 탭에서 이동, 아니면 새 탭으로 열기

### [예약하기] 버튼
1. 유효성 검사 수행 (위 에러 처리 참고)
2. 통과 시 content.js로 예약 파라미터 전달
3. 버튼 비활성화 + "예약 중..." 텍스트로 변경 (중복 클릭 방지)
4. 응답 수신 후 결과 메시지 표시:
   - 성공: "✅ 예약이 완료되었습니다." (초록색)
   - 실패: "❌ 예약 실패: {에러메시지}" (빨간색)
5. 버튼 원복

---

## 디자인 가이드

- 테마: 스포츠/테니스 분위기의 깔끔한 UI
- 색상:
  - 주색: `#2E7D32` (테니스 코트 녹색 계열)
  - 강조: `#FF6F00` (경고/액션 오렌지)
  - 배경: `#FAFAFA`
  - 텍스트: `#212121`
- 체크박스: 커스텀 스타일링으로 녹색 체크 표시
- 폰트: 시스템 폰트 (`-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif`)
- 팝업 너비: 고정 380px
- 섹션 구분: 연한 회색 구분선 (`#E0E0E0`)

---

## 개발 순서 (권장)

1. `manifest.json` 작성
2. `popup.html` + `popup.js` UI 구현 및 유효성 검사 로직 작성
3. `content.js` 기존 예약 스크립트 연동 및 메시지 리스너 구현
4. `background.js` 탭 관리 로직 구현
5. 크롬 익스텐션 로드 테스트 (`chrome://extensions` → 개발자 모드 → 압축 해제된 확장 프로그램 로드)
6. 실제 예약 사이트에서 E2E 테스트

---

## 주요 제약사항 요약

| 항목 | 내용 |
|------|------|
| 날짜 선택 | 단일 날짜, YYYY-MM-DD, 오늘 이후만 가능 |
| 코트 선택 | 1~9번, 멀티 선택 |
| 시간 선택 | 06:00~22:00, 1시간 단위, 멀티 선택 |
| 최대 예약 건수 | 코트 수 × 시간 수 ≤ 4 |
| 예약 홈 URL | https://reservation.nowonsc.kr/sports/courtReserve_date?cate1=1&cate2=16 |
| 대상 도메인 | https://reservation.nowonsc.kr/* |