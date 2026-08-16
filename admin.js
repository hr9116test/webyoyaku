// admin.js
document.addEventListener('DOMContentLoaded', () => {
  // State
  let currentDate = new Date();
  
  // Mock Data (In real app, fetch from GAS)
  // startTime is 'HH:MM', duration is in minutes
  let mockBookings = [
    { id: 1, date: formatDate(new Date()), startTime: '09:00', duration: 60, staff: 'staffA', name: '小布施 太郎', menu: 'カット', phone: '090-1234-5678', email: 'taro@example.com', type: 'booked' },
    { id: 2, date: formatDate(new Date()), startTime: '10:00', duration: 120, staff: 'staffB', name: '休み', type: 'blocked' },
    { id: 3, date: formatDate(new Date()), startTime: '14:30', duration: 90, staff: 'staffA', name: '長野 花子', menu: 'カラー', phone: '080-9876-5432', type: 'booked' },
  ];

  const staffs = [
    { id: 'staffA', name: 'スタッフA' },
    { id: 'staffB', name: 'スタッフB' }
  ];

  // DOM Elements
  const dateInput = document.getElementById('current-date');
  const dateDisplay = document.getElementById('date-display');
  const btnClearMenu = document.getElementById('btn-clear-menu');
  const menuButtons = document.querySelectorAll('.menu-btn');
  const timeline = document.getElementById('timeline');
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
  renderTimeline();

  function updateDateDisplay() {
    dateInput.value = formatDate(currentDate);
    dateDisplay.innerText = formatDisplayDate(currentDate);
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
  
  // PC等のブラウザで、透明なinput領域のどこをクリックしてもカレンダーが開くようにする
  dateInput.addEventListener('click', function(e) {
    if (typeof this.showPicker === 'function') {
      try {
        this.showPicker();
      } catch (err) {
        // ignore
      }
    }
  });

  menuButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      if (isBlockMode) exitBlockMode();
      
      // 既に選択されているボタンを再度押した場合は解除する
      if (!btn.classList.contains('btn-outline')) {
        btn.classList.add('btn-outline');
        selectedMenuDuration = 0;
        selectedMenuName = '';
      } else {
        // 他のボタンの選択をすべて解除 (btn-outline をつける)
        menuButtons.forEach(b => {
          b.classList.add('btn-outline');
        });
        // 押されたボタンを選択状態にする (btn-outline を外す)
        btn.classList.remove('btn-outline');
        
        selectedMenuDuration = parseInt(btn.dataset.duration);
        selectedMenuName = btn.dataset.name;
        selectedMenuType = btn.dataset.type || 'booked';
      }
      
      // モバイルアコーディオン連動
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
  });

  // Mobile Accordion Toggle
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
    
    // Clear menu selections
    menuButtons.forEach(b => b.classList.add('btn-outline'));
    selectedMenuDuration = 0;
    selectedMenuName = '';
    
    // Reset mobile accordion button if active
    if (window.innerWidth < 768 && mobileMenuToggle) {
      mobileMenuToggle.innerText = 'メニューを選択 ▼';
      mobileMenuToggle.classList.add('btn-outline');
    }
    
    renderTimeline();
  });

  btnBlockCancel.addEventListener('click', () => {
    if (selectedExistingBlocks.length > 0) {
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
    
    selectedBlockSlots.forEach(slotStr => {
      const [staffId, timeStr] = slotStr.split('-');
      mockBookings.push({
        id: Date.now() + Math.random(),
        date: formatDate(currentDate),
        startTime: timeStr,
        duration: 30, // 30 min per slot
        staff: staffId,
        name: '休み',
        type: 'blocked'
      });
    });
    
    exitBlockMode();
    renderTimeline();
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
    
    // Add to mock data
    mockBookings.push({
      id: Date.now(),
      date: formatDate(currentDate),
      startTime: pendingBooking.startTime,
      duration: pendingBooking.duration,
      staff: pendingBooking.staff,
      name: name,
      phone: phone,
      menu: selectedMenuName,
      type: pendingBooking.type
    });
    
    modal.classList.add('d-none');
    e.target.reset();
    
    // 予約後もボタンの選択状態は維持するか、解除するか。今回は解除する。
    menuButtons.forEach(b => {
      b.classList.add('btn-outline');
      b.style.backgroundColor = '';
      b.style.color = '';
    });
    selectedMenuDuration = 0;
    selectedMenuName = '';
    selectedMenuType = 'booked';
    
    renderTimeline();
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
    const [h, m] = timeStr.split(':').map(Number);
    return h * 60 + m;
  }
  
  function minutesToTime(mins) {
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
  }

  // Render Timeline
  let pendingBooking = null; // Stores info when a slot is clicked

  function renderTimeline() {
    timeline.innerHTML = '';
    const selectedDateStr = formatDate(currentDate);
    const bookingsToday = mockBookings.filter(b => b.date === selectedDateStr);
    
    const requiredDuration = selectedMenuDuration;
    const requestedStaff = 'any';

    // Build Time Column
    const timeCol = document.createElement('div');
    timeCol.className = 'timeline-time-col';
    
    const timeHeader = document.createElement('div');
    timeHeader.className = 'timeline-header';
    timeHeader.innerText = '時間';
    timeCol.appendChild(timeHeader);

    // Business hours 09:00 to 19:00 (in 30 min increments = 20 slots)
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

    // Build Staff Columns
    staffs.forEach(staff => {
      const staffCol = document.createElement('div');
      staffCol.className = 'timeline-staff-col';
      
      const header = document.createElement('div');
      header.className = 'timeline-header';
      header.innerText = staff.name;
      staffCol.appendChild(header);

      // Create empty slots
      const slotsContainer = document.createElement('div');
      slotsContainer.style.position = 'relative';

      // Check availability array for this staff
      // An array of booleans indicating if a 30-min slot is free
      const numSlots = (endMins - startMins) / slotMins;
      const isFree = new Array(numSlots).fill(true);

      // Mark booked slots as not free
      bookingsToday.filter(b => b.staff === staff.id).forEach(b => {
        const bStart = timeToMinutes(b.startTime);
        const startIndex = (bStart - startMins) / slotMins;
        const slotsNeeded = b.duration / slotMins;
        for (let i = startIndex; i < startIndex + slotsNeeded; i++) {
          if (i >= 0 && i < numSlots) isFree[i] = false;
        }
        
        // Render the booking block visually
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
          
          if (isBlockMode) return; // Ignore clicks on normal bookings while in block mode
          
          if (b.type === 'blocked') {
            const newName = prompt('ブロックの名称を編集:', b.name);
            if (newName !== null) {
              b.name = newName.trim() || '休み';
              renderTimeline();
            }
            return;
          }
          
          currentDetailId = b.id;
          
          document.getElementById('detail-datetime').innerText = `${formatDisplayDate(new Date(b.date))} ${b.startTime} 〜`;
          
          const cancelBtn = document.getElementById('btn-cancel-booking');
          if (b.type === 'blocked') {
            document.getElementById('detail-menu').innerText = 'お休み・予定ブロック\n※ブロックの解除は上部の「ブロック編集」モードから行ってください。';
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
          
          document.getElementById('detail-staff').innerText = `担当: ${staffs.find(s => s.id === b.staff).name}`;
          document.getElementById('detail-name').innerText = b.name;
          
          detailsModal.classList.remove('d-none');
        });

        if (isBlockMode && b.type === 'blocked' && selectedExistingBlocks.includes(b.id)) {
          block.style.backgroundColor = 'rgba(114, 28, 36, 0.7)';
          block.style.color = 'white';
        }

        slotsContainer.appendChild(block);
      });

      // Render clickable slots
      for (let i = 0; i < numSlots; i++) {
        const slot = document.createElement('div');
        slot.className = 'timeline-slot';
        
        // Availability Logic
        let canBookHere = false;
        if (isBlockMode) {
          canBookHere = isFree[i];
        } else if (requiredDuration > 0) {
          // Are we asking for this staff?
          if (requestedStaff === 'any' || requestedStaff === staff.id) {
            const slotsNeeded = requiredDuration / slotMins;
            canBookHere = true;
            // Check if all needed slots are free
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
            
            const menuName = selectedMenuName;
            
            pendingBooking = {
              startTime: sTime,
              duration: requiredDuration,
              staff: staff.id,
              type: selectedMenuType
            };
              
              document.getElementById('modal-datetime').innerText = `${formatDisplayDate(currentDate)} ${sTime} 〜`;
              document.getElementById('modal-menu').innerText = `${menuName} (${requiredDuration}分)`;
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
            
          } else {
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
    { name: '小布施 太郎', kana: 'おぶせ たろう', phone: '090-1234-5678' },
    { name: '長野 花子', kana: 'ながの はなこ', phone: '080-9876-5432' },
    { name: '須坂 一郎', kana: 'すざか いちろう', phone: '070-1111-2222' }
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

    const searchVal = val.replace(/[\s　]/g, ''); // 検索時のスペースを無視
    
    const matches = mockCustomers.filter(c => {
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

  // Hide autocomplete when clicking outside
  document.addEventListener('click', (e) => {
    if (!nameInput.contains(e.target) && !autocompleteList.contains(e.target)) {
      autocompleteList.classList.add('d-none');
    }
  });

});
