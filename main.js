/* ════════════ SLOO — main.js ════════════ */

/* ── 미션 데이터 ── */
const MISSIONS = {
  gym: [
    "운동복만 갈아입기",
    "운동복 입고 현관까지",
    "집 근처 5분 산책",
    "헬스장 입구까지만",
    "헬스장 들어가서 15분",
    "헬스장 30분",
    "헬스장 1시간"
  ],
  hometraining: [
    "운동복만 갈아입기",
    "매트 꺼내서 펼치기",
    "스트레칭 3분",
    "유튜브 홈트 영상 틀어놓기",
    "홈트 10분",
    "홈트 20분",
    "홈트 30분"
  ],
  walking: [
    "운동화 꺼내놓기",
    "운동복 입고 현관까지",
    "집 앞 5분 걷기",
    "동네 한 바퀴 (10분)",
    "20분 걷기",
    "30분 걷기 or 10분 달리기",
    "5km"
  ]
};

/* ── 에너지×멘탈 미션 (수면/루틴) ── */
const ENERGY_MISSIONS = {
  'low-low':   "창문 열고 바깥 1분 바라보기",
  'low-mid':   "물 한 잔 천천히 마시기",
  'low-high':  "오늘 딱 한 가지만 적어보기",
  'mid-low':   "5분 산책 또는 스트레칭",
  'mid-mid':   "가장 중요한 일 25분 집중",
  'mid-high':  "오늘 배운 것 3줄 기록",
  'high-low':  "몸 먼저 — 10분 가볍게 움직이기",
  'high-mid':  "가장 미뤄온 일 시작하기",
  'high-high': "새로운 루틴 하나 추가해보기"
};

/* ── 공감 메시지 ── */
const EMPATHY_MSGS = [
  "며칠 잘 하다 무너졌어도 괜찮아. 오늘 이 미션 하나면 1%야.",
  "하루가 아무리 바빠도 이 미션은 30초야. 그게 오늘의 1%.",
  "오늘 하루가 망했어도 괜찮아. 이 미션 하나로 1%는 지켜.",
  "귀찮은 하루가 맞아. 그래도 이것만. 30초면 돼."
];

/* ── localStorage 헬퍼 ── */
const LS = {
  get: k => localStorage.getItem(k),
  set: (k, v) => localStorage.setItem(k, String(v)),
  getInt: (k, def) => { const v = localStorage.getItem(k); return v !== null ? parseInt(v) : (def !== undefined ? def : 0); }
};

function today() {
  return new Date().toISOString().slice(0, 10);
}

