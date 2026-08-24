let returnToDetailsModal = false;
function formatDateWithDay(dateStr) {
    const days = ['日', '月', '火', '水', '木', '金', '土'];
    const dt = new Date(dateStr.replace(/-/g, '/'));
    return dateStr + '(' + days[dt.getDay()] + ')';
}

const GAS_URL = 'https://script.google.com/macros/s/AKfycbx-b6WOncIt4M8nPkncMZfLDYc1MoV55tOvtL-cCT3ARdTSsZcMFUyk4d_J9Ur51cWi/exec';

  document.addEventListener('DOMContentLoaded', () => {
    const initDate = new Date();
    const dDisplay = document.getElementById('date-display');
    if (dDisplay) dDisplay.innerText = initDate.getFullYear() + '/' + String(initDate.getMonth()+1).padStart(2,'0') + '/' + String(initDate.getDate()).padStart(2,'0');
  // Normalize string for search (Kana conversion)
  const normalizeForSearch = (str) => { if (!str) return ''; return String(str).replace(/[\u30a1-\u30f6]/g, function(match) { return String.fromCharCode(match.charCodeAt(0) - 0x60); }).replace(/[\uFF21-\uFF3A\uFF41-\uFF5A\uFF10-\uFF19]/g, function(s) { return String.fromCharCode(s.charCodeAt(0) - 0xFEE0); }).toLowerCase().trim(); };

  let menus = [];
  let staffs = [];
  let mockBookings = [];
  const cancelledBookingIds = new Set();
  let mockCustomers = [];
  
  let currentTimelineDate = '';
  let currentDate = new Date();
  
  let isBlockMode = false;
  let selectedBlockSlots = [];
  let selectedCancelBlocks = [];
  
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
          if (typeof renderTimeline !== 'undefined') renderTimeline(currentTimelineDate);
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
    fetch(GAS_URL + '?action=getInitialData&t=' + new Date().getTime())
      .then(res => res.json())
      .then(result => {
        if(result.success) {
          menus = result.data.menus.map(m => { const v = Object.values(m); return { id: v[0], name: v[1], duration: parseInt(v[2]), price: v[3] }; });
          staffs = result.data.staffs.map(s => { const v = Object.values(s); return { id: v[0], name: v[1] }; });

          mockCustomers = (result.data.customers || []).map(c => {
            return { id: c['\u9867\u5BA2ID'] || Object.values(c)[0] || '', name: c['\u304A\u5BA2\u69D8\u540D'] || Object.values(c)[1] || '', kana: c['\u3075\u308A\u304C\u306A'] || Object.values(c)[2] || '', address: c['\u4F4F\u6240\uFF08\u5E02\u753A\u6751\uFF09'] || Object.values(c)[3] || '', occupation: c['\u8077\u696D'] || Object.values(c)[4] || '', phone: c['\u96FB\u8A71\u756A\u53F7'] || Object.values(c)[5] || '', email: c['\u30E1\u30FC\u30EB\u30A2\u30C9\u30EC\u30B9'] || Object.values(c)[6] || '', firstVisit: c['\u521D\u56DE\u4E88\u7D04\u65E5'] || Object.values(c)[7] || '', lastVisit: c['\u6700\u7D42\u6765\u5E97\u65E5'] || Object.values(c)[8] || '', memo: c['\u30E1\u30E2'] || Object.values(c)[10] || '' }; }).filter(c => c.name && c.name.trim() !== '' && !['休み', 'x', '迎え', '用事', 'テスト'].includes(c.name));

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
          }).filter(b => b.type && b.type.indexOf('キャンセル') === -1 && !cancelledBookingIds.has(String(b.id)));
          


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
    
    let html = '<table class="timeline-table" style="width:100%; table-layout: fixed; border-collapse:collapse; text-align:center;">';
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
          const isCovered = mockBookings.some(b => b.date === dateStr && String(b.staff) === String(s.id) && timeToMinutes(b.startTime) < currentMins && timeToMinutes(b.startTime) + b.duration > currentMins);
          const booking = mockBookings.find(b => b.date === dateStr && String(b.staff) === String(s.id) && timeToMinutes(b.startTime) === currentMins);
          if (booking && !isCovered) {
            const rowSpan = Math.ceil(booking.duration / 30);
            const isBlock = booking.type === '休み' || booking.type === 'x' || booking.name === '休み' || booking.name === 'x';
            const bgCls = isBlock ? 'background-color:#E2E3E5; color:#383D41;' : 'background-color:#D4EDDA; color:#155724; cursor:pointer;';
                        html += '<td rowspan="' + rowSpan + '" class="timeline-booking" data-id="' + booking.id + '" style="border:' + (selectedCancelBlocks.includes(String(booking.id)) ? '2px solid #dc3545' : '1px solid var(--color-border)') + '; opacity:' + (selectedCancelBlocks.includes(String(booking.id)) ? '0.7' : '1') + '; padding:0.25rem; vertical-align:top; ' + bgCls + '">';
            if (!isBlock) {
              html += '<div style="font-size:0.75rem; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">' + booking.startTime + '</div>';
            }
            html += '<div style="font-size:0.8rem; font-weight:bold; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">' + booking.name + '</div>';
            if (!isBlock || booking.menu !== '休み設定') {
              html += '<div style="font-size:0.75rem; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">' + booking.menu + '</div>';
            }
            html += '</td>';
          } else {
          
                        if (!isCovered) {
              let isAvailableForMenu = true;
              if (!isBlockMode && selectedMenuDuration > 0) {
                  const endMins = currentMins + selectedMenuDuration;
                  if (endMins > 20 * 60) {
                      isAvailableForMenu = false;
                  } else {
                      const overlapping = mockBookings.some(b => b.date === dateStr && String(b.staff) === String(s.id) && timeToMinutes(b.startTime) < endMins && (timeToMinutes(b.startTime) + b.duration) > currentMins);
                      if (overlapping) isAvailableForMenu = false;
                  }
              }

              if (!isAvailableForMenu) {
                  html += '<td style="border:1px solid var(--color-border); background-color: var(--color-disabled, #F0EDE8); cursor:not-allowed; position: relative; overflow: hidden;"><div style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; background: linear-gradient(to bottom right, transparent calc(50% - 1px), rgba(0, 0, 0, 0.15) calc(50% - 1px), rgba(0, 0, 0, 0.15) calc(50% + 1px), transparent calc(50% + 1px));"></div></td>';
              } else {
                  const bg = isSelected ? 'background-color:#ffeeba;' : '';
                  html += '<td class="timeline-slot" data-key="' + slotKey + '" style="border:1px solid var(--color-border); cursor:pointer; ' + bg + '"></td>';
              }
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
        if (booking) {
          const isBlock = booking.type === '休み' || booking.type === 'x' || booking.name === '休み' || booking.name === 'x';
          
          if (isBlockMode) {
              if (isBlock) {
                  const idStr = String(booking.id);
                  const idx = selectedCancelBlocks.indexOf(idStr);
                  if (idx > -1) selectedCancelBlocks.splice(idx, 1);
                  else selectedCancelBlocks.push(idStr);
                  renderTimeline(currentTimelineDate);
              }
              return; // In block mode, don't open details modal
          }
          
          const dTitle = document.getElementById('details-modal-title');
          if(dTitle) dTitle.innerText = isBlock ? 'ブロックの詳細' : '予約詳細';
          
          const dNameLabel = document.querySelector('#detail-name-container .form-label');
          if(dNameLabel) dNameLabel.style.display = isBlock ? 'none' : 'block';
          
          const dPhoneContainer = document.getElementById('detail-phone-container');
          if(dPhoneContainer) {
              if (isBlock) dPhoneContainer.classList.add('d-none');
              else dPhoneContainer.classList.remove('d-none');
          }

          const dDt = document.getElementById('detail-datetime'); if(dDt) dDt.innerText = booking.date.replace(/-/g, '/') + ' ' + booking.startTime;
          
          const dMenu = document.getElementById('detail-menu');
          if(dMenu) dMenu.innerText = isBlock ? '休み（ブロック枠）' : booking.menu;
          
          const dStaff = document.getElementById('detail-staff');
          if(dStaff) dStaff.innerText = '担当: ' + (staffs.find(s => String(s.id) === String(booking.staff))?.name || '');
          
                      const fullCustomer = mockCustomers.find(c => c.phone === booking.phone) || { name: booking.name, phone: booking.phone };
            if(document.getElementById('customer-name')) document.getElementById('customer-name').innerText = fullCustomer.name || '';
            if(document.getElementById('customer-kana')) document.getElementById('customer-kana').innerText = fullCustomer.kana || '';
            if(document.getElementById('customer-address')) document.getElementById('customer-address').innerText = fullCustomer.address || '';
            if(document.getElementById('customer-occupation')) document.getElementById('customer-occupation').innerText = fullCustomer.occupation || '';
            if(document.getElementById('customer-phone')) document.getElementById('customer-phone').innerText = fullCustomer.phone || '';
            if(document.getElementById('customer-email')) document.getElementById('customer-email').innerText = fullCustomer.email || '';
            if(document.getElementById('customer-first-visit')) document.getElementById('customer-first-visit').innerText = fullCustomer.firstVisit || '';
            if(document.getElementById('customer-last-visit')) document.getElementById('customer-last-visit').innerText = fullCustomer.lastVisit || '';
            if(document.getElementById('customer-notes')) document.getElementById('customer-notes').innerText = fullCustomer.memo || '';
            const dName = document.getElementById('detail-name');
          if(dName) {
            dName.innerText = isBlock ? (booking.name === 'x' ? '休み' : booking.name) : booking.name;
            dName.onclick = () => {
              if (isBlock) {
                 const newName = prompt('表示テキストを変更:', dName.innerText);
                 if (newName !== null && newName.trim() !== '' && newName.trim() !== booking.name) {
                     const finalName = newName.trim();
                     booking.name = finalName;
                     dName.innerText = finalName;
                     renderTimeline(currentTimelineDate);
                     
                     fetch(GAS_URL, {
                         method: 'POST',
                         headers: { 'Content-Type': 'text/plain;charset=utf-8' },
                         body: JSON.stringify({ action: 'cancelBooking', payload: { bookingId: booking.id } })
                     }).then(() => {
                         cancelledBookingIds.add(String(booking.id));
                              mockBookings = mockBookings.filter(b => String(b.id) !== String(booking.id));
                         renderTimeline(currentTimelineDate);
                         const payload = {
                             date: formatDateWithDay(booking.date), startTime: booking.startTime, duration: booking.duration,
                             staff: booking.staff, name: finalName, phone: '', email: '', memo: '',
                             menu: '休み設定', type: 'blocked'
                         };
                         return fetch(GAS_URL, {
                             method: 'POST',
                             headers: { 'Content-Type': 'text/plain;charset=utf-8' },
                             body: JSON.stringify({ action: 'createBooking', payload })
                         });
                     }).then(res => res.json()).then(result => {
                         if (result.success) { fetchAdminData(); }
                     }).catch(err => console.error(err));
                 }
              } else {
                document.getElementById('details-modal').classList.add('d-none');
                document.getElementById('customer-mgmt-modal').classList.remove('d-none');
                returnToDetailsModal = true;
                const fullCustomer = mockCustomers.find(c => c.phone === booking.phone) || { name: booking.name, phone: booking.phone };
                  showCustomerFormView(fullCustomer);
              }
            };
          }
          
          const dPhone = document.getElementById('detail-phone');
          if(dPhone) dPhone.innerText = isBlock ? '-' : (booking.phone || '未登録');
          
          const dMemo = document.getElementById('detail-memo');
          if(dMemo) dMemo.innerText = booking.memo || 'なし';
          
          currentDetailId = booking.id;
          
          const btnCancel = document.getElementById('btn-cancel-booking');
          if (btnCancel) {
              if (isBlock) {
                  btnCancel.style.display = 'none';
              } else {
                  btnCancel.style.display = 'block';
              }
          }
          
          document.getElementById('details-modal').classList.remove('d-none');
        }
      });
    });
  };





  const btnBlockMode = document.getElementById('btn-block-mode');
  const btnBlockConfirm = document.getElementById('btn-block-confirm');
    const btnBlockDelete = document.getElementById('btn-block-delete');

  const exitBlockMode = () => {
      isBlockMode = false;
      selectedBlockSlots = [];
      if(btnBlockMode) btnBlockMode.classList.remove('d-none');
      if(btnBlockConfirm) btnBlockConfirm.classList.add('d-none');
            if(btnBlockDelete) btnBlockDelete.classList.add('d-none');
      if(timelineContainer) timelineContainer.classList.remove('block-mode-active');
  };

  if(btnBlockMode) {
    btnBlockMode.addEventListener('click', () => {
      isBlockMode = true;
      selectedBlockSlots = [];
      btnBlockMode.classList.add('d-none');
      if(btnBlockConfirm) btnBlockConfirm.classList.remove('d-none');
            if(btnBlockDelete) btnBlockDelete.classList.remove('d-none');
      if(timelineContainer) timelineContainer.classList.add('block-mode-active');
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
        date: formatDateWithDay(currentTimelineDate),
        startTime: timeStr,
        duration: selectedBlockSlots.length * 30,
        staff: staffId,
        name: '休み',
        phone: '',
        email: '',
        memo: '',
        menu: '休み設定',
        type: 'blocked'
      };

      fetch(GAS_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({ action: 'createBooking', payload })
      })
      .then(res => res.json())
      .then(result => {
        if(result.success) {
          exitBlockMode(); fetchAdminData();
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
  if(btnBlockDelete) {
    btnBlockDelete.addEventListener('click', () => {
      if (selectedCancelBlocks.length === 0) {
        alert('\u89e3\u9664\u3059\u308b\u67a0\u3092\u9078\u629e\u3057\u3066\u304f\u3060\u3055\u3044\u3002');
        return;
      }
      
      btnBlockDelete.innerText = '\u89e3\u9664\u4e2d...';
      btnBlockDelete.disabled = true;

      const promises = selectedCancelBlocks.map(id => {
          cancelledBookingIds.add(id);
          mockBookings = mockBookings.filter(b => String(b.id) !== id);
          return fetch(GAS_URL, {
              method: 'POST',
              headers: { 'Content-Type': 'text/plain;charset=utf-8' },
              body: JSON.stringify({ action: 'cancelBooking', payload: { bookingId: id } })
          }).then(res => res.json());
      });

      renderTimeline(currentTimelineDate);
      
      Promise.all(promises).then(results => {
          const errors = results.filter(r => !r.success);
          if (errors.length > 0) {
              alert('\u4e00\u90e8\u306e\u89e3\u9664\u306b\u5931\u6557\u3057\u307e\u3057\u305f\u3002');
          }
          exitBlockMode();
          fetchAdminData();
      }).catch(err => {
          alert('\u901a\u4fe1\u30a8\u30e9\u30fc: ' + err.message);
          exitBlockMode();
          fetchAdminData();
      }).finally(() => {
          btnBlockDelete.innerText = '\u89e3\u9664';
          btnBlockDelete.disabled = false;
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
          document.getElementById('booking-modal').classList.add('d-none'); fetchAdminData();
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
        body: JSON.stringify({ action: 'cancelBooking', payload: { bookingId: currentDetailId } })
      })
      .then(res => res.json())
      .then(result => {
        if(result.success) {
          cancelledBookingIds.add(String(currentDetailId));
          mockBookings = mockBookings.filter(b => String(b.id) !== String(currentDetailId));
          document.getElementById('details-modal').classList.add('d-none');
          renderTimeline(currentTimelineDate);
          fetchAdminData();
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
        }
        
        selectedMenuDuration = 0;
        selectedMenuName = '';
        const allMenuBtns = document.querySelectorAll('.menu-btn');
        if (allMenuBtns.length > 0) allMenuBtns.forEach(b => b.classList.add('btn-outline'));
        const dropdownText = document.getElementById('menu-dropdown-text');
        if (dropdownText) dropdownText.innerText = 'メニューを選択';
        if (typeof renderTimeline !== 'undefined') renderTimeline(currentTimelineDate);
        
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
      if(document.getElementById('edit-customer-id')) document.getElementById('edit-customer-id').value = customer.id;
      if(document.getElementById('edit-name')) document.getElementById('edit-name').value = customer.name;
      if(document.getElementById('edit-kana')) document.getElementById('edit-kana').value = customer.kana || '';
      if(document.getElementById('edit-phone')) document.getElementById('edit-phone').value = customer.phone;
      if(document.getElementById('edit-address')) document.getElementById('edit-address').value = customer.address || '';
      if(document.getElementById('edit-occupation')) document.getElementById('edit-occupation').value = customer.occupation || '';
      if(document.getElementById('edit-email')) document.getElementById('edit-email').value = customer.email || '';
      if(document.getElementById('edit-memo')) document.getElementById('edit-memo').value = customer.memo || '';
    } else {
      if(customerFormTitle) customerFormTitle.innerText = '新規顧客登録';
      if(customerEditForm) customerEditForm.reset();
      if(document.getElementById('edit-customer-id')) document.getElementById('edit-customer-id').value = '';
    }
  };
    const old_renderCustomerMgmtList = () => {
    if (!customerTbody) return;
    
    const customers = mockCustomers;
    
    const query = (customerSearchInput && customerSearchInput.value) ? normalizeForSearch(customerSearchInput.value) : '';
    const filtered = customers.filter(c => 
      normalizeForSearch(c.name || '').includes(query) || 
      normalizeForSearch(c.kana || '').includes(query) || 
      normalizeForSearch(c.phone || '').includes(query)
    );

    customerTbody.innerHTML = '';
    if (filtered.length === 0) {
      customerTbody.innerHTML = '<tr><td colspan="4" style="text-align: center; padding: 1rem; color: #777;">該当顧客が見つかりません</td></tr>';
      return;
    }

    filtered.forEach(c => {
      const tr = document.createElement('tr');
      tr.innerHTML = '<td>' + c.name + (c.kana ? '<br><small style="color:#999;">' + c.kana + '</small>' : '') + '</td><td>' + c.phone + '</td><td>' + c.lastVisit + '</td><td><button class="btn btn-sm btn-outline edit-btn">編集</button></td>';
      
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

    // Autocomplete for Proxy Booking
  const proxyNameInput = document.getElementById('proxy-name');
  const autocompleteList = document.getElementById('autocomplete-list');
  const proxyPhoneInput = document.getElementById('proxy-phone');

  if (proxyNameInput && autocompleteList) {
    proxyNameInput.addEventListener('input', () => {
      const val = normalizeForSearch(proxyNameInput.value);
      autocompleteList.innerHTML = '';
      if (!val) {
        autocompleteList.classList.add('d-none');
        return;
      }
      
              const matches = mockCustomers.filter(c => 
          normalizeForSearch(c.name || '').includes(val) || 
          normalizeForSearch(c.kana || '').includes(val) || 
          normalizeForSearch(c.phone || '').includes(val)
        );
      
        if (matches.length > 0) {
        matches.forEach(match => {
          const div = document.createElement('div');
          div.className = 'autocomplete-item';
          div.innerHTML = '<strong>' + match.name + '</strong>' + (match.kana ? ' <span style="font-size:0.8rem;color:#999;">' + match.kana + '</span>' : '') + ' <span style="font-size:0.8rem;color:#777;">(' + match.phone + ')</span>';
          div.addEventListener('click', () => {
            proxyNameInput.value = match.name;
            if(proxyPhoneInput) proxyPhoneInput.value = match.phone;
            autocompleteList.classList.add('d-none');
          });
          autocompleteList.appendChild(div);
        });
        autocompleteList.classList.remove('d-none');
      } else {
        autocompleteList.classList.add('d-none');
      }
    });

    document.addEventListener('click', (e) => {
      if (e.target !== proxyNameInput && e.target !== autocompleteList) {
        autocompleteList.classList.add('d-none');
      }
    });
  }

  if (customerEditForm) {
    customerEditForm.addEventListener('submit', (e) => {
      e.preventDefault();
      
      const btnSubmit = customerEditForm.querySelector('button[type="submit"]');
      if (btnSubmit) {
          btnSubmit.disabled = true;
          btnSubmit.innerText = '保存中...';
      }

      let cId = document.getElementById('edit-customer-id').value;
      if (cId && String(cId).startsWith('b_')) {
        cId = ''; // Treat as new customer if generated from booking
      }
      
      const customerData = {
        '顧客ID': cId,
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
        body: JSON.stringify({
          action: 'saveCustomer',
          payload: customerData
        })
      })
      .then(res => res.json())
      .then(result => {
        if (result.success) {
          alert('顧客データを保存しました。');
          fetchAdminData(); // Refresh data
          showCustomerListView(); // Close modal and show list
        } else {
          alert('エラー: ' + (result.error || result.message || '保存に失敗しました。'));
        }
      })
      .catch(err => {
        console.error(err);
        alert('通信エラー: 顧客データの保存に失敗しました。');
      })
      .finally(() => {
        if (btnSubmit) {
            btnSubmit.disabled = false;
            btnSubmit.innerText = '保存';
        }
      });
    });
  }

  // START
  fetchAdminData();

    let currentCustomerView = 'list';
    
    // Using function keyword so it's hoisted!
    function renderCustomerMgmtList() {
      const customerTbody = document.getElementById('customer-tbody');
      if (!customerTbody) return;
      const cardContainer = document.getElementById('customer-card-container');
      
      const customers = mockCustomers;
      const actualCustomers = customers.filter(c => c.name && c.name.trim() !== '' && !['休み', 'x', '迎え', '用事', 'テスト'].includes(c.name));
      
      const customerSearchInput = document.getElementById('customer-search-input');
      const query = (customerSearchInput && customerSearchInput.value) ? normalizeForSearch(customerSearchInput.value) : '';
      const filtered = actualCustomers.filter(c => 
        normalizeForSearch(c.name || '').includes(query) || 
        normalizeForSearch(c.kana || '').includes(query) || 
        normalizeForSearch(c.phone || '').includes(query)
      );
  
      customerTbody.innerHTML = '';
      if (cardContainer) cardContainer.innerHTML = '';

      if (filtered.length === 0) {
        customerTbody.innerHTML = '<tr><td colspan="4" style="text-align: center; padding: 3rem; color: #777;">該当顧客が見つかりません</td></tr>';
        if (cardContainer) cardContainer.innerHTML = '<div style="grid-column: 1 / -1; text-align: center; padding: 3rem; color: #777;">該当顧客が見つかりません</div>';
        return;
      }
  
      filtered.forEach(c => {
        // List View Row
        const tr = document.createElement('tr');
        tr.style.transition = 'background 0.2s';
        tr.onmouseover = () => tr.style.background = '#f8fafc';
        tr.onmouseout = () => tr.style.background = 'transparent';
        
        tr.innerHTML = `<td style="padding: 1rem; border-bottom: 1px solid var(--color-border);">
            <div style="font-weight: bold; color: var(--color-text);">${c.name}</div>
            ${c.kana ? `<div style="font-size: 0.85rem; color: var(--color-text-sub); margin-top: 0.2rem;">${c.kana}</div>` : ''}
          </td>
          <td style="padding: 1rem; border-bottom: 1px solid var(--color-border); color: var(--color-text-sub);">
            ${c.phone || '-'}
          </td>
          <td style="padding: 1rem; border-bottom: 1px solid var(--color-border); text-align: right;">
            <button class="btn btn-sm btn-outline edit-btn">詳細・編集</button>
          </td>`;
        
        const editBtn = tr.querySelector('.edit-btn');
        editBtn.addEventListener('click', () => {
          showCustomerFormView(c);
        });
        if (currentCustomerView === 'list') {
           customerTbody.appendChild(tr);
        }

        // Card View Item
        if (cardContainer && currentCustomerView === 'card') {
          const card = document.createElement('article');
          card.style.background = '#fff';
          card.style.border = '1px solid var(--color-border)';
          card.style.borderRadius = '0.75rem';
          card.style.padding = '1.5rem';
          card.style.boxShadow = '0px 4px 20px rgba(0,0,0,0.03)';
          card.style.display = 'flex';
          card.style.flexDirection = 'column';
          card.style.cursor = 'pointer';
          card.style.transition = 'background-color 0.2s';
          card.onmouseover = () => card.style.background = '#F8FAFC';
          card.onmouseout = () => card.style.background = '#fff';

          card.addEventListener('click', (e) => {
             showCustomerFormView(c);
          });

          card.innerHTML = `<div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 1rem;">
              <div>
                <div style="font-size: 0.75rem; font-weight: 700; letter-spacing: 0.1em; color: var(--color-text-sub); margin-bottom: 0.25rem;">${c.kana || ' '}</div>
                <div style="font-size: 1.25rem; font-weight: 600; color: var(--color-text); line-height: 1.3;">${c.name}</div>
              </div>
            </div>
            <div style="padding-top: 1rem; border-top: 1px solid var(--color-border); display: flex; flex-direction: column; gap: 0.75rem;">
              <div style="display: flex; align-items: center; color: var(--color-text-sub);">
                <span style="font-size: 1.1rem; margin-right: 0.5rem;">📞</span>
                <span style="font-size: 0.875rem; line-height: 1.6;">${c.phone || '登録なし'}</span>
              </div>
              <div style="display: flex; align-items: center; color: var(--color-text-sub);">
                <span style="font-size: 1.1rem; margin-right: 0.5rem;">📅</span>
                <span style="font-size: 0.875rem; line-height: 1.6;">最終来店: ${c.lastVisit || '-'}</span>
              </div>
            </div>`;
          cardContainer.appendChild(card);
        }
      });
    }
    
    // Add event listeners for toggle buttons
    setTimeout(() => {
      const btnViewList = document.getElementById('btn-view-list');
      const btnViewCard = document.getElementById('btn-view-card');
      const customerTableContainer = document.getElementById('customer-table-container');
      const customerCardContainer = document.getElementById('customer-card-container');

      if (btnViewList && btnViewCard) {
        btnViewList.addEventListener('click', () => {
          currentCustomerView = 'list';
          btnViewList.style.background = '#fff';
          btnViewList.style.borderColor = 'var(--color-border)';
          btnViewList.style.boxShadow = '0 1px 2px rgba(0,0,0,0.05)';
          btnViewList.style.color = 'var(--color-text)';
          btnViewList.style.fontWeight = 'bold';
          
          btnViewCard.style.background = 'transparent';
          btnViewCard.style.borderColor = 'transparent';
          btnViewCard.style.boxShadow = 'none';
          btnViewCard.style.color = 'var(--color-text-sub)';
          btnViewCard.style.fontWeight = 'normal';
          
          if (customerTableContainer) customerTableContainer.classList.remove('d-none');
          if (customerCardContainer) customerCardContainer.classList.add('d-none');
          renderCustomerMgmtList();
        });

        btnViewCard.addEventListener('click', () => {
          currentCustomerView = 'card';
          btnViewCard.style.background = '#fff';
          btnViewCard.style.borderColor = 'var(--color-border)';
          btnViewCard.style.boxShadow = '0 1px 2px rgba(0,0,0,0.05)';
          btnViewCard.style.color = 'var(--color-text)';
          btnViewCard.style.fontWeight = 'bold';
          
          btnViewList.style.background = 'transparent';
          btnViewList.style.borderColor = 'transparent';
          btnViewList.style.boxShadow = 'none';
          btnViewList.style.color = 'var(--color-text-sub)';
          btnViewList.style.fontWeight = 'normal';
          
          if (customerTableContainer) customerTableContainer.classList.add('d-none');
          if (customerCardContainer) customerCardContainer.classList.remove('d-none');
          renderCustomerMgmtList();
        });
      }
    }, 100);

});















































