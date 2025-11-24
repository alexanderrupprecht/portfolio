/* Configuration: filenames (without extension) */
const GALLERIES = {
  selected1: ['london2','mtfuji','heidelberg','wien','london1','fenster'],
  selected2: ['Schienen','verkaufer','religion','fahrrad','italien','strasbourg'],
  portraits:  ['lilly','hund','luca1','luca3']
};

const IMAGE_PATH = './';
const IMAGE_EXT = '.jpg';

document.addEventListener('DOMContentLoaded', () => {

  // intro animation
  document.querySelectorAll('.gallery').forEach((g,i) => {
    g.style.opacity = 0;
    g.style.transform = 'translateY(8px)';
    setTimeout(()=> { 
      g.style.transition = 'opacity 600ms cubic-bezier(.22,.9,.35,1), transform 600ms'; 
      g.style.opacity = 1; 
      g.style.transform = 'none'; 
    }, 120*i);
  });


  // gallery setup
  for (const section of document.querySelectorAll('.gallery')) {
    const key = section.dataset.gallery;
    const carousel = section.querySelector('.carousel');
    const names = GALLERIES[key] || [];

    names.forEach(name => {
      const card = document.createElement('div');
      card.className = 'card';

      const img = document.createElement('img');
      img.src = `${IMAGE_PATH}${name}${IMAGE_EXT}`;
      img.alt = name;
      img.dataset.name = name;
      img.draggable = false;

      // CLICK FIX (distinguish click/drag)
      let pointerDownX = 0;
      img.addEventListener('pointerdown', e => {
        pointerDownX = e.clientX;
        img.dataset.dragging = '0';
      });

      img.addEventListener('pointermove', e => {
        if (Math.abs(e.clientX - pointerDownX) > 8) {
          img.dataset.dragging = '1';
        }
      });

      img.addEventListener('click', () => {
        if (img.dataset.dragging === '1') return;
        openLightbox(key, name);
      });

      card.appendChild(img);

      const cap = document.createElement('div');
      cap.className = 'caption';
      cap.textContent = name;
      card.appendChild(cap);

      carousel.appendChild(card);
    });

    enableDragScroll(carousel);
  }

  document.getElementById('year').textContent = new Date().getFullYear();
  initLightbox();
});


/* Drag-scroll with momentum */
function enableDragScroll(el){
  let pointer = null;
  let startX = 0;
  let scrollStart = 0;
  let lastX = 0;
  let lastT = 0;
  let velocity = 0;
  let frame = null;

  const decel = 0.92;
  const minV = 0.02;

  el.addEventListener('pointerdown', (e) => {
    el.setPointerCapture(e.pointerId);
    pointer = e.pointerId;
    startX = e.clientX;
    scrollStart = el.scrollLeft;
    lastX = startX;
    lastT = performance.now();
    velocity = 0;
    cancelMomentum();
    el.classList.add('dragging');
  });

  el.addEventListener('pointermove', (e) => {
    if (pointer === null) return;
    const dx = e.clientX - startX;
    el.scrollLeft = scrollStart - dx;
    const now = performance.now();
    const dt = Math.max(now - lastT, 8);
    velocity = (lastX - e.clientX) / dt;
    lastX = e.clientX;
    lastT = now;

    document.querySelectorAll('.carousel img').forEach(i => i.dataset.dragging = '1');
  });

  el.addEventListener('pointerup', (e) => {
    if (pointer !== e.pointerId) return;
    el.releasePointerCapture(e.pointerId);
    pointer = null;

    setTimeout(()=> {
      document.querySelectorAll('.carousel img').forEach(i => i.dataset.dragging = '0');
    }, 60);

    el.classList.remove('dragging');
    startMomentum(velocity);
  });

  el.addEventListener('pointercancel', () => {
    pointer = null;
    el.classList.remove('dragging');
    startMomentum(velocity);
  });

  let wheelTimer = null;
  el.addEventListener('wheel', (e) => {
    if (Math.abs(e.deltaY) > Math.abs(e.deltaX)) return;
    e.preventDefault();
    el.scrollLeft += e.deltaY + e.deltaX;
    cancelMomentum();
    clearTimeout(wheelTimer);
    wheelTimer = setTimeout(()=> startMomentum(0), 60);
  }, {passive:false});


  function startMomentum(initV){
    velocity = initV;
    cancelMomentum();
    frame = requestAnimationFrame(step);
  }
  function step(){
    if (Math.abs(velocity) > minV){
      el.scrollLeft += velocity * 28;
      velocity *= decel;
      frame = requestAnimationFrame(step);
    } else {
      cancelAnimationFrame(frame);
      frame = null;
    }
  }
  function cancelMomentum(){
    if (frame) cancelAnimationFrame(frame);
    frame = null;
  }
}


/* LIGHTBOX */
let lb = null;
let current = {gallery:null, index:0, names:[]};

function initLightbox(){
  lb = document.getElementById('lightbox');
  const imgEl = lb.querySelector('.lb-image');
  const closeBtn = lb.querySelector('.lb-close');
  const nextBtn = lb.querySelector('.lb-next');
  const prevBtn = lb.querySelector('.lb-prev');

  closeBtn.addEventListener('click', closeLightbox);

  lb.addEventListener('click', (e) => {
    if (e.target === lb) closeLightbox();
  });

  nextBtn.addEventListener('click', () => navigate(1));
  prevBtn.addEventListener('click', () => navigate(-1));

  window.addEventListener('keydown', (e) => {
    if (lb.classList.contains('hidden')) return;
    if (e.key === 'Escape') closeLightbox();
    if (e.key === 'ArrowRight') navigate(1);
    if (e.key === 'ArrowLeft') navigate(-1);
  });

  // disable dragging zoom — keep image perfectly centered
  imgEl.addEventListener('pointerdown', (ev) => {
    ev.preventDefault();
  });
}

function openLightbox(galleryKey, name){
  const names = GALLERIES[galleryKey] || [];
  const idx = names.indexOf(name);

  current.gallery = galleryKey;
  current.names = names;
  current.index = idx >= 0 ? idx : 0;

  updateLightbox();
  lb.classList.remove('hidden');
  lb.setAttribute('aria-hidden','false');
  lb.querySelector('.lb-close').focus();
}

function closeLightbox(){
  lb.classList.add('hidden');
  lb.setAttribute('aria-hidden','true');
  const img = lb.querySelector('.lb-image');
  img.src = '';
  img.alt = '';
}

function navigate(dir){
  if (!current.names.length) return;
  current.index = (current.index + dir + current.names.length) % current.names.length;
  updateLightbox();
}

function updateLightbox(){
  const img = lb.querySelector('.lb-image');
  const caption = lb.querySelector('.lb-caption');
  const name = current.names[current.index];

  img.src = `${IMAGE_PATH}${name}${IMAGE_EXT}`;
  img.alt = name;

  caption.textContent = `${name} — ${current.gallery}`;
}
