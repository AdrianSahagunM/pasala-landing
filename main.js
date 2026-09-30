/* PÁSALA landing v2 · main.js */
(function () {
  'use strict';

  /* ============ CONFIGURACIÓN ============
     Endpoint de la lista de espera (POST JSON: {email, source, ts}).
     null = sin endpoint todavía → en producción el formulario muestra un error honesto
     (NO finge que guardó el correo). Ejemplos: 'https://formspree.io/f/xxxx' o una función serverless. */
  var WAITLIST_ENDPOINT = 'https://api.web3forms.com/submit';
  var W3F_ACCESS_KEY = 'a157a927-4cd1-4eb0-b6fd-b296db2964bb';
  var SOURCE = 'landing-v2';
  var TIMEOUT_MS = 12000;
  /* Modo desarrollo: SOLO en localhost y con ?dev=1 se guarda en localStorage para probar la interfaz. */
  var IS_DEV = /^(localhost|127\.0\.0\.1|\[::1\])$/.test(location.hostname) && /[?&]dev=1\b/.test(location.search);
  var LS_KEY = 'pasala_waitlist_dev';

  var MSG = {
    emailInvalid: 'Escribe un correo válido, por ejemplo nombre@correo.com.',
    noEndpoint: 'El registro todavía no está abierto en esta página. Vuelve pronto, por favor.',
    network: 'No pudimos enviar tu correo. Revisa tu conexión e inténtalo de nuevo.',
    server: 'Algo falló de nuestro lado y no se guardó tu correo. Inténtalo de nuevo en unos minutos.',
    sending: 'Enviando…',
    cta: 'Quiero mi lugar en la lista'
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

  /* --- CTA fijo en móvil: aparece cuando el botón del hero sale de la pantalla y se oculta en el formulario --- */
  var sticky = document.getElementById('stickycta');
  var heroCta = document.querySelector('.hero__cta .btn');
  var formSec = document.getElementById('lista');
  if (sticky && heroCta && formSec && 'IntersectionObserver' in window) {
    var heroOut = false, formIn = false;
    var upd = function () { sticky.classList.toggle('is-on', heroOut && !formIn); };
    new IntersectionObserver(function (es) {
      var r = es[0]; heroOut = !r.isIntersecting && r.boundingClientRect.top < 0; upd();
    }).observe(heroCta);
    new IntersectionObserver(function (es) { formIn = es[0].isIntersecting; upd(); }, { threshold: 0.15 }).observe(formSec);
  }

  /* --- formulario --- */
  var form = document.getElementById('waitlist');
  var thanks = document.getElementById('thanks');
  var formError = document.getElementById('form-error');
  var btn = document.getElementById('submitbtn');

  function setErr(id, msg) {
    var el = document.getElementById(id); var field = el.closest('.field');
    if (msg) { el.textContent = msg; el.hidden = false; field.classList.add('invalid'); form.email.setAttribute('aria-invalid', 'true'); }
    else { el.hidden = true; field.classList.remove('invalid'); form.email.removeAttribute('aria-invalid'); }
  }
  function showError(msg) { formError.textContent = msg; formError.hidden = false; btn.disabled = false; btn.textContent = MSG.cta; }

  function send(rec) {
    if (WAITLIST_ENDPOINT) {
      var ctrl = ('AbortController' in window) ? new AbortController() : null;
      var t = ctrl && setTimeout(function () { ctrl.abort(); }, TIMEOUT_MS);
      return fetch(WAITLIST_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
        body: JSON.stringify({ access_key: W3F_ACCESS_KEY, subject: 'Nuevo registro lista PÁSALA', from_name: 'Landing PÁSALA', email: rec.email, source: rec.source, ts: rec.ts, botcheck: false }),
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
    var email = form.email.value.trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) { setErr('email-err', MSG.emailInvalid); form.email.focus(); return; }
    setErr('email-err');
    btn.disabled = true; btn.textContent = MSG.sending;
    send({ email: email.toLowerCase(), source: SOURCE, ts: new Date().toISOString() }).then(function () {
      form.hidden = true; thanks.hidden = false; thanks.focus();
    }).catch(function (err) {
      showError(err.kind === 'none' ? MSG.noEndpoint : err.kind === 'server' ? MSG.server : MSG.network);
    });
  });
  form.addEventListener('input', function () { setErr('email-err'); });
})();
