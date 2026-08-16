// app.js
const GAS_URL = 'https://script.google.com/macros/s/AKfycbwcQIx5rmTuZ60bihVUvvGLdnaco5XgT60qN-mQO6QDAZIXdgIVZ-d5mkjODq-QTlzb/exec';

document.addEventListener('DOMContentLoaded', () => {
  // State
  const state = {
    step: 1,
    menu: null,
    menuName: '',
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

  // Fetch Data
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
        bookings = result.data.bookings.map(b => ({
          id: b['予約ID'],
          date: String(b['予約日']).substring(0, 10),
          startTime: String(b['開始時間']).padStart(5, '0').substring(0, 5),
          duration: parseInt(b['所要時間(分)']),
          staff: b['担当スタッフ'],
          type: b['予約状況']
        }));

        renderMenus();
        renderStaffs();
      } else {
        alert('データ取得エラー: ' + result.error);
        document.getElementById('menu-grid').innerHTML = '<div style="grid-column: 1/-1; text-align: center; color: red;">データの読み込みに失敗しました。</div>';
      }
    })
    .catch(e => {
      alert('通信エラー: ' + e.message);
      document.getElementById('menu-grid').innerHTML = '<div style="grid-column: 1/-1; text-align: center; color: red;">通信エラーが発生しました。</div>';
    });

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
        el.classList.add('completed');
        el.classList.remove('active');
      } else if (index + 1 === newStep) {
        el.classList.add('active');
        el.classList.remove('completed');
      } else {
        el.classList.remove('active', 'completed');
      }
    });
    
    state.step = newStep;
    window.scrollTo(0, 0);

    if (newStep === 3) {
      renderCalendar();
    } else if (newStep === 4) {
      updateConfirmation();
    }
  };

  // Step 1: Menu
  const renderMenus = () => {
    const grid = document.getElementById('menu-grid');
    grid.innerHTML = '';
    
    menus.forEach(menu => {
      const card = document.createElement('div');
      card.className = 'selection-card';
      card.dataset.menu = menu.id;
      card.dataset.time = menu.duration;
      
      let priceText = '';
      if (menu.price) {
        // 数字のみ入力された場合でも自動でカンマと「円」をつける
        const numericPrice = parseInt(menu.price.toString().replace(/[^0-9]/g, ''), 10);
        if (!isNaN(numericPrice)) {
          priceText = ` / ${numericPrice.toLocaleString()}円`;
        } else {
          priceText = ` / ${menu.price}円`; // 万が一数字以外が入った場合のフォールバック
        }
      }
      
      card.innerHTML = `
        <div class="selection-title">${menu.name}</div>
        <div class="selection-desc">約${menu.duration}分${priceText}</div>
      `;
      
      card.addEventListener('click', () => {
        grid.querySelectorAll('.selection-card').forEach(c => c.classList.remove('selected'));
        card.classList.add('selected');
        state.menu = menu.id;
        state.menuName = menu.name;
        state.duration = menu.duration;
        btnNext1.classList.remove('btn-disabled');
        btnNext1.disabled = false;
      });
      
      grid.appendChild(card);
    });
  };

  btnNext1.addEventListener('click', () => goToStep(2));

  // Step 2: Staff
  const renderStaffs = () => {
    const grid = document.getElementById('staff-grid');
    grid.innerHTML = '';

    const noneCard = document.createElement('div');
    noneCard.className = 'selection-card';
    noneCard.dataset.staff = 'any';
    noneCard.innerHTML = `
      <div class="selection-title">指名なし</div>
      <div class="selection-desc">どのスタッフでもOK</div>
    `;
    noneCard.addEventListener('click', () => handleStaffSelect(noneCard, 'any', '指名なし'));
    grid.appendChild(noneCard);

    staffs.forEach(staff => {
      const card = document.createElement('div');
      card.className = 'selection-card';
      card.dataset.staff = staff.id;
      card.innerHTML = `
        <div class="selection-title">${staff.name}</div>
      `;
      card.addEventListener('click', () => handleStaffSelect(card, staff.id, staff.name));
      grid.appendChild(card);
    });
  };

  const handleStaffSelect = (card, staffId, staffName) => {
    const grid = document.getElementById('staff-grid');
    grid.querySelectorAll('.selection-card').forEach(c => c.classList.remove('selected'));
    card.classList.add('selected');
    state.staff = staffId;
    state.staffName = staffName;
    btnNext2.classList.remove('btn-disabled');
    btnNext2.disabled = false;
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
    
    document.getElementById('current-month-year').innerText = `${currentYear}年 ${currentMonth + 1}月`;

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
    let startMin = isWeekend ? 0 : 30; // 平日は9:30、休日は9:00スタートなど独自のルールがあればここ
    
    const startMins = startHour * 60 + startMin;
    const endMins = 18 * 60; // Up to 18:00
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
    const formattedDate = state.date.replace(/-/g, '/') + `（${dow}）`;

    document.getElementById('confirm-menu').innerText = state.menuName;
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
    
    // Pick an available staff if "any" was selected
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

    const payload = {
      date: state.date,
      startTime: state.time,
      duration: state.duration,
      staff: finalStaffId,
      name: document.getElementById('user-name').value,
      phone: document.getElementById('user-phone').value,
      email: document.getElementById('user-email').value,
      menu: state.menuName,
      type: 'booked'
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
      } else {
        alert('予約エラー: ' + result.error);
        submitBtn.innerText = '予約を確定';
        submitBtn.disabled = false;
        submitBtn.classList.remove('btn-disabled');
      }
    })
    .catch(err => {
      alert('通信エラーが発生しました: ' + err.message);
      submitBtn.innerText = '予約を確定';
      submitBtn.disabled = false;
      submitBtn.classList.remove('btn-disabled');
    });
  });
});
