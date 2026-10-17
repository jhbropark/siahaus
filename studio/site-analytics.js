(function () {
  'use strict';

  var MEASUREMENT_ID = 'G-FFGE099JDE';
  var FORM_ID = 'siahaus-project-brief';
  var FORM_ENDPOINT = 'https://formspree.io/f/xaeqleva';
  var LEAD_RELAY_ENDPOINT = 'https://script.google.com/macros/s/AKfycbyNd7HahWaM1sArcknVzvSKrEyhp0sm7Q2NdUlBPSj86HASOzk8MAQuco0LNqwvK-Xi/exec';
  var ATTRIBUTION_KEY = 'siahaus_attribution_v1';
  var UTM_KEYS = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term'];

  function readAttribution() {
    var now = new Date().toISOString();
    var saved = {};
    try { saved = JSON.parse(sessionStorage.getItem(ATTRIBUTION_KEY) || '{}'); } catch (_) {}
    if (!saved.first_seen_at) saved.first_seen_at = now;
    if (!saved.landing_page) saved.landing_page = window.location.href;
    if (!saved.referrer) saved.referrer = document.referrer || '';
    saved.last_seen_at = now;
    var params = new URLSearchParams(window.location.search);
    UTM_KEYS.forEach(function (key) {
      var value = params.get(key);
      if (value) saved[key] = value;
    });
    try { sessionStorage.setItem(ATTRIBUTION_KEY, JSON.stringify(saved)); } catch (_) {}
    return saved;
  }

  var attribution = readAttribution();
  window.dataLayer = window.dataLayer || [];
  window.gtag = window.gtag || function () { window.dataLayer.push(arguments); };
  window.gtag('js', new Date());
  window.gtag('config', MEASUREMENT_ID, {
    send_page_view: true,
    page_title: document.title,
    page_location: window.location.href
  });
  var gaScript = document.createElement('script');
  gaScript.async = true;
  gaScript.src = 'https://www.googletagmanager.com/gtag/js?id=' + MEASUREMENT_ID;
  document.head.appendChild(gaScript);

  function track(name, params) {
    window.gtag('event', name, Object.assign({ site_id: 'siahaus', form_id: FORM_ID }, params || {}));
  }

  function projectSlug(href) {
    var match = String(href || '').match(/\/projects\/([^/?#]+)/);
    return match ? match[1] : '';
  }

  function setHidden(form, name, value) {
    var field = form.querySelector('[name="' + name + '"]');
    if (field) field.value = value || '';
  }

  document.addEventListener('DOMContentLoaded', function () {
    document.querySelectorAll('a[href*="/projects/"]').forEach(function (link) {
      link.addEventListener('click', function () {
        track('project_view', {
          project_slug: projectSlug(link.getAttribute('href')),
          cta_location: link.closest('.case-card') ? 'case_studies' : 'portfolio'
        });
      }, { once: true });
    });

    document.querySelectorAll('a[href*="#brief"]').forEach(function (link) {
      link.addEventListener('click', function () {
        track('brief_click', { cta_location: link.classList.contains('project-contact-cta') ? 'project_detail' : 'navigation' });
      }, { once: true });
    });

    var form = document.querySelector('.brief-form');
    if (!form) return;
    var note = form.querySelector('.brief-note');
    var submit = form.querySelector('.brief-submit');
    setHidden(form, 'landing_page', attribution.landing_page);
    setHidden(form, 'page_url', window.location.href);
    setHidden(form, 'referrer', attribution.referrer);
    setHidden(form, 'first_seen_at', attribution.first_seen_at);
    setHidden(form, 'last_seen_at', attribution.last_seen_at);
    UTM_KEYS.forEach(function (key) { setHidden(form, key, attribution[key]); });

    var started = false;
    form.addEventListener('focusin', function () {
      if (started) return;
      started = true;
      track('brief_start', { landing_page: attribution.landing_page });
    });

    form.addEventListener('submit', async function (event) {
      event.preventDefault();
      if (submit) { submit.disabled = true; submit.textContent = '접수 중…'; }
      var data = new FormData(form);
      data.set('submitted_at', new Date().toISOString());
      data.set('page_url', window.location.href);
      track('brief_submit', { submission_status: 'attempt' });
      try {
        var response = await fetch(FORM_ENDPOINT, {
          method: 'POST',
          body: data,
          headers: { Accept: 'application/json' }
        });
        if (!response.ok) throw new Error('form_submit_failed');
        var relayPayload = new URLSearchParams();
        data.forEach(function (value, key) { if (typeof value === 'string') relayPayload.append(key, value); });
        try { navigator.sendBeacon(LEAD_RELAY_ENDPOINT, relayPayload); } catch (_) {}
        track('generate_lead', {
          submission_status: 'success',
          lead_source: 'website',
          landing_page: attribution.landing_page,
          utm_source: attribution.utm_source || '(none)',
          utm_medium: attribution.utm_medium || '(none)',
          utm_campaign: attribution.utm_campaign || '(none)'
        });
        if (note) {
          note.textContent = '브리프가 접수되었습니다. 확인 후 회신드리겠습니다.';
          note.setAttribute('data-state', 'success');
        }
        form.querySelectorAll('input, select, textarea, button').forEach(function (field) { field.disabled = true; });
      } catch (error) {
        track('brief_submit', { submission_status: 'error' });
        if (submit) { submit.disabled = false; submit.textContent = '다시 보내기 ↗'; }
        if (note) note.textContent = '접수에 실패했습니다. 잠시 후 다시 시도하거나 sia@sia.haus로 문의해 주세요.';
      }
    });
  });
})();

(function () {
  function initProjectVideoMotion() {
    var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    var videos = document.querySelectorAll('.proj-media-stage video[data-autoplay]');
    if (!videos.length || reduce || !('IntersectionObserver' in window)) return;
    var observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        var video = entry.target;
        if (entry.isIntersecting) video.play().catch(function () {});
        else video.pause();
      });
    }, { rootMargin: '180px 0px' });
    videos.forEach(function (video) { observer.observe(video); });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', initProjectVideoMotion);
  else initProjectVideoMotion();
})();
