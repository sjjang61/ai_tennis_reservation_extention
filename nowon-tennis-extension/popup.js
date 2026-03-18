(() => {
  const COURTS = [1, 2, 3, 4, 5, 6, 7, 8, 9];

  // value: 시(hour) 정수, label: 화면 표시용 문자열 (21시 마지막)
  const TIMES = [
    { hour: 6,  label: '06:00' }, { hour: 7,  label: '07:00' }, { hour: 8,  label: '08:00' },
    { hour: 9,  label: '09:00' }, { hour: 10, label: '10:00' }, { hour: 11, label: '11:00' },
    { hour: 12, label: '12:00' }, { hour: 13, label: '13:00' }, { hour: 14, label: '14:00' },
    { hour: 15, label: '15:00' }, { hour: 16, label: '16:00' }, { hour: 17, label: '17:00' },
    { hour: 18, label: '18:00' }, { hour: 19, label: '19:00' }, { hour: 20, label: '20:00' },
    { hour: 21, label: '21:00' },
  ];

  const MAX_TOTAL = 4;

  // ── 상태 ──────────────────────────────────────────────────────
  let cart         = [];   // 현재 장바구니
  let recentItems  = [];   // 재사용 히스토리 (chrome.storage.local 연동)
  let savedSlots   = [];   // 예약 슬롯 (날짜 + 장바구니 조합)

  // ── 날짜 기본값: 오늘 ──────────────────────────────────────────
  const dateInput = document.getElementById('date-input');
  const today = new Date().toLocaleDateString('sv-SE');
  dateInput.value = today;
  dateInput.min = today;

  // ── 코트 체크박스 생성 ─────────────────────────────────────────
  const courtGrid = document.getElementById('court-grid');
  COURTS.forEach(n => {
    const label = document.createElement('label');
    label.className = 'checkbox-label';
    label.innerHTML = `<input type="checkbox" class="court-cb" value="${n}" /><span>${n}번</span>`;
    courtGrid.appendChild(label);
  });

  // ── 시간 체크박스 생성 ─────────────────────────────────────────
  const timeGrid = document.getElementById('time-grid');
  TIMES.forEach(({ hour, label: text }) => {
    const label = document.createElement('label');
    label.className = 'checkbox-label';
    label.innerHTML = `<input type="checkbox" class="time-cb" value="${hour}" /><span>${text}</span>`;
    timeGrid.appendChild(label);
  });

  // ── 헬퍼 ──────────────────────────────────────────────────────
  function getSelectedCourts() {
    return [...document.querySelectorAll('.court-cb:checked')].map(el => Number(el.value));
  }

  function getSelectedTimes() {
    return [...document.querySelectorAll('.time-cb:checked')].map(el => Number(el.value));
  }

  function clearSelections() {
    document.querySelectorAll('.court-cb, .time-cb').forEach(cb => { cb.checked = false; });
  }

  function hourToLabel(h) {
    return String(h).padStart(2, '0') + ':00';
  }

  function getCartTotal() {
    return cart.reduce((sum, item) => sum + item.courts.length * item.times.length, 0);
  }

  // ── 카운터 업데이트 ────────────────────────────────────────────
  const counterText = document.getElementById('counter-text');

  function updateCounter() {
    const courts   = getSelectedCourts();
    const times    = getSelectedTimes();
    const pending  = courts.length * times.length;
    const wouldTotal = getCartTotal() + pending;

    counterText.textContent =
      `선택 현황: 코트 ${courts.length}개 × 시간 ${times.length}개 = ${pending}건`;

    const cartTotal = getCartTotal();
    counterText.className = '';
    if (pending > 0 && wouldTotal > MAX_TOTAL) {
      counterText.classList.add('over-limit');
      counterText.textContent += ` ⚠️ (장바구니 ${cartTotal}건 + 추가 ${pending}건 = ${wouldTotal}건 / 최대 ${MAX_TOTAL}건)`;
    } else if (pending > 0) {
      counterText.classList.add('ok');
      if (cartTotal > 0) {
        counterText.textContent += ` (장바구니 ${cartTotal}건 포함 총 ${wouldTotal}건)`;
      }
    }
  }

  document.querySelectorAll('.court-cb, .time-cb').forEach(cb => {
    cb.addEventListener('change', updateCounter);
  });

  // ── 장바구니 렌더 ──────────────────────────────────────────────
  const cartSection = document.getElementById('cart-section');
  const cartList    = document.getElementById('cart-list');
  const cartBadge   = document.getElementById('cart-total-badge');

  function renderCart() {
    const total = getCartTotal();
    cartBadge.textContent = `총 ${total}건 / ${MAX_TOTAL}건`;
    cartBadge.className   = 'cart-total-badge' + (total > MAX_TOTAL ? ' over-limit' : '');
    cartSection.className = 'cart-section' + (cart.length > 0 ? ' visible' : '');

    cartList.innerHTML = '';
    cart.forEach((item, idx) => {
      const courtsLabel = item.courts.map(c => `${c}번`).join(', ') + ' 코트';
      const timesLabel  = item.times.map(hourToLabel).join('  ');

      const div = document.createElement('div');
      div.className = 'cart-item';
      div.innerHTML = `
        <span class="cart-item-courts">${courtsLabel}</span>
        <span class="cart-item-divider">|</span>
        <span class="cart-item-times">${timesLabel}</span>
        <button class="btn-remove" data-idx="${idx}" title="삭제">×</button>
      `;
      cartList.appendChild(div);
    });

    cartList.querySelectorAll('.btn-remove').forEach(btn => {
      btn.addEventListener('click', () => {
        cart.splice(Number(btn.dataset.idx), 1);
        saveCart();
        renderCart();
        updateCounter();
      });
    });

    updateCounter();
  }

  // ── 히스토리 렌더 ─────────────────────────────────────────────
  const historyList = document.getElementById('history-list');

  function renderHistory() {
    historyList.innerHTML = '';

    if (recentItems.length === 0) {
      historyList.innerHTML = '<div class="history-empty">예약 완료 후<br/>여기에 표시됩니다</div>';
      return;
    }

    recentItems.forEach((item, idx) => {
      const courtsLabel = item.courts.map(c => `${c}번`).join(', ');
      const timesLabel  = item.times.map(hourToLabel).join(' ');

      const btn = document.createElement('button');
      btn.className = 'history-item';
      btn.title = '클릭하여 장바구니에 추가';
      btn.innerHTML = `
        <span class="history-item-courts">${courtsLabel} 코트</span>
        <span class="history-item-times">${timesLabel}</span>
      `;
      btn.addEventListener('click', () => addHistoryToCart(idx));
      historyList.appendChild(btn);
    });
  }

  function addHistoryToCart(idx) {
    const item = recentItems[idx];

    // 중복 검사
    const overlaps = [];
    for (const existing of cart) {
      for (const c of item.courts) {
        for (const t of item.times) {
          if (existing.courts.includes(c) && existing.times.includes(t)) {
            overlaps.push(`${c}번 코트 ${hourToLabel(t)}`);
          }
        }
      }
    }
    if (overlaps.length > 0) {
      alert('이미 장바구니에 추가된 코트, 시간 입니다.\n' + overlaps.join('\n'));
      return;
    }

    const pending  = item.courts.length * item.times.length;
    const newTotal = getCartTotal() + pending;
    if (newTotal > MAX_TOTAL) {
      alert(`장바구니 공간이 부족합니다. (현재: ${getCartTotal()}건 + 추가: ${pending}건 = ${newTotal}건 > ${MAX_TOTAL}건)`);
      return;
    }

    cart.push({ courts: [...item.courts], times: [...item.times] });
    saveCart();
    renderCart();
  }

  function saveCart() {
    chrome.storage.local.set({ cart });
  }

  function loadCart() {
    chrome.storage.local.get(['cart'], result => {
      cart = result.cart || [];
      renderCart();
    });
  }

  function saveHistory() {
    chrome.storage.local.set({ recentItems });
  }

  function loadHistory() {
    chrome.storage.local.get(['recentItems'], result => {
      recentItems = result.recentItems || [];
      renderHistory();
    });
  }

  // ── 예약 슬롯 ─────────────────────────────────────────────────
  const slotList = document.getElementById('slot-list');

  function saveSlots() {
    chrome.storage.local.set({ savedSlots });
  }

  function loadSlots() {
    chrome.storage.local.get(['savedSlots'], result => {
      savedSlots = result.savedSlots || [];
      renderSlots();
    });
  }

  function renderSlots() {
    slotList.innerHTML = '';

    if (savedSlots.length === 0) {
      slotList.innerHTML = '<div class="slot-empty">슬롯 저장 후<br/>빠르게 예약</div>';
      return;
    }

    savedSlots.forEach((slot, idx) => {
      // 슬롯 요약 정보 계산
      const allCourts = [...new Set(slot.cartItems.flatMap(it => it.courts))].sort((a,b)=>a-b);
      const allTimes  = [...new Set(slot.cartItems.flatMap(it => it.times))].sort((a,b)=>a-b);
      const totalCount = slot.cartItems.reduce((s, it) => s + it.courts.length * it.times.length, 0);

      const courtsLabel = allCourts.map(c => `${c}번`).join(', ');
      const timesLabel  = allTimes.map(hourToLabel).join(' ');

      // 날짜 MM/DD 짧게 표시
      const dateShort = slot.date ? slot.date.slice(5).replace('-', '/') : '?';

      const item = document.createElement('div');
      item.className = 'slot-item';
      item.title = `${slot.date} | ${courtsLabel} | ${timesLabel}\n클릭: 날짜+장바구니 자동 설정`;
      item.innerHTML = `
        <button class="btn-slot-delete" data-idx="${idx}" title="슬롯 삭제">×</button>
        <span class="slot-item-date">📅 ${dateShort}</span>
        <span class="slot-item-courts">${courtsLabel} 코트</span>
        <span class="slot-item-times">${timesLabel}</span>
        <span class="slot-item-count">총 ${totalCount}건</span>
      `;

      // 삭제 버튼
      item.querySelector('.btn-slot-delete').addEventListener('click', e => {
        e.stopPropagation();
        if (confirm(`슬롯 "${dateShort} ${courtsLabel}"을 삭제하시겠습니까?`)) {
          savedSlots.splice(idx, 1);
          saveSlots();
          renderSlots();
        }
      });

      // 슬롯 클릭: 날짜 + 장바구니 자동 설정
      item.addEventListener('click', () => applySlot(slot));

      // 드래그앤드롭
      item.setAttribute('draggable', 'true');
      item.dataset.idx = idx;

      item.addEventListener('dragstart', e => {
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/plain', idx);
        setTimeout(() => item.classList.add('dragging'), 0);
      });

      item.addEventListener('dragend', () => {
        item.classList.remove('dragging');
        slotList.querySelectorAll('.slot-item').forEach(el => el.classList.remove('drag-over'));
      });

      item.addEventListener('dragover', e => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
        slotList.querySelectorAll('.slot-item').forEach(el => el.classList.remove('drag-over'));
        item.classList.add('drag-over');
      });

      item.addEventListener('dragleave', () => {
        item.classList.remove('drag-over');
      });

      item.addEventListener('drop', e => {
        e.preventDefault();
        e.stopPropagation();
        const fromIdx = Number(e.dataTransfer.getData('text/plain'));
        const toIdx   = Number(item.dataset.idx);
        if (fromIdx === toIdx) return;
        const [moved] = savedSlots.splice(fromIdx, 1);
        savedSlots.splice(toIdx, 0, moved);
        saveSlots();
        renderSlots();
      });

      slotList.appendChild(item);
    });
  }

  function applySlot(slot) {
    // 1. 날짜 설정
    if (slot.date) {
      dateInput.value = slot.date;
    }

    // 2. 장바구니 교체 + 체크박스 초기화
    cart = slot.cartItems.map(it => ({ courts: [...it.courts], times: [...it.times] }));
    saveCart();
    clearSelections();
    renderCart(); // 내부에서 updateCounter() 호출
  }

  // ── [슬롯 저장] 버튼 ──────────────────────────────────────────
  document.getElementById('btn-save-slot').addEventListener('click', () => {
    const date = dateInput.value;
    if (!date)          { alert('날짜를 선택해주세요.'); return; }
    if (cart.length === 0) { alert('장바구니에 예약 항목을 추가한 후 슬롯을 저장해주세요.'); return; }

    // 중복 검사 (같은 날짜 + 같은 장바구니 조합)
    const isDuplicate = savedSlots.some(s =>
      s.date === date &&
      JSON.stringify(s.cartItems) === JSON.stringify(cart)
    );
    if (isDuplicate) {
      alert('이미 동일한 슬롯이 저장되어 있습니다.');
      return;
    }

    savedSlots.unshift({ date, cartItems: cart.map(it => ({ courts: [...it.courts], times: [...it.times] })) });
    // 최대 20개 유지
    savedSlots = savedSlots.slice(0, 20);
    saveSlots();
    renderSlots();

    cart = [];
    saveCart();
    renderCart();
    clearSelections();
  });

  function addToHistory(cartItems) {
    // 장바구니 항목을 히스토리에 추가 (중복 제거)
    cartItems.forEach(newItem => {
      const isDuplicate = recentItems.some(h =>
        JSON.stringify(h.courts) === JSON.stringify(newItem.courts) &&
        JSON.stringify(h.times)  === JSON.stringify(newItem.times)
      );
      if (!isDuplicate) {
        recentItems.unshift({ courts: newItem.courts, times: newItem.times });
      }
    });
    // 최대 10개 유지
    recentItems = recentItems.slice(0, 10);
    saveHistory();
    renderHistory();
  }

  // ── [초기화] 버튼 ─────────────────────────────────────────────
  document.getElementById('btn-reset').addEventListener('click', () => {
    clearSelections();
    cart = [];
    saveCart();
    renderCart();
    hideResult();
  });

  // ── [장바구니에 추가] 버튼 ─────────────────────────────────────
  document.getElementById('btn-add-cart').addEventListener('click', () => {
    const courts = getSelectedCourts();
    const times  = getSelectedTimes();

    if (courts.length === 0) { alert('코트를 1개 이상 선택해주세요.'); return; }
    if (times.length === 0)  { alert('시간을 1개 이상 선택해주세요.'); return; }

    // 중복 검사: 기존 장바구니의 (코트, 시간) 조합과 겹치는지 확인
    const overlaps = [];
    for (const item of cart) {
      for (const c of courts) {
        for (const t of times) {
          if (item.courts.includes(c) && item.times.includes(t)) {
            overlaps.push(`${c}번 코트 ${hourToLabel(t)}`);
          }
        }
      }
    }
    if (overlaps.length > 0) {
      alert('이미 장바구니에 추가된 코트, 시간 입니다.\n' + overlaps.join('\n'));
      return;
    }

    const pending  = courts.length * times.length;
    const newTotal = getCartTotal() + pending;
    if (newTotal > MAX_TOTAL) {
      alert(`총 ${MAX_TOTAL}건을 초과합니다. (현재: ${getCartTotal()}건 + 추가: ${pending}건 = ${newTotal}건)`);
      return;
    }

    cart.push({ courts, times });
    saveCart();
    clearSelections();
    renderCart();
  });

  // ── 결과 메시지 ───────────────────────────────────────────────
  const resultMsg = document.getElementById('result-msg');

  function showResult(type, text) {
    resultMsg.className   = type;
    resultMsg.textContent = text;
  }

  function hideResult() {
    resultMsg.className   = '';
    resultMsg.textContent = '';
  }

  // ── [예약 홈으로 이동] 버튼 (헤더) ────────────────────────────
  document.getElementById('btn-home').addEventListener('click', () => {
    chrome.runtime.sendMessage({ action: 'navigate' });
  });

  // ── [예약하기] 버튼 ────────────────────────────────────────────
  const btnReserve = document.getElementById('btn-reserve');

  btnReserve.addEventListener('click', async () => {
    hideResult();

    const date = dateInput.value;
    if (!date)          { alert('날짜를 선택해주세요.'); return; }
    if (cart.length === 0) { alert('장바구니에 예약 항목을 추가해주세요.'); return; }

    btnReserve.disabled    = true;
    btnReserve.textContent = '예약 중...';

    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

      if (!tab || !tab.url || !tab.url.includes('reservation.nowonsc.kr')) {
        showResult('error', '❌ 예약 사이트(reservation.nowonsc.kr)에서 실행해주세요.\n"🏠 홈" 버튼을 눌러 사이트를 먼저 열어주세요.');
        return;
      }

      const response = await chrome.tabs.sendMessage(tab.id, {
        action: 'reserve',
        params: { date, cartItems: cart },
      });

      if (response && response.success) {
        addToHistory(cart);
        cart = [];
        saveCart();
        renderCart();
        showResult('success', '✅ 예약이 완료되었습니다.');
      } else {
        const errMsg = (response && response.error) ? response.error : '알 수 없는 오류';
        showResult('error', `❌ 예약 실패: ${errMsg}`);
      }
    } catch (err) {
      showResult('error', `❌ 예약 실패: ${err.message}`);
    } finally {
      btnReserve.disabled    = false;
      btnReserve.textContent = '예약하기';
    }
  });

  // ── 초기화 ────────────────────────────────────────────────────
  loadCart();
  loadHistory();
  loadSlots();
})();
