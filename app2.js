// app.js

function formatGasTime(isoString) {
  if (!isoString) return "";
  if (!isoString.includes("T")) return isoString.substring(0,5);
  const d = new Date(isoString);
  return d.toLocaleTimeString("ja-JP", { hour: "2-digit", minute: "2-digit", timeZone: "Asia/Tokyo" });
}
const GAS_URL = 'https://script.google.com/macros/s/AKfycbzQHOMNzHlq83JByAg1BF2dg5L08164JaOWHP0ilHph0Yu3QZb4MXVAjstQYoi1y8K-/exec';

document.addEventListener('DOMContentLoaded', () => {
  // --- LIFF Initialization ---
  if (typeof liff !== 'undefined') {
    liff.init({ liffId: '2010034763-iXyqDV0H' }).then(() => {
      if (liff.isLoggedIn()) {
        liff.getProfile().then(profile => {
                    currentUserLineId = profile.userId;
          // Fetch past data
          fetch(GAS_URL + '?action=getCustomerByLineId&lineId=' + profile.userId)
            .then(res => res.json())
            .then(res => {
              if (res.success && res.data && res.data.customer) {
                const c = res.data.customer;
                if (c.name && !document.getElementById('user-name').value) document.getElementById('user-name').value = c.name;
                if (c.phone && !document.getElementById('user-phone').value) document.getElementById('user-phone').value = c.phone;
                if (c.email && !document.getElementById('user-email').value) document.getElementById('user-email').value = c.email;
              } else {
                // If not found in DB, just use LINE display name
                
              }
            })
            .catch(err => {
              
            });

        }).catch(err => console.error('LIFF getProfile Error:', err));
      } else {
        // If they open it in an external browser, we could liff.login() but let's just allow normal booking
      }
    }).catch(err => console.error('LIFF Init Error:', err));
  }
  // ---------------------------

  // State
  let currentUserLineId = null;
  const state = {
    step: 1,
    selectedMenus: [],
      price: 0,
    duration: 0,
    staff: null,
    staffName: '',
    date: null,
    time: null,
  };

  let menus = [];
  let staffs = [];
  let bookings = [];

  // Elements
  const steps = [
    document.getElementById('step-1'),
    document.getElementById('step-2'),
    document.getElementById('step-3'),
    document.getElementById('step-4'),
    document.getElementById('step-success')
  ];
  const stepperItems = document.querySelectorAll('.step');
  const btnNext1 = document.getElementById('btn-next-1');
  const btnNext2 = document.getElementById('btn-next-2');
  const btnPrev2 = document.getElementById('btn-prev-2');
  const btnPrev3 = document.getElementById('btn-prev-3');
  const btnNext3 = document.getElementById('btn-next-3');
  const btnPrev4 = document.getElementById('btn-prev-4');
  const form = document.getElementById('booking-form');

  const fetchAndRefreshData = () => {
    fetch(`${GAS_URL}?action=getInitialData&menuSheet=2&t=${Date.now()}`)
    .then(res => res.json())
    .then(result => {
      if(result.success) {
        menus = result.data.menus.map(m => { const v = Object.values(m); return { id: v[0], name: v[1], duration: parseInt(v[2]), price: v[3] }; });
        staffs = result.data.staffs.map(s => { const v = Object.values(s); return { id: v[0], name: v[1] }; });
        bookings = result.data.bookings.map(b => { 
  const v = Object.values(b); 
  let rawType = String(v[9]);
  let mappedType = rawType;
  if(rawType.includes("予約") || rawType === "booked") mappedType = "booked";
  if(rawType.includes("休み") || rawType === "blocked") mappedType = "blocked";
  if(rawType.includes("キャンセル")) mappedType = "cancelled";
      let dateStr = String(v[1]);
    if (dateStr.includes('T')) {
        const dt = new Date(dateStr);
        const y = dt.getFullYear();
        const m = String(dt.getMonth() + 1).padStart(2, '0');
        const d = String(dt.getDate()).padStart(2, '0');
        dateStr = y + '-' + m + '-' + d;
    } else {
        dateStr = dateStr.substring(0, 10).replace(/\//g, '-');
    }
    return { id: v[0], date: dateStr, startTime: formatGasTime(String(v[2])), duration: parseInt(v[3]), staff: v[4], type: mappedType }; }).filter(b => b.type !== "cancelled");

        localStorage.setItem('hr_menus', JSON.stringify(menus));
        localStorage.setItem('hr_staffs', JSON.stringify(staffs));
        localStorage.setItem('hr_bookings', JSON.stringify(bookings));
        localStorage.setItem('hr_last_fetch', Date.now());

        renderMenus();
      }
    });
  };

  const loadLocalData = () => {
    try {
      const localMenus = localStorage.getItem("hr_menus");
      const localStaffs = localStorage.getItem("hr_staffs");
      const localBookings = localStorage.getItem("hr_bookings");
      if (localMenus && localStaffs && localBookings) {
        menus = JSON.parse(localMenus);
        staffs = JSON.parse(localStaffs);
        bookings = JSON.parse(localBookings);
        renderMenus();
      }
    } catch(e) {
      console.error("Local data parse error", e);
      localStorage.clear();
    }
  };

  loadLocalData();
  fetchAndRefreshData();

  // Navigation
  const goToStep = (newStep) => {
    steps.forEach((el, index) => {
      if (index + 1 === newStep) {
        el.classList.remove('d-none');
      } else {
        el.classList.add('d-none');
      }
    });

    stepperItems.forEach((el, index) => {
      if (index + 1 < newStep) {
        el.className = 'step completed';
      } else if (index + 1 === newStep) {
        el.className = 'step active';
      } else {
        el.className = 'step';
      }
    });
    
    state.step = newStep;
    window.scrollTo(0, 0);

    if (newStep === 3) {
      renderCalendar();
    }
    if (newStep === 4) {
      updateConfirmation();
    }
  };

  // Step 1: Menus
  const renderMenus = () => {
    const list = document.getElementById('menu-list');
    if(!list) return;
    list.innerHTML = '';
    
    // Hide loading indicator if it exists (though innerHTML='' removes it anyway)
    
    menus.forEach(m => {
      const item = document.createElement('div');
      item.className = 'selection-card';
      item.dataset.id = m.id;
      
      let priceStr = m.price ? String(m.price) : '0';
      const priceNum = parseInt(priceStr.replace(/[^0-9]/g, ''), 10) || 0;
      
      item.innerHTML = `
        <div class="name">${m.name}</div>
      `;
      
      item.addEventListener('click', () => {
        const isSelected = item.classList.contains('selected');
        if (isSelected) {
          item.classList.remove('selected');
          state.selectedMenus = state.selectedMenus.filter(sm => sm.id !== m.id);
        } else {
          item.classList.add('selected');
          state.selectedMenus.push({ ...m, priceNum });
        }
        
        let totalDuration = 0;
        let totalPrice = 0;
        state.selectedMenus.forEach(sm => {
          totalDuration += sm.duration;
          totalPrice += sm.priceNum;
        });
        
        state.duration = totalDuration;
        state.price = totalPrice;
        
        const footer = document.getElementById('menu-footer');
        const durationEl = document.getElementById('total-duration');
        const priceEl = document.getElementById('total-price');
        const nextBtn = document.getElementById('btn-next-1');
        
        if (state.selectedMenus.length > 0) {
          footer.classList.remove('d-none');
          durationEl.innerText = totalDuration;
          priceEl.innerText = '¥' + totalPrice.toLocaleString();
          nextBtn.classList.remove('btn-disabled');
          nextBtn.disabled = false;
        } else {
          footer.classList.add('d-none');
          nextBtn.classList.add('btn-disabled');
          nextBtn.disabled = true;
        }
      });
      list.appendChild(item);
    });
  };

  btnNext1.addEventListener('click', () => {
    renderStaffs();
    goToStep(2);
  });

  // Step 2: Staff
  const renderStaffs = () => {
    const grid = document.getElementById('staff-grid');
    grid.innerHTML = '';

    const noneCard = document.createElement('div');
    noneCard.className = 'selection-card';
    noneCard.dataset.staff = 'any';
    noneCard.innerHTML = `
      <div class="name">指名なし</div>
      <div class="duration">どのスタッフでもOK</div>
    `;
    noneCard.addEventListener('click', () => selectStaff(noneCard, 'any', '指名なし'));
    grid.appendChild(noneCard);

    staffs.forEach(s => {
      const card = document.createElement('div');
      card.className = 'selection-card';
      card.dataset.staff = s.id;
      card.innerHTML = `<div class="name">${s.name}</div>`;
      card.addEventListener('click', () => selectStaff(card, s.id, s.name));
      grid.appendChild(card);
    });
  };

  const selectStaff = (cardEl, id, name) => {
    document.getElementById('staff-grid').querySelectorAll('.selection-card').forEach(c => c.classList.remove('selected'));
    cardEl.classList.add('selected');
    state.staff = id;
    state.staffName = name;
    btnNext2.classList.remove('btn-disabled');
    btnNext2.disabled = false;
    
    setTimeout(() => {
      btnNext2.scrollIntoView({ behavior: 'smooth', block: 'end' });
    }, 50);
  };

  btnNext2.addEventListener('click', () => goToStep(3));
  btnPrev2.addEventListener('click', () => goToStep(1));

  // Step 3: Calendar & Time
  let currentMonth = new Date().getMonth();
  let currentYear = new Date().getFullYear();
  
  const renderCalendar = () => {
    const calendarGrid = document.querySelector('.calendar-grid');
    const oldDays = calendarGrid.querySelectorAll('.calendar-day, .calendar-empty');
    oldDays.forEach(day => day.remove());

    const firstDay = new Date(currentYear, currentMonth, 1).getDay();
    const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
    
    document.getElementById('calendar-month-year').innerText = `${currentYear}年 ${currentMonth + 1}月`;

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
      const isMonday = thisDate.getDay() === 1; // 1 is Monday
      
      if (thisDate < today || isMonday) {
        dayEl.classList.add('disabled');
      } else {
        dayEl.addEventListener('click', () => {
          document.querySelectorAll('.calendar-day').forEach(d => d.classList.remove('selected'));
          dayEl.classList.add('selected');
          state.date = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(i).padStart(2, '0')}`;
          renderTimeSlots(thisDate);
          
          setTimeout(() => {
            document.getElementById('time-selection').scrollIntoView({ behavior: 'smooth', block: 'nearest' });
          }, 50);
        });
      }
      
      calendarGrid.appendChild(dayEl);
    }
  };

  document.getElementById('btn-prev-month').addEventListener('click', () => {
    currentMonth--;
    if (currentMonth < 0) { currentMonth = 11; currentYear--; }
    renderCalendar();
  });
  document.getElementById('btn-next-month').addEventListener('click', () => {
    currentMonth++;
    if (currentMonth > 11) { currentMonth = 0; currentYear++; }
    renderCalendar();
  });

  function timeToMinutes(timeStr) {
    if(!timeStr || typeof timeStr !== 'string') return 0;
    const [h, m] = timeStr.split(':').map(Number);
    return h * 60 + m;
  }

  const renderTimeSlots = (dateObj) => {
    document.getElementById('time-selection').classList.remove('d-none');
    document.getElementById('selected-date-display').innerText = `${dateObj.getMonth() + 1}月${dateObj.getDate()}日 の空き時間`;
    
    const container = document.getElementById('time-slots-container');
    container.innerHTML = '';
    
    const isWeekend = dateObj.getDay() === 0 || dateObj.getDay() === 6;
    let startHour = 9;
    let startMin = isWeekend ? 0 : 30;
    
    const startMins = startHour * 60 + startMin;
    const endMins = 18 * 60;
    const slotMins = 30;

    const dateStr = state.date;
    const bookingsToday = bookings.filter(b => b.date === dateStr);
    
    const requiredDuration = state.duration;
    const requestedStaff = state.staff;

    for(let m = startMins; m <= endMins; m += slotMins) {
      if (m === endMins) continue;
      
      const h = Math.floor(m / 60);
      const min = m % 60;
      const timeString = `${String(h).padStart(2, '0')}:${String(min).padStart(2, '0')}`;
      
      let canBook = false;
      const staffList = requestedStaff === 'any' ? staffs.map(s=>s.id) : [requestedStaff];
      
      for (const st of staffList) {
        const numDaySlots = (19 * 60 - 9 * 60) / slotMins;
        const isFree = new Array(Math.ceil(numDaySlots)).fill(true);
        
        bookingsToday.filter(b => b.staff === st).forEach(b => {
          const bStart = timeToMinutes(b.startTime);
          const startIndex = (bStart - 9 * 60) / slotMins;
          const slotsNeeded = b.duration / slotMins;
          for (let i = startIndex; i < startIndex + slotsNeeded; i++) {
            if (i >= 0 && i < isFree.length) isFree[Math.floor(i)] = false;
          }
        });

        const targetIndex = (m - 9 * 60) / slotMins;
        const requiredSlots = requiredDuration / slotMins;
        
        let staffCanDoIt = true;
        for (let j = 0; j < requiredSlots; j++) {
          if (targetIndex + j >= isFree.length || !isFree[targetIndex + j]) {
            staffCanDoIt = false;
            break;
          }
        }
        
        if (staffCanDoIt) {
          canBook = true;
          break;
        }
      }
      
      const slotEl = document.createElement('div');
      slotEl.className = 'time-slot';
      slotEl.innerText = timeString;
      
      if (!canBook) {
        slotEl.classList.add('disabled');
      } else {
        slotEl.addEventListener('click', () => {
          document.querySelectorAll('.time-slot').forEach(s => s.classList.remove('selected'));
          slotEl.classList.add('selected');
          state.time = timeString;
          btnNext3.classList.remove('btn-disabled');
          btnNext3.disabled = false;
          
          setTimeout(() => {
            btnNext3.scrollIntoView({ behavior: 'smooth', block: 'end' });
          }, 50);
        });
      }
      
      container.appendChild(slotEl);
    }
  };

  btnNext3.addEventListener('click', () => goToStep(4));
  btnPrev3.addEventListener('click', () => goToStep(2));

  // Step 4: Confirmation
  const updateConfirmation = () => {
    const daysOfWeek = ['日', '月', '火', '水', '木', '金', '土'];
    const d = new Date(state.date);
    const dow = daysOfWeek[d.getDay()];
    const formattedDate = state.date.replace(/-/g, '/') + `(${dow})`;

    document.getElementById('confirm-menu').innerText = state.selectedMenus.map(m => m.name).join(' + ');
    document.getElementById('confirm-staff').innerText = state.staffName;
    document.getElementById('confirm-datetime').innerText = `${formattedDate} ${state.time}～`;
  };

  btnPrev4.addEventListener('click', () => goToStep(3));
  
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const submitBtn = form.querySelector('button[type="submit"]');
    submitBtn.innerText = '予約処理中...';
    submitBtn.disabled = true;
    submitBtn.classList.add('btn-disabled');
    
    let finalStaffId = state.staff;
    if (state.staff === 'any') {
      const m = timeToMinutes(state.time);
      const targetIndex = (m - 9 * 60) / 30;
      const requiredSlots = state.duration / 30;
      const bookingsToday = bookings.filter(b => b.date === state.date);
      
      for (const st of staffs) {
        const numDaySlots = (19 * 60 - 9 * 60) / 30;
        const isFree = new Array(Math.ceil(numDaySlots)).fill(true);
        bookingsToday.filter(b => b.staff === st.id).forEach(b => {
          const bStart = timeToMinutes(b.startTime);
          const startIndex = (bStart - 9 * 60) / 30;
          for (let i = startIndex; i < startIndex + (b.duration/30); i++) {
            if (i >= 0 && i < isFree.length) isFree[Math.floor(i)] = false;
          }
        });
        
        let staffCanDoIt = true;
        for (let j = 0; j < requiredSlots; j++) {
          if (targetIndex + j >= isFree.length || !isFree[targetIndex + j]) {
            staffCanDoIt = false;
            break;
          }
        }
        
        if (staffCanDoIt) {
          finalStaffId = st.id;
          break;
        }
      }
    }

    const days = ['日', '月', '火', '水', '木', '金', '土'];
    const dt = new Date(state.date.replace(/-/g, '/'));
    const dateWithDay = state.date + '(' + days[dt.getDay()] + ')';

    const payload = {
      date: dateWithDay,
      startTime: state.time,
      duration: state.duration,
      staff: finalStaffId,
      name: document.getElementById('user-name').value,
      phone: document.getElementById('user-phone').value,
      email: document.getElementById('user-email').value,
      memo: document.getElementById('user-memo').value,
      menu: state.selectedMenus.map(m => m.name).join(' + '),
        lineUserId: currentUserLineId,
      type: '予約'
    };

    fetch(GAS_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({ action: 'createBooking', payload })
    })
    .then(res => res.json())
    .then(result => {
      if(result.success) {
                  goToStep(5);
          if (typeof liff !== 'undefined' && liff.isLoggedIn() && result.data && result.data.bookingId) {
            liff.sendMessages([{
              type: 'text',
              text: '\u7F8E\u5BB9\u5BA4HR \u4E88\u7D04'
            }]).catch(err => console.error('LIFF sendMessage Error:', err));
          }
      } else {
        alert('予約エラー: ' + result.error);
        submitBtn.innerText = '予約確定';
        submitBtn.disabled = false;
        submitBtn.classList.remove('btn-disabled');
      }
    })
    .catch(err => {
      alert('通信エラーが発生しました: ' + err.message);
      submitBtn.innerText = '予約確定';
      submitBtn.disabled = false;
      submitBtn.classList.remove('btn-disabled');
    });
  });
});






