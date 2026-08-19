// admin.js
const GAS_URL = 'https://script.google.com/macros/s/AKfycbx-b6WOncIt4M8nPkncMZfLDYc1MoV55tOvtL-cCT3ARdTSsZcMFUyk4d_J9Ur51cWi/exec';

document.addEventListener('DOMContentLoaded', () => {
});

  let menus = [];
  let staffs = [];
  let mockBookings = [];

    const menuButtonsContainer = document.getElementById('menu-buttons');
  const renderMenuButtons = () => {
    if(!menuButtonsContainer) return;
    menuButtonsContainer.innerHTML = '';
    menuButtonsContainer.style.display = 'none';
    menuButtonsContainer.style.flexDirection = 'column';
    menuButtonsContainer.style.gap = '0.5rem';
    
    menus.forEach(menu => {
      const btn = document.createElement('button');
      btn.className = 'btn btn-outline menu-btn btn-full';
      btn.dataset.duration = menu.duration;
      btn.dataset.type = 'booked';
      btn.dataset.name = menu.name;
      btn.innerText = $ {menu.name} ($ {menu.duration}分);
      
      btn.addEventListener('click', () => {
        if (typeof isBlockMode !== 'undefined' && isBlockMode) {
            exitBlockMode();
        }
        
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
        
        renderTimeline(currentTimelineDate);
      });
      
      menuButtonsContainer.appendChild(btn);
    });
  };
  const fetchAdminData = () => {
    
    fetch(`${GAS_URL}?action=getInitialData`)
      .then(res => res.json())
      .then(result => {
        if(result.success) {
          menus = result.data.menus.map(m => { const v = Object.values(m); return { id: v[0], name: v[1], duration: parseInt(v[2]), price: v[3] }; });
            staffs = result.data.staffs.map(s => { const v = Object.values(s); return { id: v[0], name: v[1] }; });
                      mockBookings = result.data.bookings.map(b => { 
            const v = Object.values(b); 
            let st = String(v[2]);
            if (st.includes('T')) {
                const d = new Date(st);
                const h = (d.getUTCHours() + 9) % 24;
                const m = d.getUTCMinutes();
                st = String(h).padStart(2,'0') + ':' + String(m).padStart(2,'0');
            } else if (st.match(/\d{2}:\d{2}/)) {
                st = st.match(/\d{2}:\d{2}/)[0];
            } else {
                st = st.padStart(5, '0').substring(0,5);
            }
            return { 
              id: v[0], date: String(v[1]).substring(0,10).replace(/\//g, '-'), 
              startTime: st, duration: parseInt(v[3]), staff: v[4], type: v[9], name: v[5], phone: v[6], menu: v[8], memo: v[11] || '' 
            }; 
          });
          staffs = result.data.staffs.map(s => ({
            id: s['スタッフID'], name: s['スタッフ名']
          }));
                    mockBookings = result.data.bookings.map(b => { 
            const v = Object.values(b); 
            let st = String(v[2]);
            if (st.includes('T')) {
                const d = new Date(st);
                const h = (d.getUTCHours() + 9) % 24;
                const m = d.getUTCMinutes();
                st = String(h).padStart(2,'0') + ':' + String(m).padStart(2,'0');
            } else if (st.match(/\d{2}:\d{2}/)) {
                st = st.match(/\d{2}:\d{2}/)[0];
            } else {
                st = st.padStart(5, '0').substring(0,5);
            }
            return { 
              id: v[0], date: String(v[1]).substring(0,10).replace(/\//g, '-'), 
              startTime: st, duration: parseInt(v[3]), staff: v[4], type: v[9], name: v[5], phone: v[6], menu: v[8], memo: v[11] || '' 
            }; 
          });
  };
  fetchAdminData();
  // Schedule View (Calendar & timeline)
  document.getElementById('btn-admin-prev').addEventListener('click', () => {
    currentMonth--;
    if (currentMonth < 0) { currentMonth = 11; currentYear--; }

  });
  document.getElementById('btn-admin-next').addEventListener('click', () => {
    currentMonth++;
    if (currentMonth > 11) { currentMonth = 0; currentYear++; }

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
  const btnToggleBlock = 

    const btnBlockMode = document.getElementById('btn-block-mode');
  const btnBlockConfirm = document.getElementById('btn-block-confirm');
  const btnBlockCancel = document.getElementById('btn-block-cancel');

  if(btnBlockMode) {
    btnBlockMode.addEventListener('click', (e) => {
      isBlockMode = true;
      selectedBlockSlots = [];
      btnBlockMode.classList.add('d-none');
      if(btnBlockConfirm) btnBlockConfirm.classList.remove('d-none');
      if(btnBlockCancel) btnBlockCancel.classList.remove('d-none');
      timelineContainer.classList.add('block-mode-active');
    });
  }

  const exitBlockMode = () => {
      isBlockMode = false;
      selectedBlockSlots = [];
      if(btnBlockMode) btnBlockMode.classList.remove('d-none');
      if(btnBlockConfirm) btnBlockConfirm.classList.add('d-none');
      if(btnBlockCancel) btnBlockCancel.classList.add('d-none');
      if(timelineContainer) timelineContainer.classList.remove('block-mode-active');
  };

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

      // Make a request for the first selected slot (simplified)
      // Ideally should iterate, but let's just use the first slot for duration of 30*slots
      const firstSlot = selectedBlockSlots[0];
      const [staffId, time] = firstSlot.split('-');
      
      const payload = {
        date: currentTimelineDate,
        startTime: time,
        duration: selectedBlockSlots.length * 30, // 30 mins per slot
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
          renderTimeline(currentDate.getFullYear() + '-' + String(currentDate.getMonth()+1).padStart(2,'0') + '-' + String(currentDate.getDate()).padStart(2,'0'));
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
          renderTimeline(currentDate.getFullYear() + '-' + String(currentDate.getMonth()+1).padStart(2,'0') + '-' + String(currentDate.getDate()).padStart(2,'0'));
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

  const menuDropdownToggle = document.getElementById('menu-dropdown-toggle');
  const menuButtonsContainerRef = document.getElementById('menu-buttons');
  if (menuDropdownToggle && menuButtonsContainerRef) {
      menuDropdownToggle.addEventListener('click', () => {
          if (menuButtonsContainerRef.style.display === 'none') {
              menuButtonsContainerRef.style.display = 'flex';
          } else {
              menuButtonsContainerRef.style.display = 'none';
          }
      });
  }
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


  const timeToMinutes = (timeStr) => {
    if(!timeStr) return 0;
    const [h,m] = timeStr.split(':').map(Number);
    return h * 60 + m;
  };

  let selectedMenuDuration = 0;
  let selectedMenuName = '';
  let selectedMenuType = 'booked';
  let proxySelection = null;
  let currentDetailId = null;

  const renderTimeline = (dateStr) => {
    const timeline = document.getElementById('timeline');
    if (!timeline) return;
    
    let html = <table class="timeline-table" style="width:100%; border-collapse:collapse; text-align:center;">
      <thead style="position:sticky; top:0; background:var(--color-surface); z-index:10; box-shadow:0 1px 2px rgba(0,0,0,0.05);">
        <tr>
          <th style="padding:0.5rem; border:1px solid var(--color-border); width:60px;">時間</th>;
    staffs.forEach(s => html += <th style="padding:0.5rem; border:1px solid var(--color-border);"> + s.name + </th>);
    html += </tr></thead><tbody>;
    
    for (let h = 9; h <= 20; h++) {
      for (let m = 0; m < 60; m += 30) {
        const timeStr = String(h).padStart(2,'0') + ':' + String(m).padStart(2,'0');
        html += <tr><td style="padding:0.5rem; border:1px solid var(--color-border); font-size:0.85rem; color:var(--color-text-sub);"> + timeStr + </td>;
        
        staffs.forEach(s => {
          const slotKey = s.id + '-' + timeStr;
          const isSelected = typeof selectedBlockSlots !== 'undefined' && selectedBlockSlots.includes(slotKey);
          
          const currentMins = h * 60 + m;
          const booking = mockBookings.find(b => b.date === dateStr && String(b.staff) === String(s.id) && timeToMinutes(b.startTime) === currentMins);
          
          if (booking) {
            const rowSpan = Math.ceil(booking.duration / 30);
            const isBlock = booking.type === '休み';
            const bgCls = isBlock ? 'background-color:#E2E3E5; color:#383D41;' : 'background-color:#D4EDDA; color:#155724; cursor:pointer;';
            html += <td rowspan=" + rowSpan + " class="timeline-booking" data-id=" + booking.id + " style="border:1px solid var(--color-border); padding:0.25rem; vertical-align:top;  + bgCls + ">
              <div style="font-size:0.8rem; font-weight:bold; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;"> + booking.name + </div>
              <div style="font-size:0.75rem; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;"> + booking.menu + </div>
            </td>;
          } else {
            const isCovered = mockBookings.some(b => b.date === dateStr && String(b.staff) === String(s.id) && timeToMinutes(b.startTime) < currentMins && timeToMinutes(b.startTime) + b.duration > currentMins);
            if (!isCovered) {
              const bg = isSelected ? 'background-color:#ffeeba;' : '';
              html += <td class="timeline-slot" data-key=" + slotKey + " style="border:1px solid var(--color-border); cursor:pointer;  + bg + "></td>;
            }
          }
        });
        html += </tr>;
      }
    }
    html += </tbody></table>;
    timeline.innerHTML = html;

    timeline.querySelectorAll('.timeline-slot').forEach(td => {
      td.addEventListener('click', () => {
        if (typeof isBlockMode !== 'undefined' && isBlockMode) {
          const key = td.dataset.key;
          if (selectedBlockSlots.includes(key)) {
            selectedBlockSlots = selectedBlockSlots.filter(k => k !== key);
          } else {
            selectedBlockSlots.push(key);
          }
          renderTimeline(dateStr);
        } else if (selectedMenuDuration > 0) {
          const key = td.dataset.key;
          const [staffId, timeStr] = key.split('-');
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
        if (booking && booking.type !== '休み') {
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
              document.getElementById('customer-mgmt-modal').classList.remove('d-none'); showCustomerFormView({ name: booking.name, phone: booking.phone });
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
















