let returnToDetailsModal = false;
const GAS_URL = 'https://script.google.com/macros/s/AKfycbwcQIx5rmTuZ60bihVUvvGLdnaco5XgT60qN-mQO6QDAZIXdgIVZ-d5mkjODq-QTlzb/exec';

document.addEventListener('DOMContentLoaded', () => {

  let menus = [];
  let staffs = [];
  let mockBookings = [];
  
  let currentTimelineDate = '';
  let currentDate = new Date();
  
  let isBlockMode = false;
  let selectedBlockSlots = [];
  
  let selectedMenuDuration = 0;
  let selectedMenuName = '';
  let proxySelection = null;
  let currentDetailId = null;

  const timelineContainer = document.getElementById('timeline');
  const dateDisplay = document.getElementById('date-display');
  const dateInput = document.getElementById('current-date');

  const updateDateDisplay = () => {
    const y = currentDate.getFullYear();
    const m = String(currentDate.getMonth() + 1).padStart(2, '0');
    const d = String(currentDate.getDate()).padStart(2, '0');
    const days = ['日', '月', '火', '水', '木', '金', '土'];
    const day = days[currentDate.getDay()];
    
    currentTimelineDate = y + '-' + m + '-' + d;
    if(dateDisplay) dateDisplay.innerText = y + '/' + m + '/' + d + ' (' + day + ')';
    if(dateInput) dateInput.value = currentTimelineDate;
    
    if (typeof renderTimeline !== 'undefined') renderTimeline(currentTimelineDate);
  };

  if(document.getElementById('prev-day')) {
      document.getElementById('prev-day').addEventListener('click', () => {
        currentDate.setDate(currentDate.getDate() - 1);
        updateDateDisplay();
      });
  }

  if(document.getElementById('next-day')) {
      document.getElementById('next-day').addEventListener('click', () => {
        currentDate.setDate(currentDate.getDate() + 1);
        updateDateDisplay();
      });
  }

  if(dateInput) {
      dateInput.addEventListener('change', (e) => {
        if(e.target.value) {
            currentDate = new Date(e.target.value);
            updateDateDisplay();
        }
      });
  }

  const menuButtonsContainer = document.getElementById('menu-buttons');
  const renderMenuButtons = () => {
    if(!menuButtonsContainer) return;
    menuButtonsContainer.innerHTML = '';
    menuButtonsContainer.style.display = 'none';
    menuButtonsContainer.style.flexDirection = 'column';
    menuButtonsContainer.style.gap = '0.5rem';
    menuButtonsContainer.style.overflowX = 'hidden';
    
    menus.forEach(menu => {
      const btn = document.createElement('button');
      btn.className = 'btn btn-outline menu-btn btn-full';
      btn.dataset.duration = menu.duration;
      btn.dataset.type = 'booked';
      btn.dataset.name = menu.name;
      btn.innerText = menu.name + ' (' + menu.duration + '分)';
      
      btn.addEventListener('click', () => {
        if (isBlockMode) {
            exitBlockMode();
        }
        
        const allBtns = menuButtonsContainer.querySelectorAll('.menu-btn');
        allBtns.forEach(b => b.classList.remove('btn-primary'));
        allBtns.forEach(b => b.classList.add('btn-outline'));
        
        btn.classList.add('btn-primary');
        btn.classList.remove('btn-outline');
        
        selectedMenuDuration = parseInt(menu.duration);
        selectedMenuName = menu.name;
        
        document.getElementById('menu-dropdown-text').innerText = menu.name + ' (' + menu.duration + '分)';
        menuButtonsContainer.style.display = 'none';
      });
      menuButtonsContainer.appendChild(btn);
    });
  };

  const menuDropdownToggle = document.getElementById('menu-dropdown-toggle');
  if (menuDropdownToggle && menuButtonsContainer) {
      menuDropdownToggle.addEventListener('click', () => {
          if (menuButtonsContainer.style.display === 'none') {
              menuButtonsContainer.style.display = 'flex';
          } else {
              menuButtonsContainer.style.display = 'none';
          }
      });
  }

  const fetchAdminData = () => {
    fetch(GAS_URL + '?action=getInitialData')
      .then(res => res.json())
      .then(result => {
        if(result.success) {
          menus = result.data.menus.map(m => { const v = Object.values(m); return { id: v[0], name: v[1], duration: parseInt(v[2]), price: v[3] }; });
          staffs = result.data.staffs.map(s => { const v = Object.values(s); return { id: v[0], name: v[1] }; });
          
          mockBookings = result.data.bookings.map(b => { 
            const v = Object.values(b); 
                        let dateStr = String(v[1]);
            if (dateStr.includes('T')) {
                const dt = new Date(dateStr);
                const y = dt.getFullYear();
                const m = String(dt.getMonth() + 1).padStart(2, '0');
                const d = String(dt.getDate()).padStart(2, '0');
                dateStr = y + '-' + m + '-' + d;
            } else {
                dateStr = dateStr.substring(0,10).replace(/\//g, '-');
            }
            let st = String(v[2]);
            if (st.includes('T')) {
                const dt = new Date(st);
                const h = (dt.getUTCHours() + 9) % 24;
                const m = dt.getUTCMinutes();
                st = String(h).padStart(2,'0') + ':' + String(m).padStart(2,'0');
            } else if (st.match(/\d{2}:\d{2}/)) {
                st = st.match(/\d{2}:\d{2}/)[0];
            } else {
                st = st.padStart(5, '0').substring(0,5);
            }
            return { 
              id: v[0], date: dateStr, 
              startTime: st, duration: parseInt(v[3]), staff: v[4], type: v[9], name: v[5], phone: v[6], menu: v[8], memo: v[11] || '' 
            }; 
          });
          
          renderCustomerMgmtList();
          renderMenuButtons();
          updateDateDisplay();
        } else {
          alert('エラー: ' + result.error);
        }
      })
      .catch(err => alert('通信エラー: ' + err.message));
  };

  function timeToMinutes(timeStr) {
    if(!timeStr) return 0;
    const parts = timeStr.split(':');
    if(parts.length < 2) return 0;
    return parseInt(parts[0]) * 60 + parseInt(parts[1]);
  }

  const renderTimeline = (dateStr) => {
    const timeline = document.getElementById('timeline');
    if (!timeline) return;
    
    let html = '<table class="timeline-table" style="width:100%; border-collapse:collapse; text-align:center;">';
    html += '<thead style="position:sticky; top:0; background:var(--color-surface); z-index:10; box-shadow:0 1px 2px rgba(0,0,0,0.05);">';
    html += '<tr><th style="padding:0.5rem; border:1px solid var(--color-border); width:60px;">時間</th>';
    staffs.forEach(s => { html += '<th style="padding:0.5rem; border:1px solid var(--color-border);">' + s.name + '</th>'; });
    html += '</tr></thead><tbody>';
    
    for (let h = 9; h <= 20; h++) {
      for (let m = 0; m < 60; m += 30) {
        const timeStr = String(h).padStart(2,'0') + ':' + String(m).padStart(2,'0');
        html += '<tr><td style="padding:0.5rem; border:1px solid var(--color-border); font-size:0.85rem; color:var(--color-text-sub);">' + timeStr + '</td>';
        
        staffs.forEach(s => {
          const slotKey = s.id + '-' + timeStr;
          const isSelected = selectedBlockSlots.includes(slotKey);
          
          const currentMins = h * 60 + m;
          const booking = mockBookings.find(b => b.date === dateStr && String(b.staff) === String(s.id) && timeToMinutes(b.startTime) === currentMins);
          
          if (booking) {
            const rowSpan = Math.ceil(booking.duration / 30);
            const isBlock = booking.type === '休み' || booking.type === 'x' || booking.name === '休み' || booking.name === 'x';
            const bgCls = isBlock ? 'background-color:#E2E3E5; color:#383D41;' : 'background-color:#D4EDDA; color:#155724; cursor:pointer;';
            html += '<td rowspan="' + rowSpan + '" class="timeline-booking" data-id="' + booking.id + '" style="border:1px solid var(--color-border); padding:0.25rem; vertical-align:top; ' + bgCls + '">';
            html += '<div style="font-size:0.8rem; font-weight:bold; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">' + booking.name + '</div>';
            html += '<div style="font-size:0.75rem; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">' + booking.menu + '</div>';
            html += '</td>';
          } else {
            const isCovered = mockBookings.some(b => b.date === dateStr && String(b.staff) === String(s.id) && timeToMinutes(b.startTime) < currentMins && timeToMinutes(b.startTime) + b.duration > currentMins);
            if (!isCovered) {
              const bg = isSelected ? 'background-color:#ffeeba;' : '';
              html += '<td class="timeline-slot" data-key="' + slotKey + '" style="border:1px solid var(--color-border); cursor:pointer; ' + bg + '"></td>';
            }
          }
        });
        html += '</tr>';
      }
    }
    html += '</tbody></table>';
    timeline.innerHTML = html;

    timeline.querySelectorAll('.timeline-slot').forEach(td => {
      td.addEventListener('click', () => {
        if (isBlockMode) {
          const key = td.dataset.key;
          if (selectedBlockSlots.includes(key)) {
            selectedBlockSlots = selectedBlockSlots.filter(k => k !== key);
          } else {
            selectedBlockSlots.push(key);
          }
          renderTimeline(dateStr);
        } else if (selectedMenuDuration > 0) {
          const key = td.dataset.key;
          const timeStr = key.slice(-5);
          const staffId = key.slice(0, -6);
          const staff = staffs.find(s => String(s.id) === staffId);
          document.getElementById('modal-datetime').innerText = dateStr.replace(/-/g, '/') + ' ' + timeStr + ' 〜';
          document.getElementById('modal-menu').innerText = selectedMenuName + ' (' + selectedMenuDuration + '分)';
          document.getElementById('modal-staff').innerText = '担当: ' + (staff ? staff.name : '');
          currentDetailId = null;
          
          const form = document.getElementById('proxy-booking-form');
          if(form) form.reset();
          
          proxySelection = { date: dateStr, startTime: timeStr, duration: selectedMenuDuration, staff: staffId, menu: selectedMenuName };
          document.getElementById('booking-modal').classList.remove('d-none');
        } else {
          alert('左のタブから「電話予約」のメニューを選ぶか、「枠ブロック」を開始してください。');
        }
      });
    });

    timeline.querySelectorAll('.timeline-booking').forEach(td => {
      td.addEventListener('click', () => {
        const id = td.dataset.id;
        const booking = mockBookings.find(b => String(b.id) === String(id));
        if (booking && booking.type !== '休み' && booking.type !== 'x' && booking.name !== '休み' && booking.name !== 'x') {
          const dDt = document.getElementById('detail-datetime');
          if(dDt) dDt.innerText = booking.date.replace(/-/g, '/') + ' ' + booking.startTime;
          
          const dMenu = document.getElementById('detail-menu');
          if(dMenu) dMenu.innerText = booking.menu;
          
          const dStaff = document.getElementById('detail-staff');
          if(dStaff) dStaff.innerText = '担当: ' + (staffs.find(s => String(s.id) === String(booking.staff))?.name || '');
          
          const dName = document.getElementById('detail-name');
          if(dName) {
            dName.innerText = booking.name;
            dName.onclick = () => {
              document.getElementById('details-modal').classList.add('d-none');
              document.getElementById('customer-mgmt-modal').classList.remove('d-none');
              returnToDetailsModal = true;
              showCustomerFormView({ name: booking.name, phone: booking.phone });
            };
          }
          
          const dPhone = document.getElementById('detail-phone');
          if(dPhone) dPhone.innerText = booking.phone || '未登録';
          
          const dMemo = document.getElementById('detail-memo');
          if(dMemo) dMemo.innerText = booking.memo || 'なし';
          
          currentDetailId = booking.id;
          document.getElementById('details-modal').classList.remove('d-none');
        }
      });
    });
  };

  const btnBlockMode = document.getElementById('btn-block-mode');
  const btnBlockConfirm = document.getElementById('btn-block-confirm');
  const btnBlockCancel = document.getElementById('btn-block-cancel');

  const exitBlockMode = () => {
      isBlockMode = false;
      selectedBlockSlots = [];
      if(btnBlockMode) btnBlockMode.classList.remove('d-none');
      if(btnBlockConfirm) btnBlockConfirm.classList.add('d-none');
      if(btnBlockCancel) btnBlockCancel.classList.add('d-none');
      if(timelineContainer) timelineContainer.classList.remove('block-mode-active');
  };

  if(btnBlockMode) {
    btnBlockMode.addEventListener('click', () => {
      isBlockMode = true;
      selectedBlockSlots = [];
      btnBlockMode.classList.add('d-none');
      if(btnBlockConfirm) btnBlockConfirm.classList.remove('d-none');
      if(btnBlockCancel) btnBlockCancel.classList.remove('d-none');
      if(timelineContainer) timelineContainer.classList.add('block-mode-active');
    });
  }

  if(btnBlockCancel) {
    btnBlockCancel.addEventListener('click', () => {
      exitBlockMode();
      renderTimeline(currentTimelineDate);
    });
  }

  if(btnBlockConfirm) {
    btnBlockConfirm.addEventListener('click', () => {
      if (selectedBlockSlots.length === 0) {
        alert("枠を選択してください");
        return;
      }
      
      btnBlockConfirm.innerText = '保存中...';
      btnBlockConfirm.disabled = true;

      const firstSlot = selectedBlockSlots[0];
      const timeStr = firstSlot.slice(-5);
      const staffId = firstSlot.slice(0, -6);
      
      const payload = {
        date: currentTimelineDate,
        startTime: timeStr,
        duration: selectedBlockSlots.length * 30,
        staff: staffId,
        name: '休み',
        phone: '',
        email: '',
        memo: '',
        menu: '休み設定',
        type: '休み'
      };

      fetch(GAS_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({ action: 'createBooking', payload })
      })
      .then(res => res.json())
      .then(result => {
        if(result.success) {
          mockBookings.push({
            id: result.bookingId || ('MOCK-' + Date.now()),
            ...payload
          });
          exitBlockMode();
          renderTimeline(currentTimelineDate);
        } else {
          alert('エラー: ' + result.error);
        }
      })
      .catch(err => alert('通信エラー: ' + err.message))
      .finally(() => {
        btnBlockConfirm.innerText = '確定';
        btnBlockConfirm.disabled = false;
      });
    });
  }

  const proxyForm = document.getElementById('proxy-booking-form');
  if(proxyForm) {
    proxyForm.addEventListener('submit', (e) => {
      e.preventDefault();
      if(!proxySelection) return;
      const btn = proxyForm.querySelector('button[type="submit"]');
      if(btn) { btn.innerText = '送信中...'; btn.disabled = true; }
      
      const payload = {
        date: proxySelection.date,
        startTime: proxySelection.startTime,
        duration: proxySelection.duration,
        staff: proxySelection.staff,
        name: document.getElementById('proxy-name').value,
        phone: document.getElementById('proxy-phone').value,
        email: '',
        memo: '',
        menu: proxySelection.menu,
        type: '電話予約'
      };

      fetch(GAS_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({ action: 'createBooking', payload })
      })
      .then(res => res.json())
      .then(result => {
        if(result.success) {
          mockBookings.push({
            id: result.bookingId || ('MOCK-' + Date.now()),
            ...payload
          });
          document.getElementById('booking-modal').classList.add('d-none');
          renderTimeline(currentTimelineDate);
        } else {
          alert('エラー: ' + result.error);
        }
      })
      .catch(err => alert('通信エラー: ' + err.message))
      .finally(() => {
        if(btn) { btn.innerText = '予約確定'; btn.disabled = false; }
      });
    });
  }

  const btnCancelBooking = document.getElementById('btn-cancel-booking');
  if(btnCancelBooking) {
    btnCancelBooking.addEventListener('click', () => {
      if(!confirm("本当にこの予約をキャンセル(削除)しますか？")) return;
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
          mockBookings = mockBookings.filter(b => String(b.id) !== String(currentDetailId));
          document.getElementById('details-modal').classList.add('d-none');
          renderTimeline(currentTimelineDate);
        } else {
          alert('エラー: ' + result.error);
        }
      })
      .catch(err => alert('通信エラー: ' + err.message))
      .finally(() => {
        btnCancelBooking.innerText = '予約キャンセル(削除)';
        btnCancelBooking.disabled = false;
      });
    });
  }

  const closeBtns = ['btn-close-modal', 'btn-close-details', 'btn-close-customer'];
  closeBtns.forEach(id => {
    const btn = document.getElementById(id);
    if(btn) btn.addEventListener('click', () => {
      const modal = btn.closest('div[id$="-modal"]');
      if(modal) modal.classList.add('d-none');
    });
  });

  const tabToggles = document.querySelectorAll('.tab-toggle');
  const tabContents = document.querySelectorAll('.tab-content');
  tabToggles.forEach(btn => {
    btn.addEventListener('click', () => {
      const isActive = btn.classList.contains('btn-primary');
      
      if (isBlockMode) {
        exitBlockMode();
        renderTimeline(currentTimelineDate);
      }
      
      if (isActive) {
        btn.classList.remove('btn-primary');
        btn.classList.add('btn-outline');
        if (btn.id === "btn-tab-customer") {
          const customerModal = document.getElementById("customer-mgmt-modal");
          if (customerModal) customerModal.classList.add("d-none");
        } else {
          const targetId = btn.id.replace("btn-tab-", "tab-content-");
          const targetContent = document.getElementById(targetId);
          if (targetContent) targetContent.style.display = "none";
          
          if (btn.id === 'btn-tab-booking') {
            selectedMenuDuration = 0;
            selectedMenuName = '';
            document.querySelectorAll('.menu-btn').forEach(b => b.classList.add('btn-outline'));
            document.getElementById('menu-dropdown-text').innerText = 'メニュー選択';
          }
        }
        return;
      }

      tabToggles.forEach(b => {
        b.classList.remove('btn-primary');
        b.classList.add('btn-outline');
      });
      tabContents.forEach(c => c.style.display = 'none');
      
      btn.classList.add('btn-primary');
      btn.classList.remove('btn-outline');
      
      if (btn.id === "btn-tab-customer") {
        const customerModal = document.getElementById("customer-mgmt-modal");
        if (customerModal) {
            returnToDetailsModal = false;
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
    if(customerFormView) customerFormView.classList.add('d-none');
    if(customerListView) customerListView.classList.remove('d-none');
    renderCustomerMgmtList();
  };

  const showCustomerFormView = (customer = null) => {
    if(customerListView) customerListView.classList.add('d-none');
    if(customerFormView) customerFormView.classList.remove('d-none');
    if (customer) {
      if(customerFormTitle) customerFormTitle.innerText = '顧客の編集';
      if(document.getElementById('customer-id')) document.getElementById('customer-id').value = customer.phone;
      if(document.getElementById('customer-name')) document.getElementById('customer-name').value = customer.name;
      if(document.getElementById('customer-phone')) document.getElementById('customer-phone').value = customer.phone;
      if(document.getElementById('customer-email')) document.getElementById('customer-email').value = customer.email || '';
      if(document.getElementById('customer-memo')) document.getElementById('customer-memo').value = customer.memo || '';
    } else {
      if(customerFormTitle) customerFormTitle.innerText = '新規顧客登録';
      if(customerEditForm) customerEditForm.reset();
      if(document.getElementById('customer-id')) document.getElementById('customer-id').value = '';
    }
  };

  const renderCustomerMgmtList = () => {
    if (!customerTbody) return;
    
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
    
    const query = (customerSearchInput && customerSearchInput.value) ? customerSearchInput.value.toLowerCase().trim() : '';
    const filtered = customers.filter(c => 
      (c.name || '').toLowerCase().includes(query) || 
      (c.phone || '').includes(query)
    );

    customerTbody.innerHTML = '';
    if (filtered.length === 0) {
      customerTbody.innerHTML = '<tr><td colspan="4" style="text-align: center; padding: 1rem; color: #777;">該当顧客が見つかりません</td></tr>';
      return;
    }

    filtered.forEach(c => {
      const tr = document.createElement('tr');
      tr.innerHTML = '<td>' + c.name + '</td><td>' + c.phone + '</td><td>' + c.lastVisit + '</td><td><button class="btn btn-sm btn-outline edit-btn">編集</button></td>';
      
      const editBtn = tr.querySelector('.edit-btn');
      editBtn.addEventListener('click', () => {
        showCustomerFormView(c);
      });
      customerTbody.appendChild(tr);
    });
  };

  if (btnCloseMgmt) btnCloseMgmt.addEventListener('click', () => {
    customerMgmtModal.classList.add('d-none');
    if (returnToDetailsModal) {
      document.getElementById('details-modal').classList.remove('d-none');
      returnToDetailsModal = false;
    }
  });

  if (btnNewCustomer) btnNewCustomer.addEventListener('click', () => {
    showCustomerFormView();
  });

  if (btnCancelEdit) btnCancelEdit.addEventListener('click', () => {
    if (returnToDetailsModal) {
      document.getElementById('customer-mgmt-modal').classList.add('d-none');
      document.getElementById('details-modal').classList.remove('d-none');
      returnToDetailsModal = false;
    } else {
      showCustomerListView();
    }
  });

  if (customerSearchInput) customerSearchInput.addEventListener('input', renderCustomerMgmtList);

  // START
  fetchAdminData();
});







