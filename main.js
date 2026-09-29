/* PÁSALA landing · main.js */
(function () {
  'use strict';
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* --- nav: fondo sólido al bajar + menú móvil --- */
  var nav = document.getElementById('nav');
  var toggle = document.getElementById('navtoggle');
  function onScroll() { nav.classList.toggle('is-solid', window.scrollY > 40); }
  onScroll(); window.addEventListener('scroll', onScroll, { passive: true });
  toggle.addEventListener('click', function () {
    var open = nav.classList.toggle('is-open');
    toggle.setAttribute('aria-expanded', open); document.body.style.overflow = open ? 'hidden' : '';
  });
  document.querySelectorAll('#navlinks a').forEach(function (a) {
    a.addEventListener('click', function () { nav.classList.remove('is-open'); toggle.setAttribute('aria-expanded', false); document.body.style.overflow = ''; });
  });

  /* --- reveal on scroll --- */
  var items = document.querySelectorAll('.reveal, .reveal-img');
  if ('IntersectionObserver' in window && !reduce) {
    var io = new IntersectionObserver(function (es) {
      es.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } });
    }, { threshold: 0.12, rootMargin: '0px 0px -6% 0px' });
    items.forEach(function (el) { io.observe(el); });
  } else { items.forEach(function (el) { el.classList.add('in'); }); }

  /* --- parallax suave en fotos full-screen --- */
  var px = Array.prototype.slice.call(document.querySelectorAll('[data-parallax]'));
  if (px.length && !reduce) {
    var ticking = false;
    var upd = function () {
      var vh = window.innerHeight;
      px.forEach(function (el) {
        var r = el.parentElement.getBoundingClientRect();
        if (r.bottom < -100 || r.top > vh + 100) return;
        var k = parseFloat(el.dataset.parallax) || 0.1;
        var off = (r.top + r.height / 2 - vh / 2) * -k;
        el.style.transform = 'translate3d(0,' + off.toFixed(1) + 'px,0)';
      });
      ticking = false;
    };
    window.addEventListener('scroll', function () { if (!ticking) { ticking = true; requestAnimationFrame(upd); } }, { passive: true });
    window.addEventListener('resize', upd); upd();
  }

  /* --- aviso de privacidad (placeholder) --- */
  var dlg = document.getElementById('aviso');
  document.querySelectorAll('[data-open-aviso]').forEach(function (a) {
    a.addEventListener('click', function (e) { e.preventDefault(); if (dlg.showModal) dlg.showModal(); else dlg.setAttribute('open', ''); });
  });

  /* --- formulario lista de espera --- */
  var form = document.getElementById('waitlist');
  var thanks = document.getElementById('thanks');
  var formError = document.getElementById('form-error');
  var btn = document.getElementById('submitbtn');

  // TODO(ENDPOINT): reemplazar por la URL real (Formspree, Google Apps Script, Notion API vía función serverless, etc.)
  // Mientras sea null, el registro SOLO se guarda en localStorage de este navegador (placeholder, no llega a nadie).
  var WAITLIST_ENDPOINT = null;
  var LS_KEY = 'pasala_waitlist_v1';

  function setErr(id, msg) {
    var el = document.getElementById(id); var field = el.closest('.field');
    if (msg) { el.textContent = msg; el.hidden = false; field.classList.add('invalid'); }
    else { el.hidden = true; field.classList.remove('invalid'); }
  }
  function validate() {
    var ok = true;
    var email = form.email.value.trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) { setErr('email-err', 'Escribe un correo válido.'); ok = false; } else setErr('email-err');
    var ig = form.instagram.value.trim().replace(/^@/, '');
    if (ig && !/^[A-Za-z0-9._]{1,30}$/.test(ig)) { setErr('ig-err', 'Usuario de Instagram no válido (letras, números, punto y guion bajo).'); ok = false; } else setErr('ig-err');
    if (!form.consent.checked) { setErr('consent-err', 'Necesitamos que aceptes el Aviso de Privacidad.'); ok = false; } else setErr('consent-err');
    return ok;
  }

  function saveLocal(rec) {
    var list = []; try { list = JSON.parse(localStorage.getItem(LS_KEY) || '[]'); } catch (e) {}
    list.push(rec); localStorage.setItem(LS_KEY, JSON.stringify(list));
  }

  // >>> PLACEHOLDER submit handler <<<
  function submitWaitlist(rec) {
    if (WAITLIST_ENDPOINT) {
      return fetch(WAITLIST_ENDPOINT, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(rec) })
        .then(function (r) { if (!r.ok) throw new Error('HTTP ' + r.status); saveLocal(rec); });
    }
    saveLocal(rec);           // TODO: quitar cuando exista backend
    return Promise.resolve(); // simula éxito
  }

  form.addEventListener('submit', function (e) {
    e.preventDefault(); formError.hidden = true;
    if (form.website.value) return; // honeypot
    if (!validate()) { var bad = form.querySelector('.invalid input'); if (bad) bad.focus(); return; }
    var rec = {
      email: form.email.value.trim().toLowerCase(),
      instagram: form.instagram.value.trim().replace(/^@/, '') || null,
      consent: true,
      source: 'landing-v1',
      ts: new Date().toISOString()
    };
    btn.disabled = true; btn.textContent = 'Enviando…';
    submitWaitlist(rec).then(function () {
      form.hidden = true; thanks.hidden = false; thanks.focus();
    }).catch(function () {
      formError.hidden = false; btn.disabled = false; btn.textContent = 'Quiero entrar a la lista';
    });
  });
  form.addEventListener('input', function (e) { var id = e.target.id; if (id) setErr(id + '-err'); });
})();
