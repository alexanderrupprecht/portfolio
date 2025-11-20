/* =========================
   Modern gallery + momentum + parallax
   Einfach: Bildlisten in 'galleries' anpassen
   ========================= */

  window.scrollTo(0, 1);
  window.scrollTo(0, 0);

const galleries = {
  home: [

  ],
  portraits: [
    "mtfuji.jpg",
    "london2.jpg",
    "heidelberg.jpg",
    "wien.jpg",
    "london1.jpg",
    "fenster.jpg",

  ],
  food: [
    "schienen.jpg",
    "verkaufer.jpg",
    "religion.jpg",
    "fahrrad.jpg",
    "italien.jpg", 
    "strasbourg.jpg",
  ],
  events: [
     "lilly.jpg",
    "hund.jpg",
    "luca1.jpg",
    "luca3.jpg"
  ]
};

//Funktion die laut Chati mein problem fixen sollte 

function waitForImages(track) {
  const images = Array.from(track.querySelectorAll("img"));
  return Promise.all(images.map(img => {
    if (img.complete) return Promise.resolve();
    return new Promise(res => img.onload = img.onerror = res);
  }));
}


/* small helpers */
const $ = (q, root=document) => root.querySelector(q);
const $all = (q, root=document) => Array.from(root.querySelectorAll(q));


/* Populate galleries */

/* Populate galleries - ersetzt deine aktuelle Funktion */
function populateGalleries(){
  $all(".image-track").forEach(track => {
    const key = track.dataset.gallery;
    let list = galleries[key] || [];
    if (key === "home") {
      const col = Object.values(galleries).flat();
      list = Array.from(new Set(col));
    }

    track.innerHTML = "";

    list.forEach(src => {
      const wrap = document.createElement("div");
      wrap.className = "img-wrap";

const inner = document.createElement("div");
inner.className = "img-inner";

const img = document.createElement("img");
inner.appendChild(img);
wrap.appendChild(inner);      img.src = src;
      img.alt = `${key} — ${src}`;
      img.loading = "lazy";
      img.draggable = false;
      track.appendChild(wrap);

      // nur ein click-handler
      img.addEventListener("click", () => openLightbox(src, img.alt));
    });

    // initial state
    track._state = {
      isDown: false,
      startX: 0,
      startTranslate: 0,
      translateX: 0,
      minTranslate: 0,
      maxTranslate: 0,
      lastX: 0,
      lastTime: 0,
      velocity: 0,
      momentumId: null
    };

 
  });
}


/* compute how far the track can move */
function computeLimits(track){
  const wrapper = track.parentElement;
  const imgs = $all("img", track);
  const gap = parseFloat(getComputedStyle(track).gap) || 16;
  const style = getComputedStyle(track);
  const padLeft = parseFloat(style.paddingLeft) || 0;
  const padRight = parseFloat(style.paddingRight) || 0;

  let total = 0;
  imgs.forEach(i => total += i.getBoundingClientRect().width);
  total += Math.max(0, imgs.length - 1) * gap + padLeft + padRight;

  const container = wrapper.getBoundingClientRect().width;
  const minTranslate = Math.min(0, container - total);
  const maxTranslate = 0;

  track._state.minTranslate = minTranslate;
  track._state.maxTranslate = maxTranslate;

  // center small galleries
  if (total <= container) {
    const center = (container - total) / 2;
    track._state.translateX = center;
    applyTranslate(track, center);
  } else {
    if (track._state.translateX > maxTranslate) track._state.translateX = maxTranslate;
    if (track._state.translateX < minTranslate) track._state.translateX = minTranslate;
    applyTranslate(track, track._state.translateX || 0);
  }
}

