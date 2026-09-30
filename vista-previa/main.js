/* PÁSALA landing v3 · main.js */
(function () {
  'use strict';

  /* ============ CONFIGURACIÓN ============
     Endpoint de la lista de espera (POST JSON: {email, source, ts}).
     null = sin endpoint todavía → en producción el formulario muestra un error honesto
     (NO finge que guardó el correo). Ejemplos: 'https://formspree.io/f/xxxx' o una función serverless. */
  var WAITLIST_ENDPOINT = 'https://api.web3forms.com/submit';
  var W3F_ACCESS_KEY = 'a157a927-4cd1-4eb0-b6fd-b296db2964bb';
  var SOURCE = 'landing-v3';
  var TIMEOUT_MS = 12000;
  /* Modo desarrollo: SOLO en localhost y con ?dev=1 se guarda en localStorage para probar la interfaz. */
  var IS_DEV = /^(localhost|127\.0\.0\.1|\[::1\])$/.test(location.hostname) && /[?&]dev=1\b/.test(location.search);
  var LS_KEY = 'pasala_waitlist_dev';

  var MSG = {
    nameEmpty: 'Escribe tu nombre para saber a quién agradecer.',
    emailEmpty: 'Cuéntame tu correo para poder escribirte.',
    emailInvalid: 'Revisa tu correo con calma; con un formato como nombre@correo.com podré escribirte.',
    consent: 'Marca esta casilla para que sigamos avanzando juntos.',
    noEndpoint: 'El registro se abre muy pronto. Vuelve a visitarnos, aquí te esperamos.',
    network: 'Tu conexión se interrumpió un momento. Revisa que esté activa e inténtalo otra vez; tu lugar te espera.',
    server: 'Algo se detuvo de nuestro lado. Inténtalo otra vez en unos minutos; tu lugar te espera.',
    sending: 'Enviando…',
    cta: 'Quiero estar entre los 100'
  };

  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var nav = document.getElementById('nav');
  var toggle = document.getElementById('navtoggle');
  var links = document.getElementById('navlinks');
  var mqMobile = window.matchMedia('(max-width: 899px)');

  /* --- menú móvil: abre/cierra, Escape, foco atrapado, aria-label dinámico --- */
  function setMenu(open, returnFocus) {
    nav.classList.toggle('is-open', open);
    toggle.setAttribute('aria-expanded', String(open));
    toggle.setAttribute('aria-label', open ? 'Cerrar menú' : 'Abrir menú');
    document.body.style.overflow = open ? 'hidden' : '';
    if (!open && returnFocus) toggle.focus();
  }
  toggle.addEventListener('click', function () { setMenu(!nav.classList.contains('is-open')); });
  links.addEventListener('click', function (e) { if (e.target.closest('a')) setMenu(false); });
  document.addEventListener('keydown', function (e) {
    if (!nav.classList.contains('is-open')) return;
    if (e.key === 'Escape') { setMenu(false, true); return; }
    if (e.key === 'Tab') {
      var f = [toggle].concat(Array.prototype.slice.call(links.querySelectorAll('a')));
      var first = f[0], last = f[f.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    }
  });
  mqMobile.addEventListener && mqMobile.addEventListener('change', function (m) { if (!m.matches) setMenu(false); });

  /* --- aparición al hacer scroll (solo si hay JS; sin JS todo se ve) --- */
  var items = document.querySelectorAll('.reveal');
  if ('IntersectionObserver' in window && !reduce) {
    var io = new IntersectionObserver(function (es) {
      es.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } });
    }, { threshold: 0.1, rootMargin: '0px 0px -5% 0px' });
    items.forEach(function (el) { io.observe(el); });
  } else { items.forEach(function (el) { el.classList.add('in'); }); }

  /* --- formulario: nombre y correo obligatorios, consentimiento, mismo envío por Web3Forms --- */
  var form = document.getElementById('waitlist');
  var thanks = document.getElementById('thanks');
  var intro = document.getElementById('form-intro');
  var formError = document.getElementById('form-error');
  var btn = document.getElementById('submitbtn');
  var FIELDS = { name: 'nombre-err', email: 'email-err', consent: 'consent-err' };

  function setErr(name, msg) {
    var el = document.getElementById(FIELDS[name]); var input = form.elements[name]; var field = el.closest('.field');
    if (msg) { el.textContent = msg; el.hidden = false; field.classList.add('invalid'); input.setAttribute('aria-invalid', 'true'); }
    else { el.hidden = true; field.classList.remove('invalid'); input.removeAttribute('aria-invalid'); }
  }
  function showError(msg) { formError.textContent = msg; formError.hidden = false; btn.disabled = false; btn.textContent = MSG.cta; }

  function send(rec) {
    if (WAITLIST_ENDPOINT) {
      var ctrl = ('AbortController' in window) ? new AbortController() : null;
      var t = ctrl && setTimeout(function () { ctrl.abort(); }, TIMEOUT_MS);
      return fetch(WAITLIST_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
        body: JSON.stringify({ access_key: W3F_ACCESS_KEY, subject: 'Nuevo registro lista PÁSALA', from_name: 'Landing PÁSALA', name: rec.name, email: rec.email, consent: rec.consent, source: rec.source, ts: rec.ts, botcheck: false }),
        signal: ctrl ? ctrl.signal : undefined
      }).then(function (r) {
        if (t) clearTimeout(t);
        if (!r.ok) { var e = new Error('HTTP ' + r.status); e.kind = 'server'; throw e; }
        return r.json().then(function (j) { if (!j || j.success !== true) { var e2 = new Error('rejected'); e2.kind = 'server'; throw e2; } }, function () { var e3 = new Error('bad-json'); e3.kind = 'server'; throw e3; });
      }, function () { if (t) clearTimeout(t); var e = new Error('network'); e.kind = 'network'; throw e; });
    }
    if (IS_DEV) { // solo desarrollo local con ?dev=1
      var list = []; try { list = JSON.parse(localStorage.getItem(LS_KEY) || '[]'); } catch (e) {}
      list.push(rec); localStorage.setItem(LS_KEY, JSON.stringify(list));
      return Promise.resolve();
    }
    var err = new Error('no-endpoint'); err.kind = 'none';
    return Promise.reject(err);
  }

  form.addEventListener('submit', function (e) {
    e.preventDefault(); formError.hidden = true;
    if (form.website.value) return; // honeypot
    var name = form.name.value.trim().replace(/\s+/g, ' ');
    var email = form.email.value.trim();
    var first = null;
    var bad = function (field, msg) { setErr(field, msg); if (!first) first = form.elements[field]; };
    if (!name) bad('name', MSG.nameEmpty); else setErr('name');
    if (!email) bad('email', MSG.emailEmpty);
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) bad('email', MSG.emailInvalid);
    else setErr('email');
    if (!form.consent.checked) bad('consent', MSG.consent); else setErr('consent');
    if (first) { first.focus(); return; }
    btn.disabled = true; btn.textContent = MSG.sending;
    send({ name: name, email: email.toLowerCase(), consent: true, source: SOURCE, ts: new Date().toISOString() }).then(function () {
      form.hidden = true; if (intro) intro.hidden = true; thanks.hidden = false; thanks.focus();
    }).catch(function (err) {
      showError(err.kind === 'none' ? MSG.noEndpoint : err.kind === 'server' ? MSG.server : MSG.network);
    });
  });
  form.addEventListener('input', function (e) { var n = e.target && e.target.name; if (FIELDS[n]) setErr(n); });
  form.addEventListener('change', function (e) { var n = e.target && e.target.name; if (FIELDS[n]) setErr(n); });

  /* con el teclado abierto en móvil, mantener a la vista el campo y el botón */
  form.addEventListener('focusin', function (e) {
    if (!e.target.matches('input')) return;
    setTimeout(function () {
      var vv = window.visualViewport, h = vv ? vv.height : window.innerHeight;
      var r = btn.getBoundingClientRect(), f = e.target.getBoundingClientRect();
      var dy = 0;
      if (r.bottom > h - 8) dy = Math.min(r.bottom - h + 16, f.top - 16);
      else if (f.top < 8) dy = f.top - 16;
      if (dy) window.scrollBy({ top: dy, behavior: reduce ? 'auto' : 'smooth' });
    }, 300);
  });
})();
