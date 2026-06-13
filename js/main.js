/* ============================================================
   Saint Malo（サンマロー）  main.js
   - ハンバーガーメニュー開閉
   - アンカークリックでメニューを閉じる
   - 本日の営業時間ステータス表示（JSが無くても本文は読める）
   ============================================================ */
(function () {
  'use strict';

  /* ---------- ハンバーガーメニュー ---------- */
  var toggle = document.getElementById('navToggle');
  var menu = document.getElementById('navMenu');

  if (toggle && menu) {
    toggle.addEventListener('click', function () {
      var open = menu.classList.toggle('is-open');
      toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
      toggle.setAttribute('aria-label', open ? 'メニューを閉じる' : 'メニューを開く');
    });

    // メニュー内リンクをタップしたら閉じる
    menu.addEventListener('click', function (e) {
      if (e.target.closest('a') && menu.classList.contains('is-open')) {
        menu.classList.remove('is-open');
        toggle.setAttribute('aria-expanded', 'false');
        toggle.setAttribute('aria-label', 'メニューを開く');
      }
    });

    // Escapeキーで閉じる
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && menu.classList.contains('is-open')) {
        menu.classList.remove('is-open');
        toggle.setAttribute('aria-expanded', 'false');
        toggle.focus();
      }
    });
  }

  /* ---------- 本日の営業時間 ---------- */
  // 0:日 1:月 2:火 3:水 4:木 5:金 6:土
  // 定休日：日(0)・月(1)
  var schedule = {
    2: { open: '11:00', close: '17:30' }, // 火
    3: { open: '11:00', close: '17:30' }, // 水
    4: { open: '11:00', close: '15:00' }, // 木（時短）
    5: { open: '11:00', close: '17:30' }, // 金
    6: { open: '11:00', close: '17:30' }  // 土
  };

  var box = document.getElementById('todayStatus');
  var text = document.getElementById('todayText');

  if (box && text) {
    var now = new Date();
    var day = now.getDay();
    var today = schedule[day];

    if (!today) {
      box.classList.add('is-closed');
      text.textContent = '本日は定休日です（日曜・月曜が定休）';
    } else {
      var cur = now.getHours() * 60 + now.getMinutes();
      var openMin = toMinutes(today.open);
      var closeMin = toMinutes(today.close);

      if (cur >= openMin && cur < closeMin) {
        box.classList.add('is-open');
        text.textContent = '本日営業中｜' + today.open + '〜' + today.close;
      } else {
        box.classList.add('is-closed');
        text.textContent = '本日は営業時間外｜本日の営業 ' + today.open + '〜' + today.close;
      }
    }
  }

  function toMinutes(hhmm) {
    var p = hhmm.split(':');
    return parseInt(p[0], 10) * 60 + parseInt(p[1], 10);
  }

  /* ---------- スクロールでフェードイン（IntersectionObserver） ---------- */
  var reveals = document.querySelectorAll('.reveal');
  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  if (!reveals.length) return;

  if (reduce || !('IntersectionObserver' in window)) {
    // 動きを抑える設定／非対応環境では即時表示（コンテンツは必ず見える）
    reveals.forEach(function (el) { el.classList.add('is-visible'); });
    return;
  }

  var io = new IntersectionObserver(function (entries, obs) {
    entries.forEach(function (entry) {
      if (entry.isIntersecting) {
        entry.target.classList.add('is-visible');
        obs.unobserve(entry.target);
      }
    });
  }, { threshold: 0.12, rootMargin: '0px 0px -8% 0px' });

  reveals.forEach(function (el) { io.observe(el); });
})();