/* apply px translate and small parallax */
function applyTranslate(track, px){
  track.style.transform = `translateX(${px}px) translateY(-50%)`;

  const wraps = track.querySelectorAll(".img-wrap");
  const container = track.parentElement.getBoundingClientRect().width;
  const factor = (px / container) * 18;

  wraps.forEach((wrap,i) => {
    const img = wrap.querySelector("img");

    const offset = factor * (i - wraps.length/2) * 0.08;
    img.style.objectPosition = `${50 + offset}% center`;

    const rect = wrap.getBoundingClientRect();
    const centerX = rect.left + rect.width/2;
    const containerCenter = track.parentElement.getBoundingClientRect().left + container/2;
    const dist = Math.abs(centerX - containerCenter);

    const s = 1.06 - Math.min(0.06, dist / container);
    wrap.style.transform = `scale(${s})`;
  });
}


/* drag + touch + momentum */
function bindInteractions(){
  $all(".image-track").forEach(track => {
    // prevent image drag
    track.addEventListener("dragstart", e => e.preventDefault());

    // MOUSE
    track.addEventListener("mousedown", e => {
      e.preventDefault();
      startDrag(track, e.clientX);
    });
    window.addEventListener("mousemove", e => {
      if (!track._state.isDown) return;
      onDrag(track, e.clientX);
    });
    window.addEventListener("mouseup", () => { if (track._state.isDown) endDrag(track); });

    // TOUCH
    track.addEventListener("touchstart", e => {
      const t = e.touches[0];
      startDrag(track, t.clientX);
    }, {passive:true});
    track.addEventListener("touchmove", e => {
      if (!track._state.isDown) return;
      const t = e.touches[0];
      onDrag(track, t.clientX);
    }, {passive:true});
    window.addEventListener("touchend", () => { if (track._state.isDown) endDrag(track); });
  });
}

function startDrag(track, clientX){
  // stop any running momentum
  if (track._state.momentumId) cancelAnimationFrame(track._state.momentumId);
  track._state.isDown = true;
  track._state.startX = clientX;
  track._state.startTranslate = track._state.translateX || 0;
  track._state.lastX = clientX;
  track._state.lastTime = performance.now();
  track._state.velocity = 0;
  track.classList.add("dragging");
}

function onDrag(track, clientX){
  const dx = clientX - track._state.startX;
  let next = track._state.startTranslate + dx;
  // clamp but allow slight overdrag for feel
  const over = 80;
  if (next < track._state.minTranslate - over) next = track._state.minTranslate - over;
  if (next > track._state.maxTranslate + over) next = track._state.maxTranslate + over;
  track._state.translateX = next;
  applyTranslate(track, next);

  // velocity calc
  const now = performance.now();
  const dt = Math.max(1, now - track._state.lastTime);
  const vx = (clientX - track._state.lastX) / dt; // px per ms
  // simple smoothing
  track._state.velocity = track._state.velocity * 0.85 + vx * 0.15;
  track._state.lastX = clientX;
  track._state.lastTime = now;
}

function endDrag(track){
  track._state.isDown = false;
  track.classList.remove("dragging");
  // momentum: convert velocity to px/sec and start decay
  let velocity = track._state.velocity * 1000; // px/sec
  const decay = 0.95; // friction factor per frame
  function step(){
    velocity *= decay;
    if (Math.abs(velocity) < 10) {
      // stop and clamp to bounds
      if (track._state.translateX > track._state.maxTranslate) {
        animateTo(track, track._state.maxTranslate, 300);
      } else if (track._state.translateX < track._state.minTranslate) {
        animateTo(track, track._state.minTranslate, 300);
      }
      track._state.momentumId = null;
      return;
    }
    track._state.translateX += velocity * (1/60); // frame step approx
    // clamp with rubberband effect
    const min = track._state.minTranslate;
    const max = track._state.maxTranslate;
    if (track._state.translateX < min) {
      track._state.translateX = Math.max(min - 60, track._state.translateX);
      velocity *= 0.6;
    }
    if (track._state.translateX > max) {
      track._state.translateX = Math.min(max + 60, track._state.translateX);
      velocity *= 0.6;
    }
    applyTranslate(track, track._state.translateX);
    track._state.momentumId = requestAnimationFrame(step);
  }
  track._state.momentumId = requestAnimationFrame(step);
}

