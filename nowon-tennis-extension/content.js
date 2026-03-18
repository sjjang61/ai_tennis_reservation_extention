// ────────────────────────────────────────────────────────────
//  예약 실행 함수 (stub)
//  실제 예약 로직을 아래 함수 안에 붙여넣기 하세요.
// ────────────────────────────────────────────────────────────

/**
 * 예약 실행
 * @param {Array<{ date: string, courtList: number[], timeList: number[] }>} basket_list
 * @returns {Promise<void>}
 */
async function reserve(basket_list) {

  var alertMsg = '[예약 목록]\n';
  for (var i = 0; i < basket_list.length; i++) {
    var item = basket_list[i];
    var timeLabels = item.timeList.map(function(h) { return String(h).padStart(2,'0') + ':00'; });
    alertMsg += (i + 1) + ') 날짜: ' + item.date
      + ' | 코트: ' + item.courtList.join(', ') + '번'
      + ' | 시간: ' + timeLabels.join(', ') + '\n';
  }
  // alert(alertMsg);

  // 1단계: 다음달로 변경 (예약 날짜가 현재 페이지의 다음달인 경우에만 실행)
  var exposedText = $("div.month").text().trim(); // 예: "2026년 3월"
  var exposedMatch = exposedText.match(/(\d{4})년\s*(\d{1,2})월/);
  var reserveYYYYMM = basket_list[0].date.slice(0, 7); // 예: "2026-04"

  var shouldGoNext = false;
  if (exposedMatch) {
    var exposedYear  = parseInt(exposedMatch[1], 10);
    var exposedMonth = parseInt(exposedMatch[2], 10);
    var nextYear  = exposedMonth === 12 ? exposedYear + 1 : exposedYear;
    var nextMonth = exposedMonth === 12 ? 1 : exposedMonth + 1;
    var nextYYYYMM = String(nextYear) + '-' + String(nextMonth).padStart(2, '0');
    shouldGoNext = (reserveYYYYMM === nextYYYYMM);
  }

  if (shouldGoNext) {
    await new Promise(function(resolve) {
      setTimeout(function() {
        $("div.clndr-control-button.rightalign span").trigger("click");
        resolve();
      }, 500);
    });
  }

  // 2단계: 날짜 선택(여러날짜 중복 불가)
  var date = basket_list[0].date;
  await new Promise(function(resolve) {
    setTimeout(function() {      
      $(`#reserve_${date} span`).trigger("click");
      resolve();
    }, 500);
  });

  // 3단계: 코트 및 시간 선택 후 예약 실행
  return new Promise(function(resolve, reject) {
  setTimeout(function() {
    try {
      for (var i = 0; i < basket_list.length; i++) {
        var courtList = basket_list[i].courtList;
        var timeList  = basket_list[i].timeList;

        for (var j = 0; j < timeList.length; j++) {
          // 2. 시간선택
          var timeNum = timeList[j];

          for (var k = 0; k < courtList.length; k++) {
            // 3. 코트선택
            var courtNum = courtList[k];
            var timeRowIndex = timeNum - 6 + 2;
            var courtColIndex = (courtNum - 1) * 2;
            var courtNextColIndex = courtColIndex + 1;

            var isFinish = $("div.table_wrap table").find(`tr:eq(${timeRowIndex})`).find(`td:eq(${courtNextColIndex}) span`).hasClass("finish");
            if (isFinish) {
              var finishTime = $("div.table_wrap table").find(`tr:eq(${timeRowIndex})`).find(`td:eq(${courtNextColIndex}) span`).text();
              alert("예약 완료된 시간이 존재합니다." + finishTime);
            } else {              
              console.log(`[코트+시간 선택] 코트 ${courtNum} 선택, 시간 ${timeNum} 선택`);
              $("div.table_wrap table").find(`tr:eq(${timeRowIndex})`).find(`td:eq(${courtColIndex}) input`).trigger("click");
            }

            // 4. 종료체크
            if (i == basket_list.length - 1 && j == timeList.length - 1 && k == courtList.length - 1) {
              // 5. 예약버튼
              console.log("예약 버튼 실행");
              $("#reserved_submit").trigger("click");
            }
          }
        }
      }
      resolve();
    } catch (err) {
      reject(err);
    }
  }, 500);
  });
}

// ────────────────────────────────────────────────────────────
//  메시지 리스너
// ────────────────────────────────────────────────────────────

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'reserve') {
    executeReservation(message.params)
      .then(result => sendResponse({ success: true, result }))
      .catch(err => sendResponse({ success: false, error: err.message }));
    return true; // 비동기 응답을 위해 필수
  }

  if (message.action === 'navigate') {
    window.location.href = message.url;
    sendResponse({ success: true });
  }
});

// ────────────────────────────────────────────────────────────
//  예약 조합 실행
// ────────────────────────────────────────────────────────────

/**
 * @param {{ date: string, cartItems: Array<{ courts: number[], times: number[] }> }} params
 */
async function executeReservation(params) {
  const { date, cartItems } = params;

  const basket_list = cartItems.map(item => ({
    date:      date,
    courtList: item.courts,
    timeList:  item.times,
  }));

  await reserve(basket_list);
  return basket_list;
}
