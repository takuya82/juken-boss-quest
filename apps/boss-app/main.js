"use strict";

// ======= フェイルセーフ：画面にエラーを出す =======
(function failSafe() {
  window.addEventListener("error", (e) => {
    const n = document.getElementById("boot-note");
    if (n) {
      n.textContent = "エラー: " + (e.message || "不明なエラー");
      n.classList.add("error");
    }
    console.error(e.error || e.message);
  });
  window.addEventListener("unhandledrejection", (e) => {
    const n = document.getElementById("boot-note");
    if (n) {
      n.textContent = "Promiseエラー: " + (e.reason?.message || e.reason || "不明");
      n.classList.add("error");
    }
    console.error(e.reason);
  });
})();

// ======= アプリ本体 =======
(function () {
  try {
    const IS_MOBILE = matchMedia("(max-width:480px), (pointer:coarse)").matches;

    /* ---------- ボス設定 ---------- */
    const BOSS_LIST = [
      { key: "dragon-main", name: "ドラゴン" },
      { key: "funtom", name: "ファントム" },
      { key: "kyojin", name: "巨人" },
      { key: "medusa", name: "メデューサ" },
      { key: "sukal", name: "スカル" },
    ];
    // 明示的なファイル名（提供された実画像に合わせる）
    const BOSS_ASSET_MAP = {
      "dragon-main": "dragon-main.jpeg",
      funtom: "funtom.jpeg",
      kyojin: "kyojin.jpeg",
      medusa: "medusa.jpeg",
      sukal: "sukal.jpeg",
    };
    const HP_CURVE = [100, 130, 170, 220, 280];

    // ローカル優先（file:// でも解決しやすい相対パスのみに）
    // よくあるバリエーションに対応: images / image / assets
    // あなたの手元の image/ を最優先にする（既存の placeholders は images/ にあるため上書きされます）
    const folders = ["image", "images", "assets", "./image", "./images", "./assets"];
    const exts = ["jpeg", "jpg", "png", "webp", "svg"];
    const buildCandidates = (key) => {
      const a = [];
      folders.forEach((f) => exts.forEach((ext) => a.push(`${f}/${key}.${ext}`)));
      return a;
    };
    const shuffle = (a) => {
      a = a.slice();
      for (let i = a.length - 1; i > 0; i--) {
        const j = (Math.random() * (i + 1)) | 0;
        [a[i], a[j]] = [a[j], a[i]];
      }
      return a;
    };

    /* ---------- 問題（短縮） ---------- */
    const QUESTIONS = {
      elementary: [
        {
          id: "e1",
          subject: "算数",
          difficulty: 2,
          question: "AとBの比が3:5、A+B=64。Aは？",
          options: ["24", "32", "40", "48"],
          correct: 0,
          explanation: "8等分→1単位=8、A=8×3",
        },
        {
          id: "e2",
          subject: "算数",
          difficulty: 2,
          question: "食塩水15%を200g。食塩は？",
          options: ["20g", "25g", "30g", "35g"],
          correct: 2,
          explanation: "200×0.15=30g",
        },
      ],
      junior: [
        {
          id: "j1",
          subject: "数学",
          difficulty: 2,
          question: "2x-3=5x+9 の解は？",
          options: ["x=-4", "x=4", "x=-2", "x=2"],
          correct: 0,
          explanation: "-12=3x",
        },
      ],
    };

    /* ---------- 状態 ---------- */
    let app = {
      user: { name: "", grade: "", level: 1, exp: 0 },
      game: {
        bossHp: 0,
        maxHp: 0,
        correctCount: 0,
        totalDamage: 0,
        streakCount: 0,
        questionCount: 0,
        currentQuestion: null,
        usedQuestions: [],
        gameActive: false,
        _qStart: 0,
        finalePlayed: false,
      },
      stats: {
        daily: { date: new Date().toDateString(), questions: 0, correct: 0, damage: 0 },
        total: { questions: 0, correct: 0, damage: 0, bossesDefeated: 0 },
      },
      history: { elementary: [], junior: [] },
      progress: { bossIndex: 0, bossOrder: [] },
    };

    /* ---------- DOM ---------- */
    const dom = {};
    function $(id) {
      return document.getElementById(id);
    }
    function initializeDOM() {
      [
        "save-indicator",
        "setup-screen",
        "game-screen",
        "returning-user",
        "user-progress",
        "continue-btn",
        "new-game-btn",
        "new-user-setup",
        "user-name",
        "start-game-btn",
        "user-greeting",
        "today-questions",
        "today-correct",
        "total-questions",
        "user-level",
        "boss-name",
        "hp-fill",
        "hp-display",
        "subject-tag",
        "difficulty-indicator",
        "question-text",
        "options-container",
        "result-text",
        "start-btn",
        "next-btn",
        "reset-btn",
        "back-btn",
        "correct-count",
        "total-damage",
        "streak-count",
        "question-count",
        "boss-bg",
      ].forEach((id) => (dom[id.replace(/-/g, "")] = $(id)));
      dom.gradeBtns = document.querySelectorAll(".grade-btn");
      dom.bossimg = dom.bossbg.querySelector("img");
      dom.fx = $("fx-layer");
    }

    /* ---------- Storage ---------- */
    let saveTimer = 0;
    function debounceSave() {
      clearTimeout(saveTimer);
      saveTimer = setTimeout(saveData, 150);
    }
    function saveData() {
      try {
        localStorage.setItem("bossAppExam", JSON.stringify(app));
        showSaveIndicator();
      } catch (e) {
        console.error(e);
      }
    }
    function loadData() {
      try {
        const raw = localStorage.getItem("bossAppExam");
        if (!raw) return null;
        const saved = JSON.parse(raw) || {};
        ensureSchema(saved);
        ensureDaily(saved);
        return saved;
      } catch (e) {
        console.warn("load failed", e);
        localStorage.removeItem("bossAppExam");
        return null;
      }
    }
    function ensureSchema(s) {
      if (!s.history) s.history = { elementary: [], junior: [] };
      if (!s.game)
        s.game = app.game;
      if (s.game.finalePlayed == null) s.game.finalePlayed = false;
      if (!s.progress) s.progress = { bossIndex: 0, bossOrder: [] };
      if (!s.user) s.user = { name: "", grade: "", level: 1, exp: 0 };
      if (!s.stats)
        s.stats = {
          daily: { date: new Date().toDateString(), questions: 0, correct: 0, damage: 0 },
          total: { questions: 0, correct: 0, damage: 0, bossesDefeated: 0 },
        };
    }
    function ensureDaily(s) {
      const today = new Date().toDateString();
      if (!s.stats.daily || s.stats.daily.date !== today) s.stats.daily = { date: today, questions: 0, correct: 0, damage: 0 };
    }
    function showSaveIndicator() {
      const n = dom.saveindicator;
      if (!n) return;
      n.classList.add("show");
      setTimeout(() => n.classList.remove("show"), 900);
    }

    /* ---------- ボス ---------- */
    const ensureBossOrder = () => {
      const n = BOSS_LIST.length;
      if (!Array.isArray(app.progress.bossOrder) || app.progress.bossOrder.length !== n) {
        app.progress.bossOrder = shuffle([...Array(n).keys()]);
      }
    };
    function currentBoss() {
      ensureBossOrder();
      const stageIdx = app.progress.bossIndex % BOSS_LIST.length;
      const bossIdx = app.progress.bossOrder[stageIdx];
      const meta = BOSS_LIST[bossIdx];
      const hp = HP_CURVE[stageIdx] ?? Math.round(100 * Math.pow(1.3, stageIdx));
      // 優先: 明示ファイル名を各候補フォルダに展開 → その後に一般候補
      const explicit = BOSS_ASSET_MAP[meta.key]
        ? folders.map((f) => `${f}/${BOSS_ASSET_MAP[meta.key]}`)
        : [];
      const files = [
        ...new Set([
          ...explicit,
          ...buildCandidates(meta.key),
          ...buildCandidates("dragon-main"),
        ]),
      ];
      return { stageIdx, bossIdx, name: meta.name, files, hp };
    }
    function applyBossToUI() {
      const b = currentBoss();
      dom.bossname.textContent = "🐉 " + b.name;
      const newImg = document.createElement("img");
      newImg.alt = "boss";
      let i = 0;
      const tryNext = () => {
        if (i >= b.files.length) {
          // 最終フォールバック（埋め込みSVG）
          const fallback =
            "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 800 500'%3E%3Crect width='100%25' height='100%25' fill='none'/%3E%3Crect x='260' y='180' rx='28' ry='28' width='280' height='180' fill='%239795ff' stroke='%23fff' stroke-width='8'/%3E%3Crect x='300' y='220' width='70' height='60' rx='8' fill='%23fff'/%3E%3Crect x='430' y='220' width='70' height='60' rx='8' fill='%23fff'/%3E%3Crect x='340' y='310' width='140' height='20' rx='6' fill='%23fff'/%3E%3C/svg%3E";
          newImg.src = fallback;
          console.warn("画像候補が見つからないためフォールバックを表示", b.files);
          return;
        }
        const p = b.files[i++];
        newImg.onerror = tryNext;
        newImg.onload = () => console.log("Loaded", p);
        newImg.src = encodeURI(p) + (p.includes("?") ? "&" : "?") + "v=4";
      };
      tryNext();
      if (dom.bossimg && dom.bossimg.parentNode) dom.bossimg.parentNode.replaceChild(newImg, dom.bossimg);
      else dom.bossbg.appendChild(newImg);
      dom.bossimg = newImg;
    }
    function setBossAndResetSession() {
      const b = currentBoss();
      app.game = {
        bossHp: b.hp,
        maxHp: b.hp,
        correctCount: 0,
        totalDamage: 0,
        streakCount: 0,
        questionCount: 0,
        currentQuestion: null,
        usedQuestions: [],
        gameActive: false,
        _qStart: 0,
        finalePlayed: false,
      };
      cleanupEffects();
      applyBossToUI();
      renderHP();
      renderStats();
      debounceSave();
    }
    function advanceBoss() {
      app.progress.bossIndex++;
      if (app.progress.bossIndex % BOSS_LIST.length === 0) {
        app.progress.bossOrder = shuffle([...Array(BOSS_LIST.length).keys()]);
      }
      setBossAndResetSession();
      dom.resulttext.textContent = "新しいボスが現れた！";
      dom.startbtn.style.display = "inline-block";
      dom.nextbtn.style.display = "none";
      dom.resetbtn.style.display = "none";
    }

    /* ---------- レイアウトロック ---------- */
    let layoutLocked = false;
    function lockLayout() {
      if (layoutLocked) return;
      const root = $("root");
      root.style.height = root.offsetHeight + "px";
      document.body.style.overflow = "hidden";
      layoutLocked = true;
    }
    function unlockLayout() {
      if (!layoutLocked) return;
      const root = $("root");
      root.style.height = "";
      document.body.style.overflow = "";
      layoutLocked = false;
    }

    /* ---------- 画面制御 ---------- */
    function enterSetup() {
      dom.setupscreen.style.display = "block";
      dom.gamescreen.style.display = "none";
      const saved = loadData();
      if (saved) {
        app = saved;
        ensureSchema(app);
        dom.returninguser.style.display = "block";
        dom.userprogress.textContent = `前回：累計${app.stats.total.questions}問 / 正答${app.stats.total.correct} / 討伐${app.stats.total.bossesDefeated}`;
        dom.continuebtn.onclick = () => enterGame();
        dom.newgamebtn.onclick = () => {
          app.progress.bossIndex = 0;
          app.progress.bossOrder = shuffle([...Array(BOSS_LIST.length).keys()]);
          setBossAndResetSession();
          saveData();
          enterGame();
        };
      } else {
        dom.returninguser.style.display = "none";
      }
    }
    function enterGame() {
      dom.setupscreen.style.display = "none";
      dom.gamescreen.style.display = "block";
      dom.usergreeting.textContent = `${app.user.name}、がんばって！`;
      if (app.game.maxHp <= 0) {
        setBossAndResetSession();
      } else {
        applyBossToUI();
        renderHP();
        renderStats();
      }
      dom.resulttext.textContent = "「クエスト開始」ボタンを押してボス討伐を始めましょう！";
      dom.optionscontainer.innerHTML = "";
      dom.nextbtn.style.display = "none";
      dom.resetbtn.style.display = app.game.bossHp === 0 ? "inline-block" : "none";
      dom.resetbtn.textContent = app.game.bossHp === 0 ? "⚔️ 次のボスへ" : "🔄 最初から";
      dom.startbtn.style.display = "inline-block";
    }
    function renderHP() {
      const pct = Math.max(0, Math.min(100, (app.game.bossHp / app.game.maxHp) * 100));
      dom.hpfill.style.width = pct + "%";
      dom.hpdisplay.textContent = `${app.game.bossHp}/${app.game.maxHp}`;
      if (app.game.bossHp === 0) {
        dom.bossname.classList.add("victory");
        dom.resulttext.innerHTML = '🎉 <span class="victory">討伐成功！</span> 🎉';
        dom.resetbtn.style.display = "inline-block";
        dom.resetbtn.textContent = "⚔️ 次のボスへ";
        if (!app.game.finalePlayed) {
          playFinale();
          app.game.finalePlayed = true;
          debounceSave();
        }
      } else {
        dom.bossname.classList.remove("victory");
        dom.resetbtn.textContent = "🔄 最初から";
      }
    }
    function renderStats() {
      dom.todayquestions.textContent = app.stats.daily.questions;
      dom.todaycorrect.textContent = app.stats.daily.correct;
      dom.totalquestions.textContent = app.stats.total.questions;
      dom.userlevel.textContent = app.user.level;
      dom.correctcount.textContent = app.game.correctCount;
      dom.totaldamage.textContent = app.game.totalDamage;
      dom.streakcount.textContent = app.game.streakCount;
      dom.questioncount.textContent = app.game.questionCount;
    }

    /* ---------- 出題 ---------- */
    function selectGrade(g) {
      app.user.grade = g;
      dom.gradeBtns.forEach((b) => b.classList.toggle("selected", b.dataset.grade === g));
      updateStartButton();
    }
    function updateStartButton() {
      const ok = dom.username.value.trim().length > 0 && !!app.user.grade;
      dom.startgamebtn.disabled = !ok;
    }
    function resetSession() {
      const b = currentBoss();
      app.game = {
        bossHp: b.hp,
        maxHp: b.hp,
        correctCount: 0,
        totalDamage: 0,
        streakCount: 0,
        questionCount: 0,
        currentQuestion: null,
        usedQuestions: [],
        gameActive: false,
        _qStart: 0,
        finalePlayed: false,
      };
      cleanupEffects();
      renderHP();
      renderStats();
      debounceSave();
    }
    function startQuest() {
      if (app.game.bossHp === 0 || !app.user.grade) return;
      app.game.gameActive = true;
      pickQuestion();
      renderQuestion();
    }
    function pickQuestion() {
      const grade = app.user.grade;
      const pool = (QUESTIONS[grade] || []).slice();
      const seen = new Set(app.history[grade] || []);
      const used = new Set(app.game.usedQuestions || []);
      let remain = pool.filter((q) => !seen.has(q.id) && !used.has(q.id));
      if (remain.length === 0) {
        app.history[grade] = (app.history[grade] || []).slice(-50);
        remain = pool.filter((q) => !new Set(app.history[grade]).has(q.id) && !used.has(q.id));
        if (remain.length === 0) {
          app.game.usedQuestions = [];
          remain = pool;
        }
      }
      const q = remain[Math.floor(Math.random() * remain.length)];
      app.game.currentQuestion = q;
      app.game._qStart = Date.now();
      app.game.usedQuestions.push(q.id);
      const h = app.history[grade];
      h.push(q.id);
      if (h.length > 200) h.splice(0, h.length - 200);
      debounceSave();
    }
    function renderQuestion() {
      const q = app.game.currentQuestion;
      if (!q) return;
      dom.subjecttag.textContent = q.subject || "受験対策";
      const diffClass = q.difficulty <= 1 ? "difficulty-easy" : q.difficulty === 2 ? "difficulty-normal" : "difficulty-hard";
      const diffText = q.difficulty <= 1 ? "★ かんたん" : q.difficulty === 2 ? "★ 普通" : "★ 難しい";
      dom.difficultyindicator.className = "difficulty-indicator " + diffClass;
      dom.difficultyindicator.textContent = diffText;
      dom.questiontext.textContent = q.question;
      dom.resulttext.textContent = "";
      dom.optionscontainer.innerHTML = "";
      q.options.forEach((opt, idx) => {
        const b = document.createElement("button");
        b.className = "option-btn";
        b.textContent = opt;
        b.addEventListener("click", () => checkAnswer(idx, b));
        dom.optionscontainer.appendChild(b);
      });
      dom.startbtn.style.display = "none";
      dom.nextbtn.style.display = "none";
    }

    // 強化版ダメージ計算（Perfect/Great + クリティカル）
    function computeDamage(q, elapsed) {
      const base = 10;
      const diff = ({ 1: 0.9, 2: 1.0, 3: 1.12 })[q.difficulty] ?? 1;
      const combo = Math.min(1.8, 1 + 0.08 * Math.max(0, app.game.streakCount - 1));
      let timeMul = 1;
      let judge = "";
      if (elapsed <= 2) {
        timeMul = 2.0; // Perfect
        judge = "Perfect";
      } else if (elapsed <= 5) {
        timeMul = 1.5; // Great
        judge = "Great";
      }
      const dmg = Math.round(base * diff * combo * timeMul);
      return { dmg, judge };
    }
    function tryCritical(dmg) {
      const rate = 0.08; // 8%
      const mul = 1.7;
      const isCrit = Math.random() < rate;
      return { dmg: isCrit ? Math.round(dmg * mul) : dmg, isCrit };
    }

    function checkAnswer(idx, btn) {
      const q = app.game.currentQuestion;
      if (!q) return;
      const buttons = [...dom.optionscontainer.querySelectorAll(".option-btn")];
      const elapsed = (Date.now() - app.game._qStart) / 1000;
      if (idx === q.correct) {
        btn.classList.add("correct");
        buttons.forEach((b) => (b.disabled = true));
        app.game.streakCount++;
        app.game.correctCount++;
        app.stats.daily.correct++;
        app.stats.total.correct++;

        const { dmg: baseDmg, judge } = computeDamage(q, elapsed);
        const { dmg, isCrit } = tryCritical(baseDmg);
        app.game.totalDamage += dmg;
        app.stats.daily.damage += dmg;
        app.stats.total.damage += dmg;
        const before = app.game.bossHp;
        app.game.bossHp = Math.max(0, app.game.bossHp - dmg);

        // 強化演出
        playSlashEffect();
        spawnSparks();
        screenShakeDirectional();
        freezeFrame();
        showHitNumber(dmg, { crit: isCrit, judge });

        dom.hpfill.classList.add("damage-effect");
        setTimeout(() => dom.hpfill.classList.remove("damage-effect"), 380);

        app.user.exp += Math.max(1, Math.floor(dmg / 5));
        if (app.user.exp >= 20) {
          app.user.level++;
          app.user.exp = 0;
          notifyLevelUp();
        }
        dom.resulttext.textContent = `${judge ? judge + "! " : ""}${isCrit ? "クリティカル! " : ""}${dmg}ダメージ！`;
        app.game.questionCount++;
        app.stats.daily.questions++;
        app.stats.total.questions++;
        renderHP();
        renderStats();
        debounceSave();
        if (before > 0 && app.game.bossHp === 0) {
          app.stats.total.bossesDefeated++;
          dom.nextbtn.style.display = "none";
          dom.resetbtn.style.display = "inline-block";
          dom.resetbtn.textContent = "⚔️ 次のボスへ";
          debounceSave();
          return;
        }
        dom.nextbtn.style.display = "inline-block";
      } else {
        btn.classList.add("incorrect");
        buttons.forEach((b) => (b.disabled = false));
        app.game.streakCount = 0;
        dom.resulttext.textContent = `もう一度！ ヒント: ${q.explanation}`;
        renderStats();
      }
    }

    /* ---------- 演出 ---------- */
    function playSlashEffect() {
      const d = document.createElement("div");
      d.className = "slash-effect";
      dom.fx.appendChild(d);
      setTimeout(() => d.remove(), 360);
    }
    function spawnSparks() {
      const host = document.querySelector(".boss-section");
      const r = host.getBoundingClientRect();
      const cx = r.left + r.width / 2,
        cy = r.top + r.height / 2;
      const N = IS_MOBILE ? 14 : 26;
      for (let i = 0; i < N; i++) {
        const sp = document.createElement("div");
        sp.className = "spark";
        sp.style.left = cx - 2 + "px";
        sp.style.top = cy - 2 + "px";
        const ang = Math.PI * 2 * (i / N) + (Math.random() * 0.6 - 0.3);
        const dist = (IS_MOBILE ? 70 : 90) + Math.random() * (IS_MOBILE ? 90 : 130);
        sp.style.setProperty("--dx", Math.cos(ang) * dist + "px");
        sp.style.setProperty("--dy", Math.sin(ang) * dist + "px");
        dom.fx.appendChild(sp);
        setTimeout(() => sp.remove(), 650);
      }
    }
    function screenShakeDirectional() {
      if (IS_MOBILE) return;
      const root = $("root");
      const ang = Math.random() * Math.PI * 2;
      const sx = Math.cos(ang) * 4 + "px";
      const sy = Math.sin(ang) * 3 + "px";
      root.style.setProperty("--sx", sx);
      root.style.setProperty("--sy", sy);
      root.classList.add("shake");
      setTimeout(() => root.classList.remove("shake"), 360);
    }
    function freezeFrame() {
      if (matchMedia("(prefers-reduced-motion: reduce)").matches) return;
      document.body.classList.add("hit-freeze");
      setTimeout(() => document.body.classList.remove("hit-freeze"), 110);
    }
    function showHitNumber(value, { crit = false, judge = "" } = {}) {
      const host = document.querySelector(".boss-section");
      const r = host.getBoundingClientRect();
      const x = r.left + r.width * (0.45 + Math.random() * 0.1);
      const y = r.top + r.height * (0.28 + Math.random() * 0.12);
      const el = document.createElement("div");
      el.className = "hit-number" + (crit ? " crit" : "");
      el.style.left = x + "px";
      el.style.top = y + "px";
      el.style.fontSize = crit ? "32px" : "24px";
      el.textContent = `${judge ? judge + " " : ""}${value}`;
      document.body.appendChild(el);
      setTimeout(() => el.remove(), 800);
    }
    function notifyLevelUp() {
      const n = document.createElement("div");
      n.className = "levelup-notification";
      n.textContent = `レベルアップ！ Lv.${app.user.level}`;
      document.body.appendChild(n);
      setTimeout(() => n.remove(), 2000);
      renderStats();
    }
    function playFinale() {
      lockLayout();
      const host = document.querySelector(".boss-section");
      const hpBar = document.querySelector(".hp-bar");
      const img = dom.bossimg;
      if (img) {
        img.classList.remove("defeated");
        void img.offsetWidth;
        img.classList.add("defeated");
      }
      const flash = document.createElement("div");
      flash.className = "white-flash";
      dom.fx.appendChild(flash);
      setTimeout(() => flash.remove(), 500);
      const burst = document.createElement("div");
      burst.className = "burst";
      dom.fx.appendChild(burst);
      setTimeout(() => burst.remove(), 700);
      hpBar.classList.add("hp-explode");
      setTimeout(() => hpBar.classList.remove("hp-explode"), 520);
      launchConfetti(IS_MOBILE ? 40 : 100);
      fireworkAt(host, 0.28, 0.45);
      fireworkAt(host, 0.72, 0.38);
      if (!IS_MOBILE) fireworkAt(host, 0.5, 0.28);
      const banner = document.createElement("div");
      banner.className = "victory-banner";
      banner.textContent = "討 伐 成 功 !!";
      dom.fx.appendChild(banner);
      setTimeout(() => banner.remove(), 2200);
      setTimeout(unlockLayout, 2000);
    }
    function launchConfetti(n) {
      const colors = ["#ffd166", "#06d6a0", "#ef476f", "#118ab2", "#ffe66d", "#f78c6b", "#a8dadc", "#e63946"];
      for (let i = 0; i < n; i++) {
        const c = document.createElement("div");
        c.className = "confetti";
        const sz = 8 + Math.random() * (IS_MOBILE ? 6 : 10);
        c.style.width = sz + "px";
        c.style.height = sz * 1.4 + "px";
        c.style.left = Math.random() * 100 + "%";
        c.style.background = colors[(Math.random() * colors.length) | 0];
        c.style.setProperty("--t", (IS_MOBILE ? 1.4 : 1.8) + Math.random() * (IS_MOBILE ? 1.0 : 1.6) + "s");
        c.style.setProperty("--r", Math.random() * 360 - 180 + "deg");
        c.style.opacity = 0.95;
        dom.fx.appendChild(c);
        setTimeout(() => c.remove(), 2600);
      }
    }
    function fireworkAt(host, px, py) {
      const r = host.getBoundingClientRect();
      const x = r.left + r.width * px,
        y = r.top + r.height * py;
      const N = IS_MOBILE ? 18 : 30;
      for (let i = 0; i < N; i++) {
        const sp = document.createElement("div");
        sp.className = "spark";
        sp.style.left = x + "px";
        sp.style.top = y + "px";
        const ang = Math.PI * 2 * (i / N) + (Math.random() * 0.5 - 0.25);
        const dist = (IS_MOBILE ? 80 : 110) + Math.random() * (IS_MOBILE ? 100 : 150);
        sp.style.setProperty("--dx", Math.cos(ang) * dist + "px");
        sp.style.setProperty("--dy", Math.sin(ang) * dist + "px");
        dom.fx.appendChild(sp);
        setTimeout(() => sp.remove(), 700);
      }
    }
    function cleanupEffects() {
      document.querySelectorAll(".white-flash,.burst,.confetti,.spark,.slash-effect").forEach((n) => n.remove());
      dom.fx.innerHTML = "";
      if (dom.bossimg) dom.bossimg.classList.remove("defeated");
      unlockLayout();
    }

    /* ---------- イベント ---------- */
    function bindEvents() {
      dom.gradeBtns.forEach((btn) => btn.addEventListener("click", () => selectGrade(btn.dataset.grade)));
      dom.username.addEventListener("input", updateStartButton);
      dom.startgamebtn.addEventListener("click", () => {
        app.user.name = dom.username.value.trim();
        app.progress.bossIndex = 0;
        app.progress.bossOrder = shuffle([...Array(BOSS_LIST.length).keys()]);
        setBossAndResetSession();
        enterGame();
        debounceSave();
      });
      dom.startbtn.addEventListener("click", startQuest);
      dom.nextbtn.addEventListener("click", startQuest);
      dom.resetbtn.addEventListener("click", () => {
        if (app.game.bossHp === 0) {
          advanceBoss();
        } else {
          resetSession();
          dom.resulttext.textContent = "最初からやり直し！";
          dom.startbtn.style.display = "inline-block";
          dom.nextbtn.style.display = "none";
        }
      });
      dom.backbtn.addEventListener("click", enterSetup);

      document.addEventListener("keydown", (e) => {
        if (e.key >= "1" && e.key <= "4") {
          const idx = +e.key - 1;
          const b = dom.optionscontainer?.querySelectorAll(".option-btn")[idx];
          if (b && !b.disabled) b.click();
        }
        const k = e.key.toLowerCase();
        if (k === "s" && dom.startbtn.style.display !== "none") dom.startbtn.click();
        if (k === "n" && dom.nextbtn.style.display !== "none") dom.nextbtn.click();
        if (k === "b") dom.backbtn.click();
      });
    }

    /* ---------- 起動 ---------- */
    function init() {
      initializeDOM();
      bindEvents();
      updateStartButton();
      enterSetup();
      const n = $("boot-note");
      if (n) n.remove();
    }
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", init);
    } else {
      init();
    }
  } catch (err) {
    const n = document.getElementById("boot-note");
    if (n) {
      n.textContent = "初期化エラー: " + err.message;
      n.classList.add("error");
    }
    console.error(err);
  }
})();