/* gentle animate to px (ms duration) */
function animateTo(track, toPx, duration=360){
  const from = track._state.translateX || 0;
  const start = performance.now();
  function frame(now){
    const t = Math.min(1, (now - start)/duration);
    // ease out cubic
    const eased = 1 - Math.pow(1 - t, 3);
    const val = from + (toPx - from) * eased;
    track._state.translateX = val;
    applyTranslate(track, val);
    if (t < 1) requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
}

/* Recompute on resize */
let resizeTimer = null;
function setupResize(){
  window.addEventListener("resize", () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => {
      $all(".image-track").forEach(computeLimits);
    }, 120);
  });
}

/* Navigation + mobile */
function setupNav(){
  $all('a[data-target]').forEach(a => {
    a.addEventListener("click", (e) => {
      const mobile = $("#mobile-menu");
      if (mobile && !mobile.hidden) toggleMobile(false);
      const href = a.getAttribute("href");
      if (href && href.startsWith("#")) {
        e.preventDefault();
        const targetId = href.slice(1);
        const el = document.getElementById(targetId);
        if (el) {
          const top = el.getBoundingClientRect().top + window.scrollY - 18;
          window.scrollTo({ top, behavior: 'smooth' });
        }
      }
    });
  });

  const ham = $("#hamburger");
  const mobile = $("#mobile-menu");
  ham.addEventListener("click", () => {
    const open = ham.getAttribute("aria-expanded") === "true";
    toggleMobile(!open);
  });
  function toggleMobile(show){
    ham.setAttribute("aria-expanded", show ? "true" : "false");
    if (show) mobile.hidden = false; else mobile.hidden = true;
  }
}

/* Lightbox (simple) */
function openLightbox(src, alt){
  // create overlay
  const overlay = document.createElement("div");
  overlay.style.position = "fixed";
  overlay.style.inset = 0;
  overlay.style.background = "rgba(0,0,0,0.8)";
  overlay.style.display = "flex";
  overlay.style.alignItems = "center";
  overlay.style.justifyContent = "center";
  overlay.style.zIndex = 2000;
  overlay.style.cursor = "zoom-out";

  const img = document.createElement("img");
  img.src = src;
  img.alt = alt;
  img.style.maxWidth = "92%";
  img.style.maxHeight = "92%";
  img.style.borderRadius = "12px";
  img.style.boxShadow = "0 30px 80px rgba(0,0,0,0.7)";
  img.style.objectFit = "contain";

  overlay.appendChild(img);
  overlay.addEventListener("click", () => {
    document.body.removeChild(overlay);
  });
  document.body.appendChild(overlay);
}

/* Contact form demo */
function setupContactForm(){
  const form = $("#contact-form");
  if (!form) return;
  form.addEventListener("submit", e => {
    e.preventDefault();
    const btn = form.querySelector("button[type=submit]");
    btn.textContent = "Gesendet (Demo)";
    setTimeout(() => { btn.textContent = "Nachricht senden"; form.reset(); }, 1600);
  });
  const dl = $("#download-pricelist");
  if (dl) dl.addEventListener("click", () => alert("Demo: Preisliste herunterladen (hier Backend/Link einsetzen)."));
}

/* Init */
document.addEventListener("DOMContentLoaded", () => {
  populateGalleries();
  bindInteractions();
  setupResize();
  setupNav();
  setupContactForm();
  // footer year
  $("#year").textContent = new Date().getFullYear();
});

//mein selbsterstellter fix (und er funktioniert!!!)
let clickTimeout;
window.addEventListener("click", () => {
  clearTimeout(clickTimeout);
  clickTimeoutTimeout = setTimeout(() => {
    window.dispatchEvent(new Event("resize"));
  }, 120);
}); 
let scrollTimeout;
window.addEventListener("scroll", () => {
  clearTimeout(scrollTimeout);
  scrollTimeoutTimeout = setTimeout(() => {
    window.dispatchEvent(new Event("resize"));
  }, 120);
}); 