/* ── 화면 전환 ── */
function showScreen(id) {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  document.getElementById(id).classList.add('active');
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

/* ── 성장 헬퍼 ── */
function multStr(days) {
  return Math.pow(1.01, days).toFixed(2);
}
function getGrowthMsg(days) {
  if (days >= 365) return "1년. 37.78배. 말이 필요 없어.";
  if (days >= 100) return "100일. 2.70배. 진짜 달라졌어.";
  if (days >= 30)  return "한 달. 이제 습관이 되고 있어.";
  if (days >= 7)   return "일주일 됐어. 1.07배의 너야.";
  return "첫 번째 1%. 시작이 전부야.";
}
function getPlantIcon(days) {
  if (days >= 101) return "🌲";
  if (days >= 31)  return "🌳";
  if (days >= 8)   return "🌿";
  return "🌱";
}

/* ── 운동 미션 가져오기 ── */
function getExerciseMission(type, level) {
  const arr = MISSIONS[type];
  if (!arr) return '';
  return arr[Math.min(level - 1, 6)];
}

/* ════════════════════════
   앱 진입점
════════════════════════ */
function init() {
  const category = LS.get('sloo_category');
  if (!category) {
    showScreen('screen-landing');
    return;
  }

  const lastDate = LS.get('sloo_last_date');
  const days = LS.getInt('sloo_days', 0);

  if (lastDate === today()) {
    showDoneToday();
    return;
  }

  if (days === 0) {
    // 온보딩은 마쳤지만 완료 이력 없음 → 첫 미션
    showFirstMission();
    return;
  }

  // 2일차+
  if (category === 'health') {
    showMainChoice();
  } else {
    showDailyState();
  }
}

/* ── 오늘 완료 화면 ── */
function showDoneToday() {
  const days = LS.getInt('sloo_days', 0);
  const level = LS.getInt('sloo_level', 1);
  const el = document.getElementById('screen-done-today');
  el.querySelector('.done-today-plant').textContent = getPlantIcon(days);
  el.querySelector('.done-today-days').textContent = days + '일째';
  el.querySelector('.done-today-mult').textContent = multStr(days) + '배';
  el.querySelector('.done-today-level').textContent = level;
  showScreen('screen-done-today');
}

/* ── 첫 미션 화면 ── */
function showFirstMission() {
  const category = LS.get('sloo_category');
  const type = LS.get('sloo_type');
  const reason = LS.getInt('sloo_fail_reason', 0);
  let missionText;
  if (category === 'health') {
    missionText = getExerciseMission(type, 1);
  } else {
    const energy = LS.get('sloo_energy') || 'mid';
    const mental = LS.get('sloo_mental') || 'mid';
    missionText = ENERGY_MISSIONS[energy + '-' + mental] || '';
  }
  document.getElementById('first-empathy-msg').textContent = EMPATHY_MSGS[reason] || EMPATHY_MSGS[0];
  document.getElementById('first-mission-text').textContent = missionText;
  document.getElementById('first-result-msg').textContent = '';
  document.getElementById('first-result-msg').className = 'result-msg';
  document.getElementById('first-growth-card').classList.remove('show');
  document.getElementById('first-action-btns').style.display = '';
  showScreen('screen-first-mission');
}

/* ── 2일차+ A/B 선택 화면 (운동) ── */
function showMainChoice() {
  const type = LS.get('sloo_type');
  const days = LS.getInt('sloo_days', 0);
  const level = LS.getInt('sloo_level', 1);
  const el = document.getElementById('screen-main');
  el.querySelector('.main-days').textContent = days;
  el.querySelector('.main-mult').textContent = multStr(days);
  el.querySelector('.main-level').textContent = level;

  const currentMission = getExerciseMission(type, level);
  const nextMission = level < 7 ? getExerciseMission(type, level + 1) : '최고 레벨! 다음 카테고리를 추가해봐';

  el.querySelector('.card-grow-preview').textContent = nextMission;
  el.querySelector('.card-maintain-preview').textContent = currentMission;

  // 레벨 7이면 성장 카드 텍스트 교체
  const aCard = document.getElementById('choice-a-card');
  if (level >= 7) {
    aCard.querySelector('.ab-card-title').textContent = '최고 레벨 달성 🏆';
    aCard.querySelector('.ab-badge').textContent = '완성';
  } else {
    aCard.querySelector('.ab-card-title').textContent = '오늘 1% 더 성장할래?';
    aCard.querySelector('.ab-badge').textContent = '성장';
  }

  showScreen('screen-main');
}

/* ── 수면·루틴 재방문 상태 선택 화면 ── */
function showDailyState() {
  const days = LS.getInt('sloo_days', 0);
  const el = document.getElementById('screen-daily-state');
  el.querySelector('.daily-days').textContent = days;
  el.querySelector('.daily-mult').textContent = multStr(days);
  // 이전 선택 초기화
  document.querySelectorAll('.state-opt2').forEach(o => o.classList.remove('active'));
  dailySelections.energy = null;
  dailySelections.mental = null;
  document.getElementById('btn-daily-mission').disabled = true;
  showScreen('screen-daily-state');
}

/* ── 미션 화면 표시 (A/B 선택 후) ── */
let currentChoice = null;

function showMissionScreen(choice) {
  currentChoice = choice;
  const type = LS.get('sloo_type');
  const level = LS.getInt('sloo_level', 1);
  const reason = LS.getInt('sloo_fail_reason', 0);

  let missionText;
  if (choice === 'grow') {
    missionText = level < 7 ? getExerciseMission(type, level + 1) : getExerciseMission(type, 7);
  } else {
    missionText = getExerciseMission(type, level);
  }

  document.getElementById('mission-empathy').textContent = EMPATHY_MSGS[reason] || EMPATHY_MSGS[0];
  document.getElementById('mission-text').textContent = missionText;

  const badge = document.getElementById('mission-choice-badge');
  badge.textContent = choice === 'grow' ? '🌱 성장 모드' : '🔄 유지 모드';
  badge.className = 'mission-badge ' + (choice === 'grow' ? 'grow' : 'maintain');

  document.getElementById('mission-result').textContent = '';
  document.getElementById('mission-result').className = 'result-msg';
  document.getElementById('mission-growth-card').classList.remove('show');
  document.getElementById('mg-max-level').style.display = 'none';
  document.getElementById('mission-action-btns').style.display = '';

  showScreen('screen-mission');
}

/* ════════════════════════
   이벤트 리스너
════════════════════════ */

/* 랜딩 → 온보딩1 */
document.getElementById('btn-start').addEventListener('click', () => {
  showScreen('screen-ob1');
});

/* 온보딩1: 카테고리 선택 */
document.querySelectorAll('.ob1-card').forEach(card => {
  card.addEventListener('click', () => {
    LS.set('sloo_category', card.dataset.val);
    document.querySelectorAll('.ob1-card').forEach(c => c.classList.remove('selected'));
    card.classList.add('selected');
    setTimeout(() => {
      if (card.dataset.val === 'health') {
        showScreen('screen-ob2-exercise');
      } else {
        // 수면/루틴: 실패이유 (2/3)
        document.getElementById('reason-step-text').textContent = '2 / 3';
        document.getElementById('reason-step-fill').style.width = '66%';
        showScreen('screen-ob-reason');
      }
    }, 280);
  });
});

/* 온보딩2 (운동): 운동 종류 선택 */
document.querySelectorAll('.ob2ex-card').forEach(card => {
  card.addEventListener('click', () => {
    LS.set('sloo_type', card.dataset.val);
    document.querySelectorAll('.ob2ex-card').forEach(c => c.classList.remove('selected'));
    card.classList.add('selected');
    // 운동: 실패이유 (3/3)
    setTimeout(() => {
      document.getElementById('reason-step-text').textContent = '3 / 3';
      document.getElementById('reason-step-fill').style.width = '100%';
      showScreen('screen-ob-reason');
    }, 280);
  });
});

/* 온보딩: 실패 이유 선택 */
document.querySelectorAll('.reason-card').forEach(card => {
  card.addEventListener('click', () => {
    LS.set('sloo_fail_reason', parseInt(card.dataset.val));
    document.querySelectorAll('.reason-card').forEach(c => c.classList.remove('selected'));
    card.classList.add('selected');
    const category = LS.get('sloo_category');
    setTimeout(() => {
      if (category === 'health') {
        LS.set('sloo_level', 1);
        showFirstMission();
      } else {
        // 수면/루틴 → 에너지/멘탈
        showScreen('screen-ob-state');
      }
    }, 280);
  });
});

/* 온보딩: 에너지/멘탈 (수면/루틴 전용) */
const obSelections = { energy: null, mental: null };
document.querySelectorAll('.state-group').forEach(group => {
  group.querySelectorAll('.state-opt').forEach(opt => {
    opt.addEventListener('click', () => {
      group.querySelectorAll('.state-opt').forEach(o => o.classList.remove('active'));
      opt.classList.add('active');
      obSelections[group.dataset.group] = opt.dataset.val;
      document.getElementById('btn-get-mission').disabled = !(obSelections.energy && obSelections.mental);
    });
  });
});

document.getElementById('btn-get-mission').addEventListener('click', () => {
  LS.set('sloo_energy', obSelections.energy);
  LS.set('sloo_mental', obSelections.mental);
  LS.set('sloo_level', 1);
  showFirstMission();
});

/* ── 첫 미션: 완료 ── */
document.getElementById('btn-first-done').addEventListener('click', () => {
  const days = LS.getInt('sloo_days', 0) + 1;
  LS.set('sloo_days', days);
  LS.set('sloo_last_date', today());

  const msg = document.getElementById('first-result-msg');
  msg.innerHTML = `오늘 1% 완료 🌱<br><small>${days}일째. 1.01<sup>${days}</sup> = ${multStr(days)}배의 당신.</small>`;
  msg.className = 'result-msg done-msg show';

  const gc = document.getElementById('first-growth-card');
  document.getElementById('fg-plant').textContent = getPlantIcon(days);
  document.getElementById('fg-days').textContent = `당신은 ${days}일째입니다`;
  document.getElementById('fg-formula').innerHTML = `1.01<sup>${days}</sup> = ${multStr(days)}배의 당신입니다`;
  document.getElementById('fg-msg').textContent = getGrowthMsg(days);
  gc.classList.add('show');

  document.getElementById('first-action-btns').style.display = 'none';
});

/* ── 첫 미션: 패스 ── */
document.getElementById('btn-first-pass').addEventListener('click', () => {
  const msg = document.getElementById('first-result-msg');
  msg.textContent = '오늘은 쉬어가도 돼. 내일 다시 켜면 돼.';
  msg.className = 'result-msg pass-msg show';
  document.getElementById('first-action-btns').style.display = 'none';
});

/* ── 메인: A카드 (성장) ── */
document.getElementById('choice-a-card').addEventListener('click', () => {
  showMissionScreen('grow');
});

/* ── 메인: B카드 (유지) ── */
document.getElementById('choice-b-card').addEventListener('click', () => {
  showMissionScreen('maintain');
});

/* ── 미션: 완료 ── */
document.getElementById('btn-mission-done').addEventListener('click', () => {
  const days = LS.getInt('sloo_days', 0) + 1;
  LS.set('sloo_days', days);
  LS.set('sloo_last_date', today());

  let level = LS.getInt('sloo_level', 1);
  if (currentChoice === 'grow' && level < 7) {
    level += 1;
    LS.set('sloo_level', level);
  }

  const levelMsg = currentChoice === 'grow'
    ? (level <= 7 ? `레벨 ${level} 달성! 🎉` : '최고 레벨!')
    : '루틴 유지 완료 ✓';

  const msg = document.getElementById('mission-result');
  msg.innerHTML = `오늘 1% 완료 🌱<br><small>${days}일째. ${multStr(days)}배의 당신. ${levelMsg}</small>`;
  msg.className = 'result-msg done-msg show';

  document.getElementById('mg-plant').textContent = getPlantIcon(days);
  document.getElementById('mg-days').textContent = `당신은 ${days}일째입니다`;
  document.getElementById('mg-formula').innerHTML = `1.01<sup>${days}</sup> = ${multStr(days)}배의 당신입니다`;
  document.getElementById('mg-msg').textContent = getGrowthMsg(days);
  document.getElementById('mission-growth-card').classList.add('show');

  if (level >= 7) {
    document.getElementById('mg-max-level').style.display = '';
  }

  document.getElementById('mission-action-btns').style.display = 'none';
});

/* ── 미션: 패스 ── */
document.getElementById('btn-mission-pass').addEventListener('click', () => {
  const msg = document.getElementById('mission-result');
  msg.textContent = '오늘은 쉬어가도 돼. 내일 다시 켜면 돼.';
  msg.className = 'result-msg pass-msg show';
  document.getElementById('mission-action-btns').style.display = 'none';
});

/* ── 다음 카테고리 추가 ── */
document.getElementById('btn-add-category').addEventListener('click', () => {
  // 운동 기록 유지, 카테고리/타입/레벨 초기화
  localStorage.removeItem('sloo_category');
  localStorage.removeItem('sloo_type');
  localStorage.removeItem('sloo_level');
  localStorage.removeItem('sloo_fail_reason');
  localStorage.removeItem('sloo_energy');
  localStorage.removeItem('sloo_mental');
  // 온보딩1로 이동 (수면/루틴 선택용)
  document.querySelectorAll('.ob1-card, .ob2ex-card, .reason-card').forEach(c => c.classList.remove('selected'));
  showScreen('screen-ob1');
});

/* ── 수면·루틴 재방문: 에너지/멘탈 선택 ── */
const dailySelections = { energy: null, mental: null };
document.querySelectorAll('.state-group2').forEach(group => {
  group.querySelectorAll('.state-opt2').forEach(opt => {
    opt.addEventListener('click', () => {
      group.querySelectorAll('.state-opt2').forEach(o => o.classList.remove('active'));
      opt.classList.add('active');
      dailySelections[group.dataset.group] = opt.dataset.val;
      document.getElementById('btn-daily-mission').disabled = !(dailySelections.energy && dailySelections.mental);
    });
  });
});

document.getElementById('btn-daily-mission').addEventListener('click', () => {
  LS.set('sloo_energy', dailySelections.energy);
  LS.set('sloo_mental', dailySelections.mental);
  const reason = LS.getInt('sloo_fail_reason', 0);
  const key = dailySelections.energy + '-' + dailySelections.mental;
  const missionText = ENERGY_MISSIONS[key] || '';

  document.getElementById('first-empathy-msg').textContent = EMPATHY_MSGS[reason] || EMPATHY_MSGS[0];
  document.getElementById('first-mission-text').textContent = missionText;
  document.getElementById('first-result-msg').textContent = '';
  document.getElementById('first-result-msg').className = 'result-msg';
  document.getElementById('first-growth-card').classList.remove('show');
  document.getElementById('first-action-btns').style.display = '';
  showScreen('screen-first-mission');
});

/* ── 로고 클릭 → init ── */
document.getElementById('nav-logo').addEventListener('click', e => {
  e.preventDefault();
  init();
});

/* ── 초기화 버튼 ── */
document.getElementById('btn-reset').addEventListener('click', () => {
  if (confirm('정말 초기화할까요? 모든 기록이 사라져요.')) {
    const theme = localStorage.getItem('sloo-theme');
    localStorage.clear();
    if (theme) localStorage.setItem('sloo-theme', theme);
    document.querySelectorAll('.choice-card, .option').forEach(c => c.classList.remove('selected', 'active'));
    showScreen('screen-landing');
  }
});

/* ── 테마 ── */
document.getElementById('themeToggle').addEventListener('click', () => {
  document.body.classList.toggle('light');
  const isLight = document.body.classList.contains('light');
  localStorage.setItem('sloo-theme', isLight ? 'light' : 'dark');
  const dc = document.getElementById('disqus_container');
  if (dc) dc.style.colorScheme = isLight ? 'light' : 'dark';
});

if (localStorage.getItem('sloo-theme') === 'light') {
  document.body.classList.add('light');
}

/* ════════════════════════
   실행
════════════════════════ */
init();

/* ════════════════════════
   1% 복리 계산기
════════════════════════ */
(function () {
  const slider   = document.getElementById('calc-slider');
  const numInput = document.getElementById('calc-days-num');
  if (!slider) return;

  const milestones = [
    { day: 7,   text: "일주일. 아직 티가 안 나. 근데 쌓이고 있어." },
    { day: 30,  text: "한 달. 주변이 슬슬 눈치채기 시작해." },
    { day: 66,  text: "습관이 굳어지는 날. 이제 안 하면 어색해." },
    { day: 100, text: "석 달. 3개월 전 너랑 달라." },
    { day: 180, text: "반년. 작년의 너를 기억해?" },
    { day: 365, text: "1년. 매일 1%가 만든 결과." }
  ];

  function getCompareText(days) {
    let result = "시작했어. 이게 전부야.";
    for (const m of milestones) {
      if (days >= m.day) result = m.text;
      else break;
    }
    return result;
  }

  let animFrame = null;
  let currentDisp = 1.35;

  function animateNum(target) {
    if (animFrame) cancelAnimationFrame(animFrame);
    const start = currentDisp;
    const startTime = performance.now();
    const duration = 350;
    function step(now) {
      const p = Math.min((now - startTime) / duration, 1);
      const eased = 1 - Math.pow(1 - p, 3);
      const val = start + (target - start) * eased;
      const fixed = val.toFixed(2);
      document.getElementById('calc-big-num').innerHTML = `${fixed}<span class="calc-times">×</span>`;
      document.getElementById('calc-sentence-mult').textContent = fixed;
      if (p < 1) animFrame = requestAnimationFrame(step);
      else currentDisp = target;
    }
    animFrame = requestAnimationFrame(step);
  }

  function updateCalc(days) {
    days = Math.max(1, Math.min(365, days));
    const mult = Math.pow(1.01, days);
    animateNum(mult);
    document.getElementById('calc-sentence').innerHTML =
      `${days}일 후 당신은 <span id="calc-sentence-mult">${mult.toFixed(2)}</span>배의 당신입니다`;
    document.getElementById('calc-compare').textContent = getCompareText(days);
    const pct = ((days - 1) / 364) * 100;
    slider.style.background = `linear-gradient(90deg, #A78BFA ${pct}%, #67E8F9 ${pct}%, #67E8F9 100%)`;
  }

  slider.addEventListener('input', () => { const d = parseInt(slider.value); numInput.value = d; updateCalc(d); });
  numInput.addEventListener('input', () => { let d = parseInt(numInput.value) || 1; d = Math.max(1, Math.min(365, d)); slider.value = d; updateCalc(d); });
  updateCalc(30);
})();

/* ── 아티클 토글 ── */
function toggleArticle(id, btn) {
  const body = document.getElementById(id);
  const isOpen = body.classList.toggle('open');
  btn.innerText = isOpen ? '접기 ↑' : '더 읽기 ↓';
}

/* ── Disqus ── */
window.disqus_config = function () {
  this.page.url = window.location.href;
  this.page.identifier = 'sloo-main';
};
(function () {
  var d = document, s = d.createElement('script');
  s.src = 'https://product-make-billion.disqus.com/embed.js';
  s.setAttribute('data-timestamp', +new Date());
  (d.head || d.body).appendChild(s);
})();
