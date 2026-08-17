// admin.js
const GAS_URL = 'https://script.google.com/macros/s/AKfycbx-b6WOncIt4M8nPkncMZfLDYc1MoV55tOvtL-cCT3ARdTSsZcMFUyk4d_J9Ur51cWi/exec';

document.addEventListener('DOMContentLoaded', () => {
  // State
  let currentDate = new Date();
  
  let mockBookings = [];
  let staffs = [];
  let menus = [];
  let customers = [];

  // DOM Elements
  const dateInput = document.getElementById('current-date');
  const dateDisplay = document.getElementById('date-display');
  const timeline = document.getElementById('timeline');
  const modal = document.getElementById('booking-modal');
  const detailsModal = document.getElementById('details-modal');
  const customerModal = document.getElementById('customer-modal');
  const btnBlockMode = document.getElementById('btn-block-mode');
  const btnBlockConfirm = document.getElementById('btn-block-confirm');
  const btnBlockCancel = document.getElementById('btn-block-cancel');
  
  const menuButtonsContainer = document.getElementById('menu-buttons');
  
  // Tab elements
  const tabBooking = document.getElementById('btn-tab-booking');
  const tabBlock = document.getElementById('btn-tab-block');
  const tabCustomer = document.getElementById('btn-tab-customer');
  const contentBooking = document.getElementById('tab-content-booking');
  const contentBlock = document.getElementById('tab-content-block');
  
  // Menu Dropdown elements
  const menuDropdownToggle = document.getElementById('menu-dropdown-toggle');
  const menuDropdownText = document.getElementById('menu-dropdown-text');
  const menuDropdownIcon = document.getElementById('menu-dropdown-icon');
  
  // Customer Management elements
  const customerMgmtModal = document.getElementById('customer-mgmt-modal');
  const btnCloseMgmt = document.getElementById('btn-close-mgmt');
  const btnNewCustomer = document.getElementById('btn-new-customer');
  const customerSearchInput = document.getElementById('customer-search-input');
  const customerTbody = document.getElementById('customer-tbody');
  const customerListView = document.getElementById('customer-list-view');
  const customerFormView = document.getElementById('customer-form-view');
  const customerEditForm = document.getElementById('customer-edit-form');
  const btnCancelEdit = document.getElementById('btn-cancel-edit');
  const customerFormTitle = document.getElementById('customer-form-title');

  let selectedMenuDuration = 0;
  let selectedMenuName = '';
  let selectedMenuType = 'booked';
  let currentDetailId = null;
  let isBlockMode = false;
  let selectedBlockSlots = []; // ["staffA-09:00", ...]
  let selectedExistingBlocks = []; // [bookingId, ...]

  // Initialize
  updateDateDisplay();
  timeline.innerHTML = '<div style="padding:2rem; text-align:center; color: var(--color-text-sub);">データを読み込んでいます...</div>';

  const fetchAndRefreshData = () => {
    fetch(`${GAS_URL}?action=getInitialData`)
    .then(res => res.json())
    .then(result => {
      if(result.success) {
        menus = result.data.menus.map(m => ({
          id: m['メニューID'], name: m['メニュー名'], duration: parseInt(m['所要時間(分)']), price: m['金額']
        }));
        staffs = result.data.staffs.map(s => ({
          id: s['スタッフID'], name: s['スタッフ名']
        }));
        mockBookings = result.data.bookings.map(b => ({
          id: b['予約ID'],
          date: String(b['予約日']).substring(0, 10),
          startTime: String(b['開始時間']).padStart(5, '0').substring(0, 5), // '9:00' -> '09:00'
          duration: parseInt(b['所要時間(分)']),
          staff: b['担当スタッフ'],
          name: b['お客様名'],
          phone: b['電話番号'],
          email: b['メールアドレス'],
          menu: b['メニュー名'],
          memo: b['メモ'],
          type: b['予約状況']
        }));
        if (result.data.customers) {
          customers = result.data.customers;
        }
        
        renderMenuButtons();
        renderTimeline();
      } else {
        alert('データ取得エラー: ' + result.error);
        timeline.innerHTML = '<div style="padding:2rem; text-align:center; color: red;">データの読み込みに失敗しました。</div>';
      }
    })
    .catch(e => {
      alert('通信エラー: ' + e.message);
      timeline.innerHTML = '<div style="padding:2rem; text-align:center; color: red;">通信エラーが発生しました。</div>';
    });
  };

  function startApp() {
    // 最初のデータ取得を実行
    fetchAndRefreshData();

    // 1分ごとにデータをバックグラウンドで自動更新（ダブルブッキング防止用）
    setInterval(() => {
      fetch(`${GAS_URL}?action=getInitialData`)
        .then(res => res.json())
        .then(result => {
          if(result.success) {
            menus = result.data.menus.map(m => ({
              id: m['メニューID'], name: m['メニュー名'], duration: parseInt(m['所要時間(分)']), price: m['金額']
            }));
            staffs = result.data.staffs.map(s => ({
              id: s['スタッフID'], name: s['スタッフ名']
            }));
            mockBookings = result.data.bookings.map(b => ({
              id: b['予約ID'],
              date: String(b['予約日']).substring(0, 10),
              startTime: String(b['開始時間']).padStart(5, '0').substring(0, 5),
              duration: parseInt(b['所要時間(分)']),
              staff: b['担当スタッフ'],
              name: b['お客様名'],
              phone: b['電話番号'],
              email: b['メールアドレス'],
              menu: b['メニュー名'],
              memo: b['メモ'],
              type: b['予約状況']
            }));
            
            if (result.data.customers) {
              customers = result.data.customers;
            }
            
            // バックグラウンドで最新データに差し替えて画面を更新
            renderTimeline();
          }
        })
        .catch(e => console.error('Auto-refresh failed:', e));
    }, 60000);
  }

  // --- Login Logic ---
  const loginOverlay = document.getElementById('login-overlay');
  const mainAdminContent = document.getElementById('main-admin-content');
  const btnLogin = document.getElementById('btn-login');
  const adminPassword = document.getElementById('admin-password');
  const loginError = document.getElementById('login-error');

  // 仮のパスワード（後でより安全な方法に変更可能）
  const DEMO_PASSWORD = "admin";

  function attemptLogin() {
    if (adminPassword.value === DEMO_PASSWORD) {
      loginOverlay.style.display = 'none';
      mainAdminContent.classList.remove('d-none');
      startApp();
    } else {
      loginError.style.display = 'block';
    }
  }

  if (btnLogin) {
    btnLogin.addEventListener('click', attemptLogin);
  }
  if (adminPassword) {
    adminPassword.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') attemptLogin();
    });
  }

  function updateDateDisplay() {
    dateInput.value = formatDate(currentDate);
    dateDisplay.innerText = formatDisplayDate(currentDate);
  }

  function renderMenuButtons() {
    menuButtonsContainer.innerHTML = '';
    menus.forEach(menu => {
      const btn = document.createElement('button');
      btn.className = 'btn btn-outline menu-btn btn-full';
      btn.dataset.duration = menu.duration;
      btn.dataset.type = 'booked';
      btn.dataset.name = menu.name;
      btn.innerText = `${menu.name} (${menu.duration}分)`;
      
      btn.addEventListener('click', () => {
        if (isBlockMode) exitBlockMode();
        
        const allBtns = menuButtonsContainer.querySelectorAll('.menu-btn');
        if (!btn.classList.contains('btn-outline')) {
          btn.classList.add('btn-outline');
          selectedMenuDuration = 0;
          selectedMenuName = '';
          menuDropdownText.innerText = 'メニューを選択';
          menuDropdownToggle.classList.add('btn-outline');
        } else {
          allBtns.forEach(b => b.classList.add('btn-outline'));
          btn.classList.remove('btn-outline');
          selectedMenuDuration = menu.duration;
          selectedMenuName = menu.name;
          selectedMenuType = 'booked';
          menuDropdownText.innerText = `${menu.name} (${menu.duration}分)`;
          menuDropdownToggle.classList.remove('btn-outline');
          
          // メニューを選択したらアコーディオンを閉じる
          menuButtonsContainer.style.display = 'none';
          menuDropdownIcon.innerText = '▼';
        }
        
        renderTimeline();
      });
      
      menuButtonsContainer.appendChild(btn);
    });
  }

  // Event Listeners
  document.getElementById('prev-day').addEventListener('click', () => {
    currentDate.setDate(currentDate.getDate() - 1);
    updateDateDisplay();
    renderTimeline();
  });
  document.getElementById('next-day').addEventListener('click', () => {
    currentDate.setDate(currentDate.getDate() + 1);
    updateDateDisplay();
    renderTimeline();
  });
  dateInput.addEventListener('change', (e) => {
    currentDate = new Date(e.target.value);
    updateDateDisplay();
    renderTimeline();
  });
  
  dateInput.addEventListener('click', function(e) {
    if (typeof this.showPicker === 'function') {
      try { this.showPicker(); } catch (err) {}
    }
  });

  // Tab Logic
  function resetTabs() {
    contentBooking.style.display = 'none';
    contentBlock.style.display = 'none';
    
    // reset button styles
    tabBooking.classList.remove('btn');
    tabBooking.classList.add('btn-outline');
    tabBlock.classList.remove('btn');
    tabBlock.classList.add('btn-outline');
    tabCustomer.classList.remove('btn');
    tabCustomer.classList.add('btn-outline');
    
    // Reset states
    if (isBlockMode) {
      exitBlockMode();
      renderTimeline();
    }
    selectedMenuDuration = 0;
    selectedMenuName = '';
    menuDropdownText.innerText = 'メニューを選択';
    menuDropdownToggle.classList.add('btn-outline');
    menuButtonsContainer.style.display = 'none';
    menuDropdownIcon.innerText = '▼';

    const allBtns = menuButtonsContainer.querySelectorAll('.menu-btn');
    allBtns.forEach(b => b.classList.add('btn-outline'));
  }

  // Menu Dropdown Logic
  menuDropdownToggle.addEventListener('click', () => {
    if (menuButtonsContainer.style.display !== 'block') {
      menuButtonsContainer.style.display = 'block';
      menuDropdownIcon.innerText = '▲';
    } else {
      menuButtonsContainer.style.display = 'none';
      menuDropdownIcon.innerText = '▼';
    }
  });

  tabBooking.addEventListener('click', () => {
    resetTabs();
    contentBooking.style.display = 'block';
    tabBooking.classList.remove('btn-outline');
    tabBooking.classList.add('btn');
  });

  tabBlock.addEventListener('click', () => {
    resetTabs();
    contentBlock.style.display = 'block';
    tabBlock.classList.remove('btn-outline');
    tabBlock.classList.add('btn');
  });

  tabCustomer.addEventListener('click', () => {
    // 顧客データはモーダルを開くので、元のタブを維持しても良いが
    // わかりやすく「タブが押された」状態にするかはお好み。今回はモーダルを開くだけ。
    openCustomerMgmtModal();
  });

  // Block Mode Logic
  btnBlockMode.addEventListener('click', () => {
    if (isBlockMode) {
      exitBlockMode();
      renderTimeline();
      return;
    }
    
    isBlockMode = true;
    selectedBlockSlots = [];
    selectedExistingBlocks = [];
    
    btnBlockMode.classList.remove('btn-outline');
    btnBlockMode.classList.add('btn');
    btnBlockConfirm.classList.remove('d-none');
    btnBlockCancel.classList.remove('d-none');
    
    renderTimeline();
  });

  btnBlockCancel.addEventListener('click', () => {
    if (selectedExistingBlocks.length > 0) {
      // 本来はGASに削除リクエストを送るが今回はモックのまま
      mockBookings = mockBookings.filter(b => !selectedExistingBlocks.includes(b.id));
    }
    exitBlockMode();
    renderTimeline();
  });

  btnBlockConfirm.addEventListener('click', () => {
    if (selectedBlockSlots.length === 0) {
      alert('ブロックする枠が選択されていません。');
      return;
    }
    
    const submitBtn = btnBlockConfirm;
    submitBtn.innerText = '処理中...';
    submitBtn.disabled = true;
    
    // GASへ複数ブロックを送信する処理
    // 今回は簡易的に1つずつ送るか、あるいは単一のcreateBookingで送る
    // （完全なバルク登録APIはGAS側にないため、1つずつ送るループにする）
    
    const promises = selectedBlockSlots.map(slotStr => {
      const [staffId, timeStr] = slotStr.split('-');
      const payload = {
        date: formatDate(currentDate),
        startTime: timeStr,
        duration: 30, // ブロックのデフォルト時間
        staff: staffId, // 追加: スタッフIDがないとGAS側で紐付けられず消えてしまう
        name: '休み',
        phone: '',
        menu: '',
        type: '休み'
      };
      
      return fetch(GAS_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({ action: 'createBooking', payload })
      }).then(res => res.json());
    });
    
    Promise.all(promises).then(results => {
      // 成功したらローカルのmockBookingsも更新する
      results.forEach((res, i) => {
        if(res.success) {
          const slotStr = selectedBlockSlots[i];
          const [staffId, timeStr] = slotStr.split('-');
          mockBookings.push({
            id: res.data.bookingId,
            date: formatDate(currentDate),
            startTime: timeStr,
            duration: 30,
            staff: staffId,
            name: '休み',
            type: '休み' // ローカル反映時も '休み' に統一する
          });
        }
      });
      submitBtn.innerText = '設定';
      submitBtn.disabled = false;
      exitBlockMode();
      renderTimeline();
      alert('ブロックを登録しました。');
    }).catch(e => {
      alert('エラーが発生しました: ' + e.message);
      submitBtn.innerText = '設定';
      submitBtn.disabled = false;
    });
  });

  function exitBlockMode() {
    isBlockMode = false;
    selectedBlockSlots = [];
    selectedExistingBlocks = [];
    btnBlockMode.classList.add('btn-outline');
    btnBlockConfirm.classList.add('d-none');
    btnBlockCancel.classList.add('d-none');
  }

  document.getElementById('btn-close-modal').addEventListener('click', () => {
    modal.classList.add('d-none');
  });

  document.getElementById('btn-close-details').addEventListener('click', () => {
    detailsModal.classList.add('d-none');
    currentDetailId = null;
  });

  document.getElementById('btn-close-customer').addEventListener('click', () => {
    customerModal.classList.add('d-none');
    detailsModal.classList.remove('d-none'); // 元の予約詳細画面を再表示
  });

  function showCustomerModal(name, phone) {
    const customer = customers.find(c => c['お客様名'] === name && (String(c['電話番号']||"").replace(/'/g, "") === phone));
    
    document.getElementById('customer-name').innerText = name;
    
    if (customer) {
      document.getElementById('customer-kana').innerText = customer['ふりがな'] || "未登録";
      document.getElementById('customer-address').innerText = customer['住所（市町村）'] || "未登録";
      document.getElementById('customer-occupation').innerText = customer['職業'] || "未登録";
      document.getElementById('customer-phone').innerText = String(customer['電話番号']||"").replace(/'/g, "") || "未登録";
      document.getElementById('customer-email').innerText = customer['メールアドレス'] || "未登録";
      document.getElementById('customer-first-visit').innerText = customer['初回予約日'] || "-";
      document.getElementById('customer-last-visit').innerText = customer['最終来店日'] || "-";
      document.getElementById('customer-notes').innerText = customer['メモ'] || "なし";
    } else {
      document.getElementById('customer-kana').innerText = "未登録";
      document.getElementById('customer-address').innerText = "未登録";
      document.getElementById('customer-occupation').innerText = "未登録";
      document.getElementById('customer-phone').innerText = phone || "未登録";
      document.getElementById('customer-email').innerText = "未登録";
      document.getElementById('customer-first-visit').innerText = "-";
      document.getElementById('customer-last-visit').innerText = "-";
      document.getElementById('customer-notes').innerText = "なし";
    }
    
    detailsModal.classList.add('d-none'); // 予約詳細画面を隠して二重枠を防ぐ
    customerModal.classList.remove('d-none');
  }

  document.getElementById('btn-cancel-booking').addEventListener('click', () => {
    if (confirm('本当にこの予約をキャンセル（削除）しますか？\n（※本番環境ではお客様にもキャンセル通知が送信されます）')) {
      
      const submitBtn = document.getElementById('btn-cancel-booking');
      const originalText = submitBtn.innerText;
      submitBtn.innerText = '処理中...';
      submitBtn.disabled = true;

      fetch(GAS_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({ action: 'cancelBooking', payload: { bookingId: currentDetailId } })
      })
      .then(res => res.json())
      .then(result => {
        if(result.success) {
          // ローカルのデータも更新
          const b = mockBookings.find(bk => bk.id === currentDetailId);
          if (b) b.type = 'キャンセル済';
          
          detailsModal.classList.add('d-none');
          renderTimeline();
          alert('予約をキャンセルしました。');
        } else {
          alert('キャンセルエラー: ' + result.error);
        }
      })
      .catch(err => alert('通信エラー: ' + err.message))
      .finally(() => {
        submitBtn.innerText = originalText;
        submitBtn.disabled = false;
      });
    }
  });

  // Submit new booking
  document.getElementById('proxy-booking-form').addEventListener('submit', (e) => {
    e.preventDefault();
    const name = document.getElementById('proxy-name').value;
    const phone = document.getElementById('proxy-phone').value;
    
    const submitBtn = e.target.querySelector('button[type="submit"]');
    submitBtn.innerText = '処理中...';
    submitBtn.disabled = true;
    
    const payload = {
      date: formatDate(currentDate),
      startTime: pendingBooking.startTime,
      duration: pendingBooking.duration,
      staff: pendingBooking.staff,
      name: name,
      phone: phone,
      menu: selectedMenuName,
      type: pendingBooking.type
    };

    fetch(GAS_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({ action: 'createBooking', payload })
    })
    .then(res => res.json())
    .then(result => {
      if(result.success) {
        // Add to local data
        mockBookings.push({
          id: result.data.bookingId,
          ...payload
        });
        
        modal.classList.add('d-none');
        e.target.reset();
        
        const allBtns = menuButtonsContainer.querySelectorAll('.menu-btn');
        allBtns.forEach(b => {
          b.classList.add('btn-outline');
          b.style.backgroundColor = '';
          b.style.color = '';
        });
        selectedMenuDuration = 0;
        selectedMenuName = '';
        selectedMenuType = '予約済';
        menuDropdownText.innerText = 'メニューを選択';
        menuDropdownToggle.classList.add('btn-outline');
        
        renderTimeline();
        alert('予約を登録しました。');
      } else {
        alert('登録エラー: ' + result.error);
      }
    })
    .catch(err => alert('通信エラー: ' + err.message))
    .finally(() => {
      submitBtn.innerText = '予約を確定';
      submitBtn.disabled = false;
    });
  });

  // Utils
  function formatDate(d) {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  }
  
  function formatDisplayDate(d) {
    const daysOfWeek = ['日', '月', '火', '水', '木', '金', '土'];
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    const dow = daysOfWeek[d.getDay()];
    return `${y}/${m}/${day} (${dow})`;
  }
  
  function timeToMinutes(timeStr) {
    if(!timeStr || typeof timeStr !== 'string') return 0;
    const [h, m] = timeStr.split(':').map(Number);
    return h * 60 + m;
  }
  
  function minutesToTime(mins) {
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
  }

  // Render Timeline
  let pendingBooking = null;

  function renderTimeline() {
    timeline.innerHTML = '';
    const selectedDateStr = formatDate(currentDate);
    const bookingsToday = mockBookings.filter(b => b.date === selectedDateStr);
    
    const requiredDuration = selectedMenuDuration;
    const requestedStaff = 'any';

    const timeCol = document.createElement('div');
    timeCol.className = 'timeline-time-col';
    
    const timeHeader = document.createElement('div');
    timeHeader.className = 'timeline-header';
    timeHeader.innerText = '時間';
    timeCol.appendChild(timeHeader);

    const startMins = 9 * 60;
    const endMins = 19 * 60;
    const slotMins = 30;

    for (let m = startMins; m < endMins; m += slotMins) {
      const cell = document.createElement('div');
      cell.className = 'timeline-time-cell';
      cell.innerText = minutesToTime(m);
      timeCol.appendChild(cell);
    }
    timeline.appendChild(timeCol);

    staffs.forEach(staff => {
      const staffCol = document.createElement('div');
      staffCol.className = 'timeline-staff-col';
      
      const header = document.createElement('div');
      header.className = 'timeline-header';
      header.innerText = staff.name;
      staffCol.appendChild(header);

      const slotsContainer = document.createElement('div');
      slotsContainer.style.position = 'relative';

      const numSlots = (endMins - startMins) / slotMins;
      const isFree = new Array(numSlots).fill(true);

      bookingsToday.filter(b => b.staff === staff.id && b.type !== 'キャンセル済').forEach(b => {
        const bStart = timeToMinutes(b.startTime);
        const startIndex = (bStart - startMins) / slotMins;
        const slotsNeeded = b.duration / slotMins;
        for (let i = startIndex; i < startIndex + slotsNeeded; i++) {
          if (i >= 0 && i < numSlots) isFree[Math.floor(i)] = false;
        }
        
        const block = document.createElement('div');
        block.className = `booking-block ${b.type === '休み' ? 'booking-blocked' : 'booking-booked'}`;
        block.style.top = `${startIndex * 40}px`;
        block.style.height = `${slotsNeeded * 40}px`;
        
        let contentHtml = `<strong>${b.startTime}</strong><br>${b.name}`;
        if (b.type === '予約済' && b.menu) {
          contentHtml += `<br><span style="font-size: 0.75rem;">${b.menu}</span>`;
        }
        if (b.type === '予約済' && b.memo) {
          contentHtml += `<br><span style="color: #ffcccc; font-size: 0.75rem; font-weight: bold; background: rgba(200,0,0,0.5); padding: 0 4px; border-radius: 4px; display: inline-block; margin-top: 2px;">要望あり</span>`;
        }
        block.innerHTML = contentHtml;
        
        block.style.cursor = 'pointer';
        block.addEventListener('click', (e) => {
          e.stopPropagation();
          
          if (isBlockMode && b.type === '休み') {
            if (selectedExistingBlocks.includes(b.id)) {
              selectedExistingBlocks = selectedExistingBlocks.filter(id => id !== b.id);
            } else {
              selectedExistingBlocks.push(b.id);
            }
            renderTimeline();
            return;
          }
          
          if (isBlockMode) return;
          
          if (b.type === '休み') {
            const newName = prompt('ブロックの名称を編集:', b.name);
            if (newName !== null) {
              b.name = newName.trim() || '休み';
              // 本来はGASに更新リクエストを送る
              renderTimeline();
            }
            return;
          }
          
          currentDetailId = b.id;
          document.getElementById('detail-datetime').innerText = `${formatDisplayDate(new Date(b.date))} ${b.startTime} 〜`;
          
          const cancelBtn = document.getElementById('btn-cancel-booking');
          if (b.type === '休み') {
            document.getElementById('detail-menu').innerText = 'お休み・予定ブロック';
            cancelBtn.classList.add('d-none');
            document.getElementById('detail-phone-container').classList.add('d-none');
            document.getElementById('detail-email-container').classList.add('d-none');
          } else {
            document.getElementById('detail-menu').innerText = `${b.menu ? b.menu + ' ' : ''}(所要時間: ${b.duration}分)`;
            cancelBtn.classList.remove('d-none');
            if (b.phone) {
              document.getElementById('detail-phone-container').classList.remove('d-none');
              document.getElementById('detail-phone').innerText = b.phone;
            } else {
              document.getElementById('detail-phone-container').classList.add('d-none');
            }
            if (b.memo) {
              document.getElementById('detail-memo-container').classList.remove('d-none');
              document.getElementById('detail-memo').innerText = b.memo;
            } else {
              document.getElementById('detail-memo-container').classList.add('d-none');
            }
          }
          
          document.getElementById('detail-staff').innerText = `担当: ${staffs.find(s => s.id === b.staff).name}`;
          document.getElementById('detail-name').innerText = b.name;
          
          document.getElementById('detail-name').onclick = () => {
            if (b.type === '休み') return;
            showCustomerModal(b.name, String(b.phone || "").replace(/'/g, ""));
          };
          
          detailsModal.classList.remove('d-none');
        });

        if (isBlockMode && b.type === '休み' && selectedExistingBlocks.includes(b.id)) {
          block.style.backgroundColor = 'rgba(114, 28, 36, 0.7)';
          block.style.color = 'white';
        }

        slotsContainer.appendChild(block);
      });

      for (let i = 0; i < numSlots; i++) {
        const slot = document.createElement('div');
        slot.className = 'timeline-slot';
        
        let canBookHere = false;
        if (isBlockMode) {
          canBookHere = isFree[i];
        } else if (requiredDuration > 0) {
          if (requestedStaff === 'any' || requestedStaff === staff.id) {
            const slotsNeeded = requiredDuration / slotMins;
            canBookHere = true;
            for (let j = 0; j < slotsNeeded; j++) {
              if (i + j >= numSlots || !isFree[i + j]) {
                canBookHere = false;
                break;
              }
            }
          }
        }

        if (canBookHere) {
          slot.classList.add('available');
          const sTime = minutesToTime(startMins + (i * slotMins));
          const slotStr = `${staff.id}-${sTime}`;
          
          if (isBlockMode && selectedBlockSlots.includes(slotStr)) {
            slot.style.backgroundColor = 'rgba(114, 28, 36, 0.3)';
          }

          slot.title = isBlockMode ? 'クリックして選択' : 'クリックして予約';
          
          slot.addEventListener('click', () => {
            if (isBlockMode) {
              if (selectedBlockSlots.includes(slotStr)) {
                selectedBlockSlots = selectedBlockSlots.filter(s => s !== slotStr);
              } else {
                selectedBlockSlots.push(slotStr);
              }
              renderTimeline();
              return;
            }
            
            pendingBooking = {
              startTime: sTime,
              duration: requiredDuration,
              staff: staff.id,
              type: selectedMenuType
            };
              
            document.getElementById('modal-datetime').innerText = `${formatDisplayDate(currentDate)} ${sTime} 〜`;
            document.getElementById('modal-menu').innerText = `${selectedMenuName} (${requiredDuration}分)`;
            document.getElementById('modal-staff').innerText = `担当: ${staff.name}`;
            
            if (selectedMenuType === '休み') {
              document.getElementById('proxy-name').value = 'お休み (用事)';
              document.getElementById('proxy-name').required = false;
              document.getElementById('proxy-phone').required = false;
              document.getElementById('proxy-phone').parentElement.classList.add('d-none');
            } else {
              document.getElementById('proxy-name').value = '';
              document.getElementById('proxy-name').required = true;
              document.getElementById('proxy-phone').required = true;
              document.getElementById('proxy-phone').parentElement.classList.remove('d-none');
            }
            
            modal.classList.remove('d-none');
          });
            
        } else if (requiredDuration > 0 || isBlockMode) {
          slot.classList.add('unavailable');
        }
        
        slotsContainer.appendChild(slot);
      }

      staffCol.appendChild(slotsContainer);
      timeline.appendChild(staffCol);
    });
  }

  // --- Autocomplete Logic ---
  const nameInput = document.getElementById('proxy-name');
  const phoneInput = document.getElementById('proxy-phone');
  const autocompleteList = document.getElementById('autocomplete-list');

  nameInput.addEventListener('input', (e) => {
    const val = e.target.value.trim();
    autocompleteList.innerHTML = '';
    
    if (!val) {
      autocompleteList.classList.add('d-none');
      return;
    }

    const searchVal = val.replace(/[\s　]/g, '');
    
    // customers配列から候補を探す
    const matches = customers.filter(c => {
      const nameMatch = (c['お客様名'] || "").replace(/[\s　]/g, '').includes(searchVal);
      const kanaMatch = (c['ふりがな'] || "").replace(/[\s　]/g, '').includes(searchVal);
      const phoneMatch = String(c['電話番号']||"").replace(/-/g, '').replace(/'/g, '').includes(searchVal);
      return nameMatch || kanaMatch || phoneMatch;
    });
    
    if (matches.length > 0) {
      autocompleteList.classList.remove('d-none');
      matches.forEach(match => {
        const cName = match['お客様名'] || '';
        const cPhone = String(match['電話番号'] || '').replace(/'/g, "");
        const item = document.createElement('div');
        item.className = 'autocomplete-item';
        item.innerHTML = `<strong>${cName}</strong> <span class="meta-info">(${cPhone})</span>`;
        item.addEventListener('click', () => {
          nameInput.value = cName;
          phoneInput.value = cPhone;
          autocompleteList.classList.add('d-none');
        });
        autocompleteList.appendChild(item);
      });
    } else {
      autocompleteList.classList.add('d-none');
    }
  });

  document.addEventListener('click', (e) => {
    if (!nameInput.contains(e.target) && !autocompleteList.contains(e.target)) {
      autocompleteList.classList.add('d-none');
    }
  });

  // --- Customer Management Logic ---
  
  function openCustomerMgmtModal() {
    customerMgmtModal.classList.remove('d-none');
    showCustomerListView();
  }
  
  btnCloseMgmt.addEventListener('click', () => {
    customerMgmtModal.classList.add('d-none');
  });

  function showCustomerListView() {
    customerFormView.classList.add('d-none');
    customerListView.classList.remove('d-none');
    renderCustomerList();
  }

  function showCustomerFormView(customer = null) {
    customerListView.classList.add('d-none');
    customerFormView.classList.remove('d-none');
    
    if (customer) {
      customerFormTitle.innerText = "顧客データの編集";
      document.getElementById('edit-customer-id').value = customer['顧客ID'];
      document.getElementById('edit-name').value = customer['お客様名'] || '';
      document.getElementById('edit-kana').value = customer['ふりがな'] || '';
      document.getElementById('edit-phone').value = String(customer['電話番号']||'').replace(/'/g, "");
      document.getElementById('edit-address').value = customer['住所（市町村）'] || '';
      document.getElementById('edit-occupation').value = customer['職業'] || '';
      document.getElementById('edit-email').value = customer['メールアドレス'] || '';
      document.getElementById('edit-memo').value = customer['メモ'] || '';
    } else {
      customerFormTitle.innerText = "新規顧客の登録";
      document.getElementById('edit-customer-id').value = '';
      customerEditForm.reset();
    }
  }

  btnNewCustomer.addEventListener('click', () => {
    showCustomerFormView(null);
  });

  btnCancelEdit.addEventListener('click', () => {
    showCustomerListView();
  });

  function renderCustomerList() {
    const searchVal = customerSearchInput.value.trim().replace(/[\s　]/g, '');
    customerTbody.innerHTML = '';
    
    const filtered = customers.filter(c => {
      if (!searchVal) return true;
      const nameMatch = (c['お客様名'] || "").replace(/[\s　]/g, '').includes(searchVal);
      const kanaMatch = (c['ふりがな'] || "").replace(/[\s　]/g, '').includes(searchVal);
      const phoneMatch = String(c['電話番号']||"").replace(/-/g, '').replace(/'/g, '').includes(searchVal);
      return nameMatch || kanaMatch || phoneMatch;
    });

    if (filtered.length === 0) {
      customerTbody.innerHTML = `<tr><td colspan="3" style="text-align: center; padding: 1rem; color: #777;">見つかりませんでした</td></tr>`;
      return;
    }

    // 登録日時で新しい順に並び替え
    filtered.sort((a, b) => {
      const dateA = new Date(a['登録日時'] || 0).getTime();
      const dateB = new Date(b['登録日時'] || 0).getTime();
      return dateB - dateA;
    });

    filtered.forEach(c => {
      const tr = document.createElement('tr');
      tr.style.cursor = 'pointer';
      tr.addEventListener('click', () => {
        showCustomerFormView(c);
      });
      tr.addEventListener('mouseenter', () => { tr.style.backgroundColor = 'rgba(0,0,0,0.02)'; });
      tr.addEventListener('mouseleave', () => { tr.style.backgroundColor = 'transparent'; });
      
      const phone = String(c['電話番号']||"").replace(/'/g, "") || "-";
      tr.innerHTML = `
        <td style="padding: 0.75rem; border-bottom: 1px solid var(--color-border); font-weight: bold; color: var(--color-primary);">${c['お客様名']}</td>
        <td style="padding: 0.75rem; border-bottom: 1px solid var(--color-border);">${phone}</td>
        <td style="padding: 0.75rem; border-bottom: 1px solid var(--color-border); text-align: right; color: var(--color-text-sub);">編集 &gt;</td>
      `;
      customerTbody.appendChild(tr);
    });
  }

  customerSearchInput.addEventListener('input', renderCustomerList);

  customerEditForm.addEventListener('submit', (e) => {
    e.preventDefault();
    
    const submitBtn = document.getElementById('btn-save-customer');
    const originalText = submitBtn.innerText;
    submitBtn.innerText = '保存中...';
    submitBtn.disabled = true;

    const payload = {
      '顧客ID': document.getElementById('edit-customer-id').value,
      'お客様名': document.getElementById('edit-name').value,
      'ふりがな': document.getElementById('edit-kana').value,
      '電話番号': document.getElementById('edit-phone').value,
      '住所（市町村）': document.getElementById('edit-address').value,
      '職業': document.getElementById('edit-occupation').value,
      'メールアドレス': document.getElementById('edit-email').value,
      'メモ': document.getElementById('edit-memo').value
    };

    fetch(GAS_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({ action: 'saveCustomer', payload: payload })
    })
    .then(res => res.json())
    .then(result => {
      if(result.success) {
        // UI上で即座にデータを反映させるため、再度フェッチするかローカルを更新する
        // 今回はシンプルに再取得を行う
        fetchAndRefreshData();
        showCustomerListView();
      } else {
        alert('保存に失敗しました: ' + result.error);
      }
    })
    .catch(err => {
      alert('通信エラー: ' + err.message);
    })
    .finally(() => {
      submitBtn.innerText = originalText;
      submitBtn.disabled = false;
    });
  });

});
