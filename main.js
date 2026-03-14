/* ── 상태 ── */
const state = {
  goal: null,
  reason: null,
  energy: null,
  mental: null
};

/* ── 공감 메시지 (reason 인덱스 순) ── */
const empathyMsgs = [
  "며칠 잘 하다 무너졌어도 괜찮아. 오늘 이 미션 하나면 1%야.",
  "하루가 아무리 바빠도 이 미션은 30초야. 그게 오늘의 1%.",
  "오늘 하루가 망했어도 괜찮아. 이 미션 하나로 1%는 지켜.",
  "귀찮은 하루가 맞아. 그래도 이것만. 30초면 돼."
];

/* ── 미션 데이터 (에너지 × 멘탈) ── */
const missions = {
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

/* ── 화면 전환 ── */
function showScreen(id) {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  document.getElementById(id).classList.add('active');
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

/* ── 선택지 카드 (온보딩 1, 2) ── */
document.querySelectorAll('.choice-card').forEach(card => {
  card.addEventListener('click', () => {
    const group = card.dataset.group;
    document.querySelectorAll(`.choice-card[data-group="${group}"]`)
      .forEach(c => c.classList.remove('selected'));
    card.classList.add('selected');
    state[group] = card.dataset.val;

    setTimeout(() => {
      if (group === 'goal')   showScreen('screen-ob2');
      if (group === 'reason') showScreen('screen-ob3');
    }, 280);
  });
});

/* ── 에너지/멘탈 옵션 (온보딩 3) ── */
document.querySelectorAll('.options').forEach(group => {
  group.querySelectorAll('.option').forEach(opt => {
    opt.addEventListener('click', () => {
      group.querySelectorAll('.option').forEach(o => o.classList.remove('active'));
      opt.classList.add('active');
      state[group.dataset.group] = opt.dataset.val;
      document.getElementById('btn-mission').disabled = !(state.energy && state.mental);
    });
  });
});

/* ── 랜딩 → 온보딩 1 ── */
document.getElementById('btn-start').addEventListener('click', () => {
  showScreen('screen-ob1');
});

/* ── 미션 받기 ── */
document.getElementById('btn-mission').addEventListener('click', () => {
  const key = `${state.energy}-${state.mental}`;
  document.getElementById('mission-text').textContent = missions[key] || '';
  document.getElementById('empathy-msg').textContent = empathyMsgs[state.reason] || '';
  const msg = document.getElementById('result-msg');
  msg.textContent = '';
  msg.className = 'result-msg';
  showScreen('screen-mission');
});

/* ── 완료 ── */
document.getElementById('btn-done').addEventListener('click', () => {
  const days = (parseInt(localStorage.getItem('sloo_days') || '0')) + 1;
  localStorage.setItem('sloo_days', days);

  const mult = Math.pow(1.01, days).toFixed(2);
  const msg = document.getElementById('result-msg');
  msg.innerHTML = `오늘의 1% 완료. 🌱<br><span style="font-size:13px;font-weight:500;opacity:0.85">하루가 어떻든 상관없어. 넌 오늘 1%를 지켰어.</span><br><span style="font-size:13px;font-weight:500;opacity:0.85">현재 ${days}일째. 1.01^${days} = ${mult}배의 당신.</span>`;
  msg.className = 'result-msg done-msg show';

  showGrowthCard(days);
});

/* ── 패스 ── */
document.getElementById('btn-pass').addEventListener('click', () => {
  const msg = document.getElementById('result-msg');
  msg.innerHTML = `오늘은 패스. 근데 내일은 꼭 해.<br><span style="font-size:13px;font-weight:500;opacity:0.85">하루 밀려도 괜찮아. 딱 하루만.</span>`;
  msg.className = 'result-msg pass-msg show';
});

/* ── 처음으로 ── */
document.getElementById('btn-restart').addEventListener('click', () => {
  state.goal = null;
  state.reason = null;
  state.energy = null;
  state.mental = null;
  document.querySelectorAll('.choice-card').forEach(c => c.classList.remove('selected'));
  document.querySelectorAll('.option').forEach(o => o.classList.remove('active'));
  document.getElementById('btn-mission').disabled = true;
  document.getElementById('growth-card').classList.remove('show');
  showScreen('screen-landing');
});

/* ── 로고 클릭 → 랜딩 ── */
document.getElementById('nav-logo').addEventListener('click', e => {
  e.preventDefault();
  showScreen('screen-landing');
});

/* ── 테마 ── */
document.getElementById('themeToggle').addEventListener('click', () => {
  document.body.classList.toggle('light');
  const isLight = document.body.classList.contains('light');
  localStorage.setItem('sloo-theme', isLight ? 'light' : 'dark');
  const dc = document.getElementById('disqus_container');
  if (dc) dc.style.colorScheme = isLight ? 'light' : 'dark';
  window.disqus_config = getDisqusConfig(isLight);
  if (typeof DISQUS !== 'undefined') DISQUS.reset({ reload: true, config: window.disqus_config });
});

/* ── 초기화 ── */
if (localStorage.getItem('sloo-theme') === 'light') {
  document.body.classList.add('light');
}

/* ════════════════════════════════
   성장 시각화 카드
════════════════════════════════ */
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

function showGrowthCard(days) {
  const mult = Math.pow(1.01, days);
  const card = document.getElementById('growth-card');
  document.getElementById('growth-plant-icon').textContent = getPlantIcon(days);
  document.getElementById('growth-day-line').textContent = `당신은 ${days}일째입니다`;
  document.getElementById('growth-formula').innerHTML =
    `1.01<sup>${days}</sup> = ${mult.toFixed(2)}배의 당신입니다`;
  document.getElementById('growth-msg-text').textContent = getGrowthMsg(days);
  card.classList.add('show');
}

/* ════════════════════════════════
   1% 복리 계산기
════════════════════════════════ */
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

  function animateNum(target, decimals, elId) {
    if (animFrame) cancelAnimationFrame(animFrame);
    const start = currentDisp;
    const startTime = performance.now();
    const duration = 350;
    function step(now) {
      const p = Math.min((now - startTime) / duration, 1);
      const eased = 1 - Math.pow(1 - p, 3);
      const val = start + (target - start) * eased;
      const fixed = val.toFixed(decimals);

      document.getElementById('calc-big-num').innerHTML =
        `${fixed}<span class="calc-times">×</span>`;
      document.getElementById('calc-sentence-mult').textContent = fixed;
      if (p < 1) {
        animFrame = requestAnimationFrame(step);
      } else {
        currentDisp = target;
      }
    }
    animFrame = requestAnimationFrame(step);
  }

  function updateCalc(days) {
    days = Math.max(1, Math.min(365, days));
    const mult = Math.pow(1.01, days);
    animateNum(mult, 2, 'calc-big-num');
    document.getElementById('calc-sentence').innerHTML =
      `${days}일 후 당신은 <span id="calc-sentence-mult">${mult.toFixed(2)}</span>배의 당신입니다`;
    document.getElementById('calc-compare').textContent = getCompareText(days);
    updateSliderBg(days);
  }

  function updateSliderBg(val) {
    const pct = ((val - 1) / 364) * 100;
    slider.style.background =
      `linear-gradient(90deg, #A78BFA ${pct}%, #67E8F9 ${pct}%, #67E8F9 100%)`;
  }

  slider.addEventListener('input', () => {
    const d = parseInt(slider.value);
    numInput.value = d;
    updateCalc(d);
  });

  numInput.addEventListener('input', () => {
    let d = parseInt(numInput.value) || 1;
    d = Math.max(1, Math.min(365, d));
    slider.value = d;
    updateCalc(d);
  });

  // 초기 렌더
  updateCalc(30);
})();

/* ── 아티클 토글 ── */
function toggleArticle(id, btn) {
  const body = document.getElementById(id);
  const isOpen = body.classList.toggle('open');
  btn.innerText = isOpen ? '접기 ↑' : '더 읽기 ↓';
}

/* ── Disqus ── */
function getDisqusConfig(isLight) {
  return function () {
    this.page.url = window.location.href;
    this.page.identifier = 'sloo-main';
    this.page.colorScheme = isLight ? 'light' : 'dark';
  };
}
window.disqus_config = getDisqusConfig(false);
(function () {
  var d = document, s = d.createElement('script');
  s.src = 'https://product-make-billion.disqus.com/embed.js';
  s.setAttribute('data-timestamp', +new Date());
  (d.head || d.body).appendChild(s);
})();
