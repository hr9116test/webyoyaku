// admin.js

function formatGasTime(isoString) {
  if (!isoString) return "";
  if (!isoString.includes("T")) return isoString.substring(0,5);
  const d = new Date(isoString);
  return d.toLocaleTimeString("ja-JP", { hour: "2-digit", minute: "2-digit", timeZone: "Asia/Tokyo" });
}
const GAS_URL = 'https://script.google.com/macros/s/AKfycbwcQIx5rmTuZ60bihVUvvGLdnaco5XgT60qN-mQO6QDAZIXdgIVZ-d5mkjODq-QTlzb/exec';

document.addEventListener('DOMContentLoaded', () => {
  // State
  let currentDate = new Date();
  
  let mockBookings = [];
  let staffs = [];
  let menus = [];

  // DOM Elements
  const dateInput = document.getElementById('current-date');
  const dateDisplay = document.getElementById('date-display');
  const timeline = document.getElementById('timeline');
    const menuDropdownToggle = document.getElementById('menu-dropdown-toggle');
    const menuDropdownText = document.getElementById('menu-dropdown-text');
    const menuDropdownIcon = document.getElementById('menu-dropdown-icon');
  const modal = document.getElementById('booking-modal');
  const detailsModal = document.getElementById('details-modal');
  const btnBlockMode = document.getElementById('btn-block-mode');
  const btnBlockConfirm = document.getElementById('btn-block-confirm');
  const btnBlockCancel = document.getElementById('btn-block-cancel');
  
  const mobileMenuToggle = document.getElementById('mobile-menu-toggle');
  const menuButtonsContainer = document.getElementById('menu-buttons');

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

  
    const fetchAdminData = () => {
      fetch(`${GAS_URL}?action=getInitialData`)
        .then(res => res.json())
        .then(result => {
      if(result.success) {
        menus = result.data.menus.map(m => { const v = Object.values(m); return { id: v[0], name: v[1], duration: parseInt(v[2]), price: v[3] }; });
        staffs = result.data.staffs.map(s => { const v = Object.values(s); return { id: v[0], name: v[1] }; });
        mockBookings = result.data.bookings.map(b => { 
  const v = Object.values(b); 
  let rawType = String(v[9]);
  let mappedType = rawType;
  if(rawType.includes("予約") || rawType === "booked") mappedType = "booked";
  if(rawType.includes("休み") || rawType === "blocked") mappedType = "blocked";
  if(rawType.includes("キャンセル")) mappedType = "cancelled";
  
  return { id: v[0], date: String(v[1]).substring(0,10), startTime: formatGasTime(String(v[2])), duration: parseInt(v[3]), staff: v[4], type: mappedType, name: v[5], phone: v[6], menu: v[8], memo: v[11] }; 
}).filter(b => b.type !== "cancelled");
        
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

    const loginOverlay = document.getElementById("login-overlay");
    const mainContent = document.getElementById("main-admin-content");
    const btnLogin = document.getElementById("btn-login");
    const loginError = document.getElementById("login-error");
    const pwdInput = document.getElementById("admin-password");

    if (btnLogin && loginOverlay) {
      btnLogin.addEventListener("click", () => {
        if (pwdInput.value === "admin") {
          loginOverlay.style.display = "none";
          mainContent.classList.remove("d-none");
          fetchAdminData();
        } else {
          loginError.style.display = "block";
        }
      });
    } else {
      fetchAdminData();
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
        } else {
          allBtns.forEach(b => b.classList.add('btn-outline'));
          btn.classList.remove('btn-outline');
          selectedMenuDuration = menu.duration;
          selectedMenuName = menu.name;
          selectedMenuType = 'booked';
        }
        
        if (window.innerWidth < 768 && mobileMenuToggle) {
          menuButtonsContainer.classList.remove('show');
          if (selectedMenuName) {
            mobileMenuToggle.innerText = `${selectedMenuName} (${selectedMenuDuration}分) ▼`;
            mobileMenuToggle.classList.remove('btn-outline');
          } else {
            mobileMenuToggle.innerText = 'メニューを選択 ▼';
            mobileMenuToggle.classList.add('btn-outline');
          }
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

  if (menuDropdownToggle) {
      menuDropdownToggle.addEventListener('click', () => {
        const isClosed = menuButtonsContainer.style.display === 'none';
        if (isClosed) {
          menuButtonsContainer.style.display = 'block';
          if(menuDropdownIcon) menuDropdownIcon.innerText = ''; // Up arrow
        } else {
          menuButtonsContainer.style.display = 'none';
          if(menuDropdownIcon) menuDropdownIcon.innerText = ''; // Down arrow
        }
      });
    }
    if (mobileMenuToggle) {
    mobileMenuToggle.addEventListener('click', () => {
      menuButtonsContainer.classList.toggle('show');
      mobileMenuToggle.innerText = menuButtonsContainer.classList.contains('show') 
        ? 'メニューを閉じる ▲' 
        : (selectedMenuName ? `${selectedMenuName} (${selectedMenuDuration}分) ▼` : 'メニューを選択 ▼');
    });
  }

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
    
    const allBtns = menuButtonsContainer.querySelectorAll('.menu-btn');
    allBtns.forEach(b => b.classList.add('btn-outline'));
    selectedMenuDuration = 0;
    selectedMenuName = '';
    
    if (window.innerWidth < 768 && mobileMenuToggle) {
      mobileMenuToggle.innerText = 'メニューを選択 ▼';
      mobileMenuToggle.classList.add('btn-outline');
    }
    
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
        duration: 30,
        staff: staffId,
        name: '休み',
        type: 'blocked'
      };
      
      return fetch(GAS_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
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
            type: 'blocked'
          });
        }
      });
      submitBtn.innerText = '確定';
      submitBtn.disabled = false;
      exitBlockMode();
      renderTimeline();
      alert('ブロックを登録しました。');
    }).catch(e => {
      alert('エラーが発生しました: ' + e.message);
      submitBtn.innerText = '確定';
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
  });

  document.getElementById('btn-cancel-booking').addEventListener('click', () => {
    if (confirm('本当にこの予約をキャンセル（削除）しますか？\n（※本番環境ではお客様にもキャンセル通知が送信されます）')) {
      // 本来はGASに削除リクエストを送る
      mockBookings = mockBookings.filter(b => b.id !== currentDetailId);
      detailsModal.classList.add('d-none');
      renderTimeline();
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
      headers: { 'Content-Type': 'application/json' },
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
        selectedMenuType = 'booked';
        
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

      bookingsToday.filter(b => b.staff === staff.id).forEach(b => {
        const bStart = timeToMinutes(b.startTime);
        const startIndex = (bStart - startMins) / slotMins;
        const slotsNeeded = b.duration / slotMins;
        for (let i = startIndex; i < startIndex + slotsNeeded; i++) {
          if (i >= 0 && i < numSlots) isFree[Math.floor(i)] = false;
        }
        
        const block = document.createElement('div');
        block.className = `booking-block ${b.type === 'blocked' ? 'booking-blocked' : 'booking-booked'}`;
        block.style.top = `${startIndex * 40}px`;
        block.style.height = `${slotsNeeded * 40}px`;
        
        let contentHtml = `<strong>${b.startTime}</strong><br>${b.name}`;
        if (b.type === 'booked' && b.menu) {
          contentHtml += `<br><span style="font-size: 0.75rem;">${b.menu}</span>`;
        }
        block.innerHTML = contentHtml;
        
        block.style.cursor = 'pointer';
        block.addEventListener('click', (e) => {
          e.stopPropagation();
          
          if (isBlockMode && b.type === 'blocked') {
            if (selectedExistingBlocks.includes(b.id)) {
              selectedExistingBlocks = selectedExistingBlocks.filter(id => id !== b.id);
            } else {
              selectedExistingBlocks.push(b.id);
            }
            renderTimeline();
            return;
          }
          
          if (isBlockMode) return;
          
          if (b.type === 'blocked') {
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
          if (b.type === 'blocked') {
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
            if (b.email) {
              document.getElementById('detail-email-container').classList.remove('d-none');
              document.getElementById('detail-email').innerText = b.email;
            } else {
              document.getElementById('detail-email-container').classList.add('d-none');
            }
          }
          
          document.getElementById('detail-staff').innerText = `担当: ${staffs.find(s => String(s.id) === String(b.staff)).name}`;
          document.getElementById('detail-name').innerText = b.name;
          detailsModal.classList.remove('d-none');
        });

        if (isBlockMode && b.type === 'blocked' && selectedExistingBlocks.includes(b.id)) {
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
            
            if (selectedMenuType === 'blocked') {
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
  const mockCustomers = [
    { name: '小布施 太郎', kana: 'おぶせ たろう', phone: '090-1234-5678' }
  ];

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
    
    const matches = customers.filter(c => {
      const nameMatch = c.name.replace(/[\s　]/g, '').includes(searchVal);
      const kanaMatch = c.kana.replace(/[\s　]/g, '').includes(searchVal);
      const phoneMatch = c.phone.replace(/-/g, '').includes(searchVal);
      return nameMatch || kanaMatch || phoneMatch;
    });
    
    if (matches.length > 0) {
      autocompleteList.classList.remove('d-none');
      matches.forEach(match => {
        const item = document.createElement('div');
        item.className = 'autocomplete-item';
        item.innerHTML = `<strong>${match.name}</strong> <span class="meta-info">(${match.phone})</span>`;
        item.addEventListener('click', () => {
          nameInput.value = match.name;
          phoneInput.value = match.phone;
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

});

  // --- Tab Toggle Logic ---
  const tabToggles = document.querySelectorAll('.tab-toggle');
  const tabContents = document.querySelectorAll('.tab-content');
  tabToggles.forEach(btn => {
    btn.addEventListener('click', () => {
      tabToggles.forEach(b => {
        b.classList.remove('btn-primary');
        b.classList.add('btn-outline');
      });
      tabContents.forEach(c => c.style.display = 'none');
      btn.classList.add('btn-primary');
      btn.classList.remove('btn-outline');
      if (btn.id === "btn-tab-customer") {
        const customerModal = document.getElementById("customer-mgmt-modal");
        if (customerModal) customerModal.classList.remove("d-none");
        
        btn.classList.remove("btn-primary");
        btn.classList.add("btn-outline");
      } else {
        const targetId = btn.id.replace("btn-tab-", "tab-content-");
        const targetContent = document.getElementById(targetId);
        if (targetContent) targetContent.style.display = "block";
      }
    });
  });









  let customers = [];
  
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

  function fetchCustomers() {
    fetch(GAS_URL + '?action=getCustomers')
      .then(res => res.json())
      .then(result => {
        if(result.success) {
          // Fix for mojibake data
          customers = result.data.map(c => {
             const v = Object.values(c);
             return { id: v[0], name: v[1], kana: v[2], phone: v[3], address: v[4], occupation: v[5], email: v[6], memo: v[8] };
          });
          renderCustomerList();
        }
      });
  }
  
  if (customerMgmtModal) {
      fetchCustomers();
      
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
          document.getElementById('edit-customer-id').value = customer.id;
          document.getElementById('edit-name').value = customer.name || '';
          document.getElementById('edit-kana').value = customer.kana || '';
          document.getElementById('edit-phone').value = customer.phone || '';
          document.getElementById('edit-address').value = customer.address || '';
          document.getElementById('edit-occupation').value = customer.occupation || '';
          document.getElementById('edit-email').value = customer.email || '';
          document.getElementById('edit-memo').value = customer.memo || '';
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
          const nameMatch = (c.name || "").replace(/[\s　]/g, '').includes(searchVal);
          const kanaMatch = (c.kana || "").replace(/[\s　]/g, '').includes(searchVal);
          const phoneMatch = String(c.phone||"").replace(/-/g, '').includes(searchVal);
          return nameMatch || kanaMatch || phoneMatch;
        });

        if (filtered.length === 0) {
          customerTbody.innerHTML = '<tr><td colspan="3" style="text-align: center; padding: 1rem; color: #777;">見つかりませんでした</td></tr>';
          return;
        }

        filtered.forEach(c => {
          const tr = document.createElement('tr');
          tr.style.cursor = 'pointer';
          tr.addEventListener('click', () => {
            showCustomerFormView(c);
          });
          
          const phone = String(c.phone||"") || "-";
          tr.innerHTML = '<td style="padding: 0.75rem; border-bottom: 1px solid var(--color-border); font-weight: bold; color: var(--color-primary);">' + c.name + '</td>' +
'<td style="padding: 0.75rem; border-bottom: 1px solid var(--color-border);">' + phone + '</td>' +
'<td style="padding: 0.75rem; border-bottom: 1px solid var(--color-border); text-align: right; color: var(--color-text-sub);">編集 &gt;</td>';
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
          id: document.getElementById('edit-customer-id').value,
          name: document.getElementById('edit-name').value,
          kana: document.getElementById('edit-kana').value,
          phone: document.getElementById('edit-phone').value,
          address: document.getElementById('edit-address').value,
          occupation: document.getElementById('edit-occupation').value,
          email: document.getElementById('edit-email').value,
          memo: document.getElementById('edit-memo').value
        };

        fetch(GAS_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'text/plain;charset=utf-8' },
          body: JSON.stringify({ action: 'saveCustomer', payload: payload })
        })
        .then(res => res.json())
        .then(result => {
          if(result.success) {
            fetchCustomers();
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
  }


