// app.js
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

  // Elements
  const steps = [
    document.getElementById('step-1'),
    document.getElementById('step-2'),
    document.getElementById('step-3'),
    document.getElementById('step-4'),
    document.getElementById('step-success')
  ];
  const stepperItems = document.querySelectorAll('.step');
  
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
  const menuCards = document.querySelectorAll('#menu-grid .selection-card');
  const btnNext1 = document.getElementById('btn-next-1');
  menuCards.forEach(card => {
    card.addEventListener('click', () => {
      menuCards.forEach(c => c.classList.remove('selected'));
      card.classList.add('selected');
      state.menu = card.dataset.menu;
      state.menuName = card.querySelector('.selection-title').innerText;
      state.duration = parseInt(card.dataset.time);
      btnNext1.classList.remove('btn-disabled');
      btnNext1.disabled = false;
    });
  });
  btnNext1.addEventListener('click', () => goToStep(2));

  // Step 2: Staff
  const staffCards = document.querySelectorAll('#staff-grid .selection-card');
  const btnNext2 = document.getElementById('btn-next-2');
  const btnPrev2 = document.getElementById('btn-prev-2');
  staffCards.forEach(card => {
    card.addEventListener('click', () => {
      staffCards.forEach(c => c.classList.remove('selected'));
      card.classList.add('selected');
      state.staff = card.dataset.staff;
      state.staffName = card.querySelector('.selection-title').innerText;
      btnNext2.classList.remove('btn-disabled');
      btnNext2.disabled = false;
    });
  });
  btnNext2.addEventListener('click', () => goToStep(3));
  btnPrev2.addEventListener('click', () => goToStep(1));

  // Step 3: Calendar & Time (Mocked)
  const btnPrev3 = document.getElementById('btn-prev-3');
  const btnNext3 = document.getElementById('btn-next-3');
  
  let currentMonth = new Date().getMonth();
  let currentYear = new Date().getFullYear();
  
  const renderCalendar = () => {
    const calendarGrid = document.querySelector('.calendar-grid');
    // Remove old days
    const oldDays = calendarGrid.querySelectorAll('.calendar-day');
    oldDays.forEach(day => day.remove());

    const firstDay = new Date(currentYear, currentMonth, 1).getDay();
    const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
    
    document.getElementById('current-month-year').innerText = `${currentYear}年 ${currentMonth + 1}月`;

    // Empty spots for first row
    for (let i = 0; i < firstDay; i++) {
      const empty = document.createElement('div');
      calendarGrid.appendChild(empty);
    }

    // Days
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
          
          // 自動で時間選択部分へスクロール
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

  const renderTimeSlots = (dateObj) => {
    document.getElementById('time-selection').classList.remove('d-none');
    document.getElementById('selected-date-display').innerText = `${dateObj.getMonth() + 1}月${dateObj.getDate()}日 の空き時間`;
    
    const container = document.getElementById('time-slots-container');
    container.innerHTML = '';
    
    const isWeekend = dateObj.getDay() === 0 || dateObj.getDay() === 6;
    let startHour = isWeekend ? 9 : 9;
    let startMin = isWeekend ? 0 : 30; // Weekdays 9:30, Weekends 9:00
    
    // Generate mock slots up to 18:00
    for(let h = startHour; h <= 18; h++) {
      for(let m = (h===startHour ? startMin : 0); m < 60; m+=30) {
        if (h === 18 && m > 0) continue; // Last slot starts at 18:00
        
        const timeString = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
        const slotEl = document.createElement('div');
        slotEl.className = 'time-slot';
        slotEl.innerText = timeString;
        
        // Randomly mock some booked slots
        if (Math.random() > 0.7) {
          slotEl.classList.add('disabled');
        } else {
          slotEl.addEventListener('click', () => {
            document.querySelectorAll('.time-slot').forEach(s => s.classList.remove('selected'));
            slotEl.classList.add('selected');
            state.time = timeString;
            btnNext3.classList.remove('btn-disabled');
            btnNext3.disabled = false;
          });
        }
        
        container.appendChild(slotEl);
      }
    }
  };

  btnNext3.addEventListener('click', () => goToStep(4));
  btnPrev3.addEventListener('click', () => goToStep(2));

  // Step 4: Confirmation
  const btnPrev4 = document.getElementById('btn-prev-4');
  const form = document.getElementById('booking-form');

  const updateConfirmation = () => {
    document.getElementById('confirm-menu').innerText = state.menuName;
    document.getElementById('confirm-staff').innerText = state.staffName;
    document.getElementById('confirm-datetime').innerText = `${state.date} ${state.time}`;
  };

  btnPrev4.addEventListener('click', () => goToStep(3));
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    // Simulate API call to GAS
    const submitBtn = form.querySelector('button[type="submit"]');
    submitBtn.innerText = '予約処理中...';
    submitBtn.disabled = true;
    submitBtn.classList.add('btn-disabled');
    
    setTimeout(() => {
      goToStep(5);
    }, 1000);
  });
});
