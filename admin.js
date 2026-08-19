// admin.js
const GAS_URL = 'https://script.google.com/macros/s/AKfycbx-b6WOncIt4M8nPkncMZfLDYc1MoV55tOvtL-cCT3ARdTSsZcMFUyk4d_J9Ur51cWi/exec';

document.addEventListener('DOMContentLoaded', () => {
  const tabs = document.querySelectorAll('.tab');
  const tabContents = document.querySelectorAll('.tab-content');

  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      tabs.forEach(t => t.classList.remove('active'));
      tabContents.forEach(c => c.classList.remove('active'));
      
      tab.classList.add('active');
      document.getElementById(tab.dataset.tab).classList.add('active');
    });
  });

  // Calendar State
  let currentMonth = new Date().getMonth();
  let currentYear = new Date().getFullYear();
  let menus = [];
  let staffs = [];
  let mockBookings = [];

  const fetchAdminData = () => {
    
    fetch(`${GAS_URL}?action=getInitialData`)
      .then(res => res.json())
      .then(result => {
        if(result.success) {
          menus = result.data.menus.map(m => ({
            id: m['メニューID'], name: m['メニュー名'], duration: parseInt(m['所要時間（分）']), price: m['金額']
          }));
          staffs = result.data.staffs.map(s => ({
            id: s['スタッフID'], name: s['スタッフ名']
          }));
          mockBookings = result.data.bookings.map(b => ({
            id: b['予約ID'],
            date: String(b['予約日']).substring(0, 10),
            startTime: String(b['開始時間']).padStart(5, '0').substring(0, 5),
            duration: parseInt(b['所要時間（分）']),
            staff: b['担当スタッフ'],
            type: b['予約状況'],
            name: b['お客様名'],
            phone: b['電話番号'],
            menu: b['メニュー名'],
            memo: b['メモ']
          }));
          
          
          renderCalendar();
          renderCustomerList();
          renderSettings();
        } else {
          alert('データの取得に失敗しました: ' + result.error);
        }
      })
      .catch(err => {
        alert('通信エラー: ' + err.message);
        
      });
  };

  fetchAdminData();

  // Schedule View (Calendar & timeline)
  const renderCalendar = () => {
    const calendarGrid = document.querySelector('.calendar-grid');
    const oldDays = calendarGrid.querySelectorAll('.calendar-day, .calendar-empty');
    oldDays.forEach(day => day.remove());

    const firstDay = new Date(currentYear, currentMonth, 1).getDay();
    const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
    
    document.getElementById('admin-month-year').innerText = `${currentYear}年 ${currentMonth + 1}月`;

    for (let i = 0; i < firstDay; i++) {
      const empty = document.createElement('div');
      empty.className = 'calendar-empty';
      calendarGrid.appendChild(empty);
    }

    const today = new Date();
    today.setHours(0,0,0,0);
    
    for (let i = 1; i <= daysInMonth; i++) {
      const dayEl = document.createElement('div');
      dayEl.className = 'calendar-day';
      dayEl.innerText = i;
      
      const thisDate = new Date(currentYear, currentMonth, i);
      const dateStr = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(i).padStart(2, '0')}`;
      
      const dayBookings = mockBookings.filter(b => b.date === dateStr);
      if (dayBookings.length > 0) {
        const badge = document.createElement('div');
        badge.className = 'booking-badge';
        badge.innerText = dayBookings.length;
        dayEl.appendChild(badge);
      }
      
      dayEl.addEventListener('click', () => {
        document.querySelectorAll('.calendar-day').forEach(d => d.classList.remove('selected'));
        dayEl.classList.add('selected');
        renderTimeline(dateStr);
      });
      
      calendarGrid.appendChild(dayEl);
    }
  };

  document.getElementById('btn-admin-prev').addEventListener('click', () => {
    currentMonth--;
    if (currentMonth < 0) { currentMonth = 11; currentYear--; }
    renderCalendar();
  });
  document.getElementById('btn-admin-next').addEventListener('click', () => {
    currentMonth++;
    if (currentMonth > 11) { currentMonth = 0; currentYear++; }
    renderCalendar();
  });

  const timelineContainer = document.getElementById('timeline-container');
  const modal = document.getElementById('booking-modal');
  const btnCloseModal = document.getElementById('btn-close-modal');

  function timeToMinutes(timeStr) {
    if(!timeStr || typeof timeStr !== 'string') return 0;
    const [h, m] = timeStr.split(':').map(Number);
    return h * 60 + m;
  }

  // --- UI Elements for Edit/Block ---
  const bookingDetailView = document.getElementById('booking-detail-view');
  const bookingEditView = document.getElementById('booking-edit-view');
  const blockSettingsView = document.getElementById('block-settings-view');
  
  const btnEditBooking = document.getElementById('btn-edit-booking');
  const btnCancelBooking = document.getElementById('btn-cancel-booking'); // キャンセルボタン
  const btnSaveBooking = document.getElementById('btn-save-booking');
  const btnCancelEdit = document.getElementById('btn-cancel-edit');
  
  const blockMenuSelect = document.getElementById('block-menu-select');
  const blockDurationInput = document.getElementById('block-duration');
  const btnSaveBlock = document.getElementById('btn-save-block');
  const btnCancelBlock = document.getElementById('btn-cancel-block');

  let selectedMenuDuration = 0;
  let selectedMenuName = '';
  let selectedMenuType = 'booked';
  let currentDetailId = null;
  let isBlockMode = false;
  let selectedBlockSlots = []; // ["staffA-09:00", ...]
  let currentTimelineDate = '';

  const renderTimeline = (dateStr) => {
    currentTimelineDate = dateStr;
    timelineContainer.innerHTML = '';
    const dayBookings = mockBookings.filter(b => b.date === dateStr);
    
    // Check if it's weekend
    const dObj = new Date(dateStr);
    const isWeekend = dObj.getDay() === 0 || dObj.getDay() === 6;
    let startHour = 9;
    let startMin = isWeekend ? 0 : 30;
    
    const startMins = startHour * 60 + startMin;
    const endMins = 19 * 60; // Up to 19:00 boundary
    const slotMins = 30;

    const table = document.createElement('table');
    table.className = 'timeline-table';
    
    const thead = document.createElement('thead');
    let headRow = '<tr><th>時間</th>';
    staffs.forEach(s => {
      headRow += `<th>${s.name}</th>`;
    });
    headRow += '</tr>';
    thead.innerHTML = headRow;
    table.appendChild(thead);

    const tbody = document.createElement('tbody');
    
    for(let m = startMins; m < endMins; m += slotMins) {
      const h = Math.floor(m / 60);
      const min = m % 60;
      const timeString = `${String(h).padStart(2, '0')}:${String(min).padStart(2, '0')}`;
      
      const tr = document.createElement('tr');
      tr.innerHTML = `<td>${timeString}</td>`;
      
      staffs.forEach(staff => {
        const td = document.createElement('td');
        const slotKey = `${staff.id}-${timeString}`;
        
        // Find if this slot is covered by any booking for this staff
        const booking = dayBookings.find(b => {
          if (b.staff !== staff.id) return false;
          const bStart = timeToMinutes(b.startTime);
          const bEnd = bStart + b.duration;
          return m >= bStart && m < bEnd;
        });

        if (booking) {
          td.classList.add('booked');
          if (booking.type === 'blocked') {
            td.classList.add('blocked');
          }
          if (m === timeToMinutes(booking.startTime)) {
            td.innerHTML = `<div class="booking-item">${booking.name || '休み設定'}<br><small>${booking.menu || ''}</small></div>`;
            td.addEventListener('click', () => openBookingModal(booking));
          } else {
            // Continuation of booking
            td.classList.add('booking-continued');
          }
        } else {
          // Free slot
          td.dataset.slot = slotKey;
          td.addEventListener('click', () => handleEmptySlotClick(td, slotKey));
        }
        
        tr.appendChild(td);
      });
      
      tbody.appendChild(tr);
    }
    
    table.appendChild(tbody);
    timelineContainer.appendChild(table);
  };

  const handleEmptySlotClick = (td, slotKey) => {
    if (!isBlockMode) return;
    
    if (selectedBlockSlots.includes(slotKey)) {
      selectedBlockSlots = selectedBlockSlots.filter(k => k !== slotKey);
      td.classList.remove('selected-for-block');
    } else {
      selectedBlockSlots.push(slotKey);
      td.classList.add('selected-for-block');
    }
  };

  const openBookingModal = (booking) => {
    currentDetailId = booking.id;
    bookingDetailView.style.display = 'block';
    bookingEditView.style.display = 'none';
    blockSettingsView.style.display = 'none';

        document.getElementById('detail-name').innerText = booking.name || '-';
    const detailNameBtn = document.getElementById('detail-name');
    if (detailNameBtn && booking.name && booking.name !== '休み') {
      detailNameBtn.style.cursor = 'pointer';
      detailNameBtn.style.color = 'var(--color-primary)';
      detailNameBtn.style.textDecoration = 'underline';
      detailNameBtn.onclick = () => {
        const searchVal = (booking.name || "").replace(/[\s　]/g, '');
        const phoneVal = String(booking.phone || "").replace(/-/g, '');
        const customerMap = {};
        mockBookings.forEach(bk => {
          if(bk.name && bk.name !== '休み') {
            if(!customerMap[bk.phone]) customerMap[bk.phone] = { name: bk.name, phone: bk.phone, count: 1, lastVisit: bk.date };
            else { customerMap[bk.phone].count++; if(bk.date > customerMap[bk.phone].lastVisit) customerMap[bk.phone].lastVisit = bk.date; }
          }
        });
        const customers = Object.values(customerMap);
        const matchedCustomer = customers.find(c => {
           const nMatch = searchVal && (c.name || "").replace(/[\s　]/g, '') === searchVal;
           const pMatch = phoneVal && String(c.phone||"").replace(/-/g, '') === phoneVal;
           return nMatch || pMatch;
        });
        const dModal = document.getElementById('details-modal');
        if (dModal) dModal.classList.add('d-none');
        const customerModal = document.getElementById('customer-mgmt-modal');
        if (customerModal) customerModal.classList.remove('d-none');
        if (matchedCustomer && typeof showCustomerFormView === 'function') {
            showCustomerFormView(matchedCustomer);
        } else {
            const searchInput = document.getElementById('customer-search-input');
            if(searchInput) searchInput.value = booking.name || "";
            if(typeof showCustomerListView === 'function') showCustomerListView();
        }
      };
    } else if (detailNameBtn) {
      detailNameBtn.style.cursor = 'default';
      detailNameBtn.style.color = 'inherit';
      detailNameBtn.style.textDecoration = 'none';
      detailNameBtn.onclick = null;
    }
    document.getElementById('detail-phone').innerText = booking.phone || '-';
    document.getElementById('detail-datetime').innerText = `${booking.date} ${booking.startTime}〜`;
    document.getElementById('detail-menu').innerText = booking.menu || '-';
    document.getElementById('detail-staff').innerText = staffs.find(s=>s.id===booking.staff)?.name || booking.staff;
    document.getElementById('detail-memo').innerText = booking.memo || '-';

    // 休み設定の場合はキャンセル（削除）のみ可能にするなど
    if (booking.type === 'blocked') {
      btnEditBooking.style.display = 'none';
    } else {
      btnEditBooking.style.display = 'inline-block';
    }

    modal.classList.add('active');
  };

  btnCloseModal.addEventListener('click', () => {
    modal.classList.remove('active');
  });

  // Edit Mode
  btnEditBooking.addEventListener('click', () => {
    const booking = mockBookings.find(b => b.id === currentDetailId);
    if(!booking) return;

    bookingDetailView.style.display = 'none';
    bookingEditView.style.display = 'block';

    document.getElementById('edit-name').value = booking.name;
    document.getElementById('edit-phone').value = booking.phone;
    document.getElementById('edit-date').value = booking.date.replace(/\//g, '-');
    document.getElementById('edit-time').value = booking.startTime;
    document.getElementById('edit-menu').value = booking.menu;
    document.getElementById('edit-staff').value = booking.staff;
    document.getElementById('edit-memo').value = booking.memo;
  });

  btnCancelEdit.addEventListener('click', () => {
    bookingDetailView.style.display = 'block';
    bookingEditView.style.display = 'none';
  });

  // Save Edit (Status Update Only API implemented, but let's simulate full save locally or call status update)
  btnSaveBooking.addEventListener('click', () => {
    const booking = mockBookings.find(b => b.id === currentDetailId);
    if(!booking) return;

    btnSaveBooking.innerText = '保存中...';
    btnSaveBooking.disabled = true;

    // 今回はローカルのmockデータを更新するだけ（本来はGASへupdateリクエスト）
    setTimeout(() => {
      booking.name = document.getElementById('edit-name').value;
      booking.phone = document.getElementById('edit-phone').value;
      booking.date = document.getElementById('edit-date').value.replace(/-/g, '/');
      booking.startTime = document.getElementById('edit-time').value;
      booking.menu = document.getElementById('edit-menu').value;
      booking.staff = document.getElementById('edit-staff').value;
      booking.memo = document.getElementById('edit-memo').value;

      btnSaveBooking.innerText = '保存する';
      btnSaveBooking.disabled = false;
      modal.classList.remove('active');
      renderTimeline(currentTimelineDate);
      alert('予約情報を更新しました（デモ）');
    }, 500);
  });

  // Cancel Booking (Delete or Status change)
  btnCancelBooking.addEventListener('click', () => {
    if(!confirm("この予約をキャンセル（削除）しますか？")) return;
    
    btnCancelBooking.innerText = '処理中...';
    btnCancelBooking.disabled = true;

    fetch(GAS_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({ action: 'updateBookingStatus', id: currentDetailId, status: 'キャンセル' })
    })
    .then(res => res.json())
    .then(result => {
      if(result.success) {
        // ローカルから削除
        mockBookings = mockBookings.filter(b => b.id !== currentDetailId);
        renderTimeline(currentTimelineDate);
        modal.classList.remove('active');
        alert('予約をキャンセルしました');
      } else {
        alert('エラー: ' + result.error);
      }
    })
    .catch(err => alert('通信エラー: ' + err.message))
    .finally(() => {
      btnCancelBooking.innerText = '予約をキャンセル';
      btnCancelBooking.disabled = false;
    });
  });

  // --- Block Mode Toggle ---
  document.getElementById('btn-toggle-block').addEventListener('click', (e) => {
    isBlockMode = !isBlockMode;
    selectedBlockSlots = [];
    if (isBlockMode) {
      e.target.classList.add('btn-danger');
      e.target.innerText = '枠を押さえる（選択中...）';
      timelineContainer.classList.add('block-mode-active');
      document.getElementById('block-action-bar').style.display = 'block';
    } else {
      e.target.classList.remove('btn-danger');
      e.target.innerText = '枠を押さえる';
      timelineContainer.classList.remove('block-mode-active');
      document.getElementById('block-action-bar').style.display = 'none';
      renderTimeline(currentTimelineDate); // refresh to clear selections
    }
  });

  document.getElementById('btn-open-block-modal').addEventListener('click', () => {
    if (selectedBlockSlots.length === 0) {
      alert("枠が選択されていません");
      return;
    }
    
    // Populate menu select
    blockMenuSelect.innerHTML = `<option value="">-- メニューを選択 --</option>
      <option value="休み設定">休み（ブロック）</option>`;
    menus.forEach(m => {
      blockMenuSelect.innerHTML += `<option value="${m.name}" data-duration="${m.duration}">${m.name}</option>`;
    });

    bookingDetailView.style.display = 'none';
    bookingEditView.style.display = 'none';
    blockSettingsView.style.display = 'block';
    
    modal.classList.add('active');
  });

  blockMenuSelect.addEventListener('change', (e) => {
    if (e.target.value === '休み設定') {
      blockDurationInput.value = 30; // 最小単位
      selectedMenuDuration = 30;
      selectedMenuName = '休み';
      selectedMenuType = 'blocked';
    } else {
      const option = e.target.options[e.target.selectedIndex];
      selectedMenuDuration = parseInt(option.dataset.duration) || 0;
      blockDurationInput.value = selectedMenuDuration;
      selectedMenuName = e.target.value;
      selectedMenuType = 'booked';
    }
  });

  btnSaveBlock.addEventListener('click', () => {
    if (selectedBlockSlots.length === 0) return;
    
    btnSaveBlock.innerText = '保存中...';
    btnSaveBlock.disabled = true;

    // Prepare requests (Since GAS handles one by one or needs bulk API, we will just loop for demo, but better to use bulk)
    // Here we just mock it locally and send one request for the first slot to demonstrate.
    const firstSlot = selectedBlockSlots[0];
    const [staffId, time] = firstSlot.split('-');

    const payload = {
      date: currentTimelineDate,
      startTime: time,
      duration: parseInt(blockDurationInput.value),
      staff: staffId,
      name: document.getElementById('block-customer-name').value || '休み',
      phone: '',
      email: '',
      memo: document.getElementById('block-memo').value,
      menu: selectedMenuName,
      type: selectedMenuType
    };

    fetch(GAS_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({ action: 'createBooking', payload })
    })
    .then(res => res.json())
    .then(result => {
      if(result.success) {
        // Add to local mock data
        mockBookings.push({
          id: result.bookingId || ('MOCK-' + Date.now()),
          date: payload.date,
          startTime: payload.startTime,
          duration: payload.duration,
          staff: payload.staff,
          type: payload.type,
          name: payload.name,
          phone: payload.phone,
          menu: payload.menu,
          memo: payload.memo
        });
        
        modal.classList.remove('active');
        // Reset block mode
        document.getElementById('btn-toggle-block').click(); 
        renderTimeline(currentTimelineDate);
      } else {
        alert('エラー: ' + result.error);
      }
    })
    .catch(err => alert('通信エラー: ' + err.message))
    .finally(() => {
      btnSaveBlock.innerText = 'この内容で登録';
      btnSaveBlock.disabled = false;
    });

  });

  btnCancelBlock.addEventListener('click', () => {
    modal.classList.remove('active');
  });

  // --- Customer View ---
  const renderCustomerList = () => {
    // 顧客リストはbookingsから一意に抽出（実際はGASから顧客シートを取得するAPIを別途作る）
    const customerMap = {};
    mockBookings.forEach(b => {
      if(b.name && b.name !== '休み') {
        if(!customerMap[b.phone]) {
          customerMap[b.phone] = { name: b.name, phone: b.phone, count: 1, lastVisit: b.date };
        } else {
          customerMap[b.phone].count++;
          if (b.date > customerMap[b.phone].lastVisit) {
            customerMap[b.phone].lastVisit = b.date;
          }
        }
      }
    });

    const tbody = document.getElementById('customer-list-body');
    tbody.innerHTML = '';
    Object.values(customerMap).forEach(c => {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>${c.name}</td>
        <td>${c.phone}</td>
        <td>${c.count}回</td>
        <td>${c.lastVisit}</td>
        <td><button class="btn btn-sm">詳細</button></td>
      `;
      tbody.appendChild(tr);
    });
  };

  // --- Settings View ---
  const renderSettings = () => {
    document.getElementById('setting-menus').innerText = menus.map(m => m.name).join(', ');
    document.getElementById('setting-staffs').innerText = staffs.map(s => s.name).join(', ');
  };

  // --- Tab Toggle Logic ---
  const tabToggles = document.querySelectorAll('.tab-toggle');
  const tabContents = document.querySelectorAll('.tab-content');
  tabToggles.forEach(btn => {
    btn.addEventListener('click', () => {
      const isActive = btn.classList.contains('btn-primary');
      
      if (typeof isBlockMode !== 'undefined' && isBlockMode) {
        exitBlockMode();
        if(typeof renderTimeline !== 'undefined') renderTimeline();
      }
      
      tabToggles.forEach(b => {
        b.classList.remove('btn-primary');
        b.classList.add('btn-outline');
      });
      tabContents.forEach(c => c.style.display = 'none');
      
      if (isActive && btn.id !== "btn-tab-customer") {
        return;
      }
      
      btn.classList.add('btn-primary');
      btn.classList.remove('btn-outline');
      
      if (btn.id === "btn-tab-customer") {
        const customerModal = document.getElementById("customer-mgmt-modal");
        if (customerModal) {
            customerModal.classList.remove("d-none");
            showCustomerListView();
        }
        btn.classList.remove("btn-primary");
        btn.classList.add("btn-outline");
      } else {
        const targetId = btn.id.replace("btn-tab-", "tab-content-");
        const targetContent = document.getElementById(targetId);
        if (targetContent) targetContent.style.display = "block";
      }
    });
  });
  // --- Customer Management Logic ---
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

  const showCustomerListView = () => {
    customerFormView.classList.add('d-none');
    customerListView.classList.remove('d-none');
    renderCustomerMgmtList();
  };

  const showCustomerFormView = (customer = null) => {
    customerListView.classList.add('d-none');
    customerFormView.classList.remove('d-none');
    if (customer) {
      customerFormTitle.innerText = '顧客情報の編集';
      document.getElementById('customer-id').value = customer.phone; // Using phone as ID for now
      document.getElementById('customer-name').value = customer.name;
      document.getElementById('customer-phone').value = customer.phone;
      document.getElementById('customer-email').value = customer.email || '';
      document.getElementById('customer-memo').value = customer.memo || '';
    } else {
      customerFormTitle.innerText = '新規顧客登録';
      customerEditForm.reset();
      document.getElementById('customer-id').value = '';
    }
  };

  const renderCustomerMgmtList = () => {
    if (!customerTbody) return;
    
    // Extract unique customers from bookings
    const customerMap = {};
    mockBookings.forEach(b => {
      if(b.name && b.name !== '休み') {
        if(!customerMap[b.phone]) {
          customerMap[b.phone] = { name: b.name, phone: b.phone, count: 1, lastVisit: b.date };
        } else {
          customerMap[b.phone].count++;
          if (b.date > customerMap[b.phone].lastVisit) {
            customerMap[b.phone].lastVisit = b.date;
          }
        }
      }
    });
    const customers = Object.values(customerMap);
    
    const query = (customerSearchInput.value || '').toLowerCase().trim();
    const filtered = customers.filter(c => 
      (c.name || '').toLowerCase().includes(query) || 
      (c.phone || '').includes(query)
    );

    customerTbody.innerHTML = '';
    if (filtered.length === 0) {
      customerTbody.innerHTML = '<tr><td colspan="4" style="text-align: center; padding: 1rem; color: #777;">該当する顧客が見つかりません</td></tr>';
      return;
    }

    filtered.forEach(c => {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>$ {c.name}</td>
        <td>$ {c.phone}</td>
        <td>$ {c.lastVisit}</td>
        <td><button class="btn btn-sm btn-outline edit-btn">編集</button></td>
      `;
      
      const editBtn = tr.querySelector('.edit-btn');
      editBtn.addEventListener('click', () => {
        showCustomerFormView(c);
      });
      customerTbody.appendChild(tr);
    });
  };

  if (btnCloseMgmt) btnCloseMgmt.addEventListener('click', () => {
    customerMgmtModal.classList.add('d-none');
  });

  if (btnNewCustomer) btnNewCustomer.addEventListener('click', () => {
    showCustomerFormView();
  });

  if (btnCancelEdit) btnCancelEdit.addEventListener('click', () => {
    showCustomerListView();
  });

  if (customerSearchInput) customerSearchInput.addEventListener('input', renderCustomerMgmtList);
});

