/* Olea : interactions. Vanilla JS, aucun framework, défilement natif. */
(() => {
'use strict';
const WM = '__WM__';
const NS = 'http://www.w3.org/2000/svg';
const doc = document.documentElement;
const calme = matchMedia('(prefers-reduced-motion: reduce)').matches;
const $ = (s, c = document) => c.querySelector(s);
const $$ = (s, c = document) => [...c.querySelectorAll(s)];
const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));

/* ── Logo tracé : un chemin plein + un chemin par contour pour l'effet de dessin ── */
function logo(svg, trace) {
  const f = document.createElementNS(NS, 'path');
  f.setAttribute('d', WM); f.setAttribute('fill-rule', 'evenodd'); f.setAttribute('class', 'f');
  svg.appendChild(f);
  if (!trace) return { f, t: [] };
  const t = WM.split(/(?=M)/).map(d => {
    const p = document.createElementNS(NS, 'path');
    p.setAttribute('d', d); p.setAttribute('class', 't'); svg.appendChild(p);
    const L = p.getTotalLength(); p.style.strokeDasharray = L; p.style.strokeDashoffset = L; p._L = L;
    return p;
  });
  return { f, t };
}

/* ── Ouverture : l'olive se dessine puis s'ouvre sur le site ── */
const intro = $('#intro');
const pret = () => doc.classList.add('pret');
if (intro && !doc.classList.contains('sans-intro')) {
  doc.classList.add('en-intro');
  const svg = $('#introWm');
  const { t } = logo(svg, true);
  const r = svg.getBoundingClientRect();
  intro.style.setProperty('--cx', (r.left + r.width * 230 / 590) + 'px');
  intro.style.setProperty('--cy', (r.top + r.height * 168 / 282) + 'px');
  t.forEach((p, i) => p.animate([{ strokeDashoffset: p._L }, { strokeDashoffset: 0 }], { duration: 880, delay: 60 + i * 40, easing: 'cubic-bezier(.65,0,.35,1)', fill: 'forwards' }));
  let fini = false;
  const ouvrir = () => {
    if (fini) return; fini = true;
    intro.classList.add('trace', 'ouvre');
    setTimeout(pret, 260);
    setTimeout(() => { intro.remove(); doc.classList.remove('en-intro'); }, 1150);
  };
  setTimeout(() => intro.classList.add('trace'), 820);
  const minuteur = setTimeout(ouvrir, 1400);
  const passer = () => { clearTimeout(minuteur); ouvrir(); };
  intro.addEventListener('click', passer);
  addEventListener('keydown', passer, { once: true });
} else {
  intro && intro.remove();
  requestAnimationFrame(() => requestAnimationFrame(pret));
}

/* ── Horaires & statut en direct (heure de Paris) ── */
const H = { 0: [], 1: [], 2: [[720, 870], [1140, 1290]], 3: [[720, 870], [1140, 1290]], 4: [[720, 870], [1140, 1290]], 5: [[720, 900], [1140, 1320]], 6: [[720, 900], [1140, 1320]] };
const JOURS = ['dimanche', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi'];
const hm = m => `${Math.floor(m / 60)} h${m % 60 ? ' ' + String(m % 60).padStart(2, '0') : ''}`;
function paris() {
  const p = new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/Paris', weekday: 'short', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).formatToParts(new Date());
  const g = k => p.find(x => x.type === k).value;
  return { j: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].indexOf(g('weekday')), m: (+g('hour') % 24) * 60 + +g('minute') };
}
function statut() {
  const { j, m } = paris();
  const auj = H[j]; const en = auj.find(([a, b]) => m >= a && m < b);
  let court, long;
  if (en) { court = 'Ouvert'; long = `Ouvert maintenant, jusqu’à ${hm(en[1])}`; }
  else {
    court = 'Fermé';
    const plus = auj.find(([a]) => a > m);
    if (plus) long = `Fermé, ouvre aujourd’hui à ${hm(plus[0])}`;
    else for (let i = 1; i < 8; i++) { const n = (j + i) % 7; if (H[n].length) { long = `Fermé, ouvre ${i === 1 ? 'demain' : JOURS[n]} à ${hm(H[n][0][0])}`; break; } }
  }
  $$('[data-statut]').forEach(e => e.classList.toggle('ouvert', !!en));
  $$('[data-statut-court]').forEach(e => e.textContent = court);
  $$('[data-statut-long]').forEach(e => e.textContent = long);
  $$('#horaires tr').forEach(tr => tr.classList.toggle('auj', +tr.dataset.j === j));
}
statut(); setInterval(statut, 60000);

/* ── Titres : découpe en mots (les <em> gardent leur couleur) ── */
let m = 0;
function decoupe(el) {
  [...el.childNodes].forEach(n => {
    if (n.nodeType === 3) {
      const frag = document.createDocumentFragment();
      n.textContent.split(/([ \t\n]+)/).forEach(w => {
        if (!w) return;
        if (/^[ \t\n]+$/.test(w)) { frag.appendChild(document.createTextNode(' ')); return; }
        const o = document.createElement('span'); o.className = 'mot';
        const i = document.createElement('span'); i.textContent = w; o.style.setProperty('--m', m++);
        o.appendChild(i); frag.appendChild(o);
      });
      n.replaceWith(frag);
    } else if (n.nodeType === 1) decoupe(n);
  });
}
$$('.titre-anime').forEach(el => { m = 0; decoupe(el); });

/* ── Apparitions au défilement ── */
const vu = new IntersectionObserver(es => es.forEach(e => {
  if (!e.isIntersecting) return;
  (e.target._groupe || [e.target]).forEach(x => x.classList.add('vu')); vu.unobserve(e.target);
}), { rootMargin: '0px 0px -10% 0px', threshold: .08 });
// carrousel d'avis : les cartes hors écran à droite apparaissent avec leur rangée
const rangee = $('.avis-liste');
if (rangee) { rangee._groupe = $$('.rv', rangee); vu.observe(rangee); }
$$('.rv,.titre-anime,.devoile').filter(el => !el.closest('.avis-liste')).forEach((el, i) => {
  if (el.classList.contains('rv')) {
    const freres = [...el.parentElement.children].filter(x => x.classList.contains('rv'));
    el.style.setProperty('--d', (freres.indexOf(el) * 0.08) + 's');
  }
  vu.observe(el);
});
$$('.avis-liste .rv').forEach((el, i) => el.style.setProperty('--d', (i * 0.08) + 's'));

/* ── Compteurs (note Google) ── */
const cpt = new IntersectionObserver(es => es.forEach(e => {
  if (!e.isIntersecting) return; cpt.unobserve(e.target);
  const el = e.target, fin = parseFloat(el.dataset.compte), dec = String(el.dataset.compte).includes('.') ? 1 : 0;
  if (calme) return;
  const t0 = performance.now();
  (function pas(t) {
    const p = clamp((t - t0) / 1300), v = fin * (1 - Math.pow(1 - p, 3));
    el.textContent = v.toFixed(dec).replace('.', ',');
    if (p < 1) requestAnimationFrame(pas);
  })(t0);
}), { threshold: .6 });
$$('[data-compte]').forEach(el => cpt.observe(el));

/* ── En-tête, barre mobile, liens actifs ── */
const tete = $('#tete'), barre = $('#barreMobile');
let dernierY = scrollY;
const liens = $$('.tete-nav a');
const sections = liens.map(a => $(a.getAttribute('href'))).filter(Boolean);
const actif = new IntersectionObserver(es => es.forEach(e => {
  if (e.isIntersecting) liens.forEach(a => a.classList.toggle('actif', a.getAttribute('href') === '#' + e.target.id));
}), { rootMargin: '-45% 0px -50% 0px' });
sections.forEach(s => actif.observe(s));

/* ── Menu mobile ── */
const burger = $('#burger'), menu = $('#menuMobile');
function basculer(ouvrir) {
  burger.setAttribute('aria-expanded', ouvrir); burger.setAttribute('aria-label', ouvrir ? 'Fermer le menu' : 'Ouvrir le menu');
  menu.hidden = !ouvrir; doc.classList.toggle('menu-ouvert', ouvrir);
  $('#contenu').inert = ouvrir;
}
burger.addEventListener('click', () => basculer(menu.hidden));
$$('a', menu).forEach(a => a.addEventListener('click', () => basculer(false)));
addEventListener('keydown', e => { if (e.key === 'Escape' && !menu.hidden) { basculer(false); burger.focus(); } });

/* ── Cartes empilées : la carte recouverte recule légèrement ── */
const cartes = $$('.carte-pile');
cartes.forEach((c, i) => { c.style.setProperty('--i', i); const v = document.createElement('span'); v.className = 'voile'; c.appendChild(v); c._v = v; });

/* ── Parallaxe du triptyque ── */
const tps = $$('[data-vitesse]');

/* ── Logo du pied qui se dessine au défilement ── */
const pied = $('#piedWm');
const piedLogo = logo(pied, !calme);
if (!calme) piedLogo.f.style.opacity = 0;

/* ── Boucle de défilement unique ── */
let demande = false;
function cadre() {
  demande = false;
  const y = scrollY, vh = innerHeight;
  tete.classList.toggle('plein', y > 24);
  if (!doc.classList.contains('menu-ouvert')) tete.classList.toggle('cache', y > 700 && y > dernierY + 4 ? true : (y < dernierY - 4 ? false : tete.classList.contains('cache') && y > 700));
  dernierY = y;
  barre && barre.classList.toggle('on', y > vh * .7);
  if (calme) return;
  if (y < vh * 1.6) tps.forEach(f => { f.style.transform = `translate3d(0,${(y * parseFloat(f.dataset.vitesse)).toFixed(1)}px,0)`; });
  for (let i = 0; i < cartes.length - 1; i++) {
    const a = cartes[i].getBoundingClientRect(), b = cartes[i + 1].getBoundingClientRect();
    const p = clamp(1 - (b.top - a.top - 22) / Math.max(1, a.height - 22));
    cartes[i].style.transform = `scale(${(1 - p * .05).toFixed(4)})`;
    cartes[i]._v.style.opacity = (p * .22).toFixed(3);
  }
  if (piedLogo.t.length) {
    const r = pied.getBoundingClientRect();
    const p = clamp((vh - r.top) / (r.height * .95 + vh * .05));
    const n = piedLogo.t.length;
    piedLogo.t.forEach((s, j) => { const q = clamp(p * 1.35 - j * (.35 / n)); s.style.strokeDashoffset = (s._L * (1 - q)).toFixed(1); s.style.opacity = p > .97 ? 0 : 1; });
    piedLogo.f.style.opacity = p > .97 ? 1 : 0;
  }
}
const surDefil = () => { if (!demande) { demande = true; requestAnimationFrame(cadre); } };
addEventListener('scroll', surDefil, { passive: true });
addEventListener('resize', surDefil);
cadre();

/* ── Galette décorative (section kaakeh) ── */
const deco = $('#galetteDeco');
if (deco) for (let i = 0; i < 46; i++) {
  const a = i * 2.39996, rr = 9 * Math.sqrt(i + 1) + 6;
  if (rr > 76) break;
  const e = document.createElementNS(NS, 'ellipse');
  e.setAttribute('cx', (100 + rr * Math.cos(a)).toFixed(1)); e.setAttribute('cy', (100 + rr * Math.sin(a)).toFixed(1));
  e.setAttribute('rx', 2.6); e.setAttribute('ry', 1.4); e.setAttribute('class', 'graine');
  e.setAttribute('transform', `rotate(${(a * 57.3 % 180).toFixed(0)} ${(100 + rr * Math.cos(a)).toFixed(1)} ${(100 + rr * Math.sin(a)).toFixed(1)})`);
  deco.appendChild(e);
}

/* ── Compose ta kaakeh ── */
const plateau = $('#plateau');
if (plateau) {
  // pseudo-aléatoire reproductible
  const graine = s => { let h = 2166136261; for (const c of s) h = Math.imul(h ^ c.charCodeAt(0), 16777619); return () => { h = Math.imul(h ^ (h >>> 15), 2246822507); h = Math.imul(h ^ (h >>> 13), 3266489909); return ((h ^= h >>> 16) >>> 0) / 4294967296; }; };
  // galette au bord irrégulier
  let d = '';
  for (let i = 0; i <= 72; i++) {
    const a = i / 72 * Math.PI * 2, r = 158 + 3.2 * Math.sin(a * 7) + 2 * Math.sin(a * 13 + 1);
    d += (i ? 'L' : 'M') + (200 + r * Math.cos(a)).toFixed(1) + ',' + (200 + r * Math.sin(a)).toFixed(1);
  }
  $('.galette', plateau).setAttribute('d', d + 'Z');
  const ses = $('#sesame'), rnd0 = graine('sesame');
  for (let i = 0; i < 95; i++) {
    const a = rnd0() * Math.PI * 2, r = Math.sqrt(rnd0()) * 146, x = 200 + r * Math.cos(a), y = 200 + r * Math.sin(a);
    ses.insertAdjacentHTML('beforeend', `<ellipse cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" rx="3.4" ry="1.9" transform="rotate(${(rnd0() * 180).toFixed(0)} ${x.toFixed(1)} ${y.toFixed(1)})"/>`);
  }

  const L = '#3D4630';
  const ING = {
    tomate: { nom: 'Tomates', r: 22, svg: `<circle r="21" fill="#E2836B" stroke="${L}" stroke-width="1.6"/><circle r="15" fill="#EFA48F"/><path d="M0-12V12M-11 6 11-6M-11-6 11 6" stroke="#E2836B" stroke-width="3" stroke-linecap="round"/><g fill="#F7DCB5"><ellipse cx="6" cy="-7" rx="2" ry="3"/><ellipse cx="-7" cy="5" rx="2" ry="3"/><ellipse cx="7" cy="6" rx="2" ry="3"/><ellipse cx="-6" cy="-7" rx="2" ry="3"/></g>` },
    menthe: { nom: 'Menthe', r: 14, svg: `<path d="M0 15C-12 6-10-10 0-16 10-10 12 6 0 15z" fill="#9DB27A" stroke="${L}" stroke-width="1.4"/><path d="M0 13V-12" stroke="${L}" stroke-width="1" fill="none"/>` },
    olive: { nom: 'Olives', r: 12, svg: `<ellipse rx="9" ry="12" fill="#56603F" stroke="${L}" stroke-width="1.4"/><ellipse cx="-3" cy="-4" rx="2.5" ry="4" fill="#7E8A60"/>` },
    fromage: { nom: 'Fromage fondant', r: 30, svg: `<path d="M-30-8C-22-26 18-28 28-12 36 0 22 20 4 22-14 26-34 10-30-8z" fill="#F4DE9E" stroke="${L}" stroke-width="1.6"/><path d="M-14 0c6 4 14 4 20-2" fill="none" stroke="#E2C46E" stroke-width="2.4" stroke-linecap="round"/>` },
    jambon: { nom: 'Jambon', r: 26, svg: `<circle r="25" fill="#EDB3A6" stroke="${L}" stroke-width="1.6"/><path d="M-14-8c8 6 14-2 22 4M-10 10c6-4 12 2 18-2" fill="none" stroke="#F7D7CE" stroke-width="3" stroke-linecap="round"/>` },
    halloumi: { nom: 'Halloumi grillé', r: 26, svg: `<rect x="-26" y="-15" width="52" height="30" rx="7" fill="#F5EBD3" stroke="${L}" stroke-width="1.6"/><path d="M-16-15-6 15M-2-15 8 15M12-15 20 9" stroke="#C99A5F" stroke-width="3" stroke-linecap="round"/>` },
    salade: { nom: 'Salade', r: 22, svg: `<path d="M-22 4c-2-10 6-18 14-14 2-8 14-8 16 0 8-2 14 8 8 14 4 8-4 14-12 10-6 6-16 4-18-2-8 0-12-4-8-8z" fill="#C6D69E" stroke="${L}" stroke-width="1.5"/><path d="M-12 8 12-6M-4 3l2 8M4-2l3 8" stroke="#8FA65E" stroke-width="1.3" fill="none" stroke-linecap="round"/>` },
    mais: { nom: 'Maïs', r: 6, svg: `<rect x="-5" y="-5" width="10" height="10" rx="3.5" fill="#F2CD5C" stroke="${L}" stroke-width="1.2"/>` },
    cornichon: { nom: 'Cornichons', r: 18, svg: `<ellipse rx="19" ry="8" fill="#8E9F5C" stroke="${L}" stroke-width="1.5"/><g fill="#B6C482"><circle cx="-9" cy="-1" r="1.5"/><circle cx="-2" cy="2" r="1.5"/><circle cx="6" cy="-2" r="1.5"/><circle cx="12" cy="1" r="1.5"/></g>` },
    kafta: { nom: 'Kafta', r: 32, svg: `<rect x="-32" y="-10" width="64" height="20" rx="10" fill="#8F583F" stroke="${L}" stroke-width="1.6"/><path d="M-20-6v12M-8-6v12M4-6v12M16-6v12" stroke="#6E3F2C" stroke-width="2" stroke-linecap="round"/>` },
    persil: { nom: 'Persil', r: 10, svg: `<g fill="#7FA05A" stroke="${L}" stroke-width="1"><circle cx="0" cy="-6" r="5"/><circle cx="-6" cy="3" r="5"/><circle cx="6" cy="3" r="5"/></g>` },
    oignon: { nom: 'Oignons', r: 16, svg: `<path d="M-15 4a15 15 0 0 1 30 0" fill="none" stroke="#B57FA6" stroke-width="5" stroke-linecap="round"/><path d="M-9 4a9 9 0 0 1 18 0" fill="none" stroke="#D9B4CF" stroke-width="3.5" stroke-linecap="round"/>` },
    poulet: { nom: 'Poulet grillé', r: 30, svg: `<path d="M-30 6C-18-10 14-14 30-4l-4 10C10-2-14 2-26 16z" fill="#D7A066" stroke="${L}" stroke-width="1.6"/><path d="M-14 0l-3 8M-2-4l-3 9M10-6l-2 8" stroke="#A86F3C" stroke-width="2.4" stroke-linecap="round"/>` },
    falafel: { nom: 'Falafels', r: 17, svg: `<circle r="16" fill="#9C7A3E" stroke="${L}" stroke-width="1.6"/><g fill="#7C9A4C"><circle cx="-6" cy="-5" r="2"/><circle cx="5" cy="-7" r="1.6"/><circle cx="7" cy="5" r="2"/><circle cx="-4" cy="7" r="1.6"/></g><circle cx="1" cy="0" r="1.6" fill="#C9A96A"/>` },
    zaatar: { nom: 'Zaatar & sumac', r: 0 },
    huile: { nom: 'Huile d’olive', sauce: '#D4B54A' },
    pesto: { nom: 'Sauce pesto', sauce: '#7F9D4C' },
    mayo: { nom: 'Sauce mayo', sauce: '#FBF1D3' },
    ail: { nom: 'Sauce à l’ail maison', sauce: '#FFF8E8' },
    tahini: { nom: 'Sauce tahini', sauce: '#E9D2A6' },
  };
  const K = {
    zaatar: { nom: 'Kaakeh zaatar', desc: 'Thym, sumac, sésame et huile d’olive, avec tomates, menthe et olives.', f: 15, ing: [['zaatar'], ['tomate', 4], ['olive', 6], ['menthe', 6], ['huile']] },
    fromage: { nom: 'Kaakeh fromage & jambon', desc: 'Galette garnie de fromage fondant et de jambon.', f: 15, ing: [['fromage', 4], ['jambon', 4]] },
    halloumi: { nom: 'Kaakeh halloumi', desc: 'Fromage halloumi, tomates et sauce pesto.', f: 15, ing: [['halloumi', 5], ['tomate', 4], ['pesto']] },
    royale: { nom: 'Kaakeh royale', desc: 'Fromage et jambon, avec salade, tomates, maïs, cornichons et sauce mayo.', f: 17, ing: [['salade', 4], ['fromage', 2], ['jambon', 3], ['tomate', 3], ['cornichon', 3], ['mais', 12], ['mayo']] },
    kafta: { nom: 'Kaakeh kafta', desc: 'Viande hachée, persil et oignon, avec tomates, cornichon et sauce mayo.', f: 17, ing: [['kafta', 4], ['tomate', 3], ['oignon', 4], ['cornichon', 3], ['persil', 8], ['mayo']] },
    poulet: { nom: 'Kaakeh poulet', desc: 'Poulet grillé aux épices, avec salade, cornichon et sauce à l’ail maison.', f: 17, ing: [['salade', 5], ['poulet', 6], ['cornichon', 3], ['ail']] },
    falafel: { nom: 'Kaakeh falafel', desc: 'Falafels, salade, cornichon et sauce tahini.', f: 17, ing: [['salade', 5], ['falafel', 7], ['cornichon', 3], ['tahini']] },
  };
  const gar = $('#garniture'), galette = $('#galette');
  let rot = 0, courant = null;

  function places(nom) {
    const rnd = graine(nom), pts = [], out = [];
    K[nom].ing.forEach(([type, n = 1]) => {
      const def = ING[type];
      if (type === 'zaatar') {
        for (let i = 0; i < 120; i++) { const a = rnd() * 6.283, r = Math.sqrt(rnd()) * 140; out.push({ brut: `<circle cx="${(200 + r * Math.cos(a)).toFixed(1)}" cy="${(200 + r * Math.sin(a)).toFixed(1)}" r="${(1.4 + rnd() * 1.8).toFixed(1)}" fill="${rnd() < .78 ? '#6F7F3E' : '#A8473A'}"/>`, fond: true }); }
        return;
      }
      if (def.sauce) {
        const P = [];
        for (let i = 0; i < 9; i++) { const t = i / 8; P.push([96 + t * 208, 140 + t * 120 + (i % 2 ? -1 : 1) * (26 + rnd() * 14)]); }
        let c = `M${P[0][0].toFixed(0)},${P[0][1].toFixed(0)}`;
        for (let i = 1; i < P.length - 1; i++) { const mx = (P[i][0] + P[i + 1][0]) / 2, my = (P[i][1] + P[i + 1][1]) / 2; c += ` Q${P[i][0].toFixed(0)},${P[i][1].toFixed(0)} ${mx.toFixed(0)},${my.toFixed(0)}`; }
        out.push({ brut: `<path d="${c}" fill="none" stroke="${type === 'huile' ? '#B8962E' : '#8C7B5A'}" stroke-width="${type === 'huile' ? 6 : 8}" stroke-linecap="round" opacity=".35"/><path d="${c}" fill="none" stroke="${def.sauce}" stroke-width="${type === 'huile' ? 3.5 : 5}" stroke-linecap="round" opacity="${type === 'huile' ? .85 : 1}"/>`, sauce: true });
        return;
      }
      for (let k = 0; k < n; k++) {
        let best = null;
        for (let essai = 0; essai < 40; essai++) {
          const a = rnd() * 6.283, r = Math.sqrt(rnd()) * (128 - def.r * .6), x = 200 + r * Math.cos(a), y = 200 + r * Math.sin(a);
          const marge = pts.reduce((mn, q) => Math.min(mn, Math.hypot(q.x - x, q.y - y) - q.r - def.r * .75), 1e9);
          if (!best || marge > best.marge) best = { x, y, marge };
          if (marge > 6) break;
        }
        pts.push({ x: best.x, y: best.y, r: def.r * .75 });
        out.push({ x: best.x, y: best.y, rot: rnd() * 360, s: .9 + rnd() * .25, svg: def.svg });
      }
    });
    return out;
  }

  function choisir(nom, anime = true) {
    if (nom === courant) return; courant = nom;
    const k = K[nom];
    $$('#choix button').forEach(b => { const on = b.dataset.k === nom; b.setAttribute('aria-checked', on); b.tabIndex = on ? 0 : -1; });
    $('#kNom').textContent = k.nom; $('#kDesc').textContent = k.desc;
    const noms = k.ing.map(([t]) => ING[t].nom);
    $('#kIng').innerHTML = noms.map((n, i) => `<li style="animation-delay:${i * 50}ms">${n}</li>`).join('');
    $('#kFormule').innerHTML = `En formule ${k.f === 15 ? 'classique' : 'gourmande'} : <b>${k.f} €</b> avec une entrée ou un dessert, et une boisson.`;
    const vieux = [...gar.children];
    const bouge = anime && !calme;
    vieux.forEach((g, i) => {
      const inner = g.firstElementChild;
      if (!bouge) return g.remove();
      inner.animate([{ opacity: 1, transform: 'scale(1)' }, { opacity: 0, transform: 'scale(.4)' }], { duration: 260, delay: Math.min(i * 6, 160), easing: 'ease-in', fill: 'forwards' }).onfinish = () => g.remove();
    });
    rot += 48; galette.style.transform = `rotate(${rot}deg)`;
    const items = places(nom);
    let n = 0;
    items.forEach(it => {
      const g = document.createElementNS(NS, 'g');
      if (it.brut) g.innerHTML = `<g class="ing">${it.brut}</g>`;
      else { g.setAttribute('transform', `translate(${it.x.toFixed(1)} ${it.y.toFixed(1)}) rotate(${it.rot.toFixed(0)}) scale(${it.s.toFixed(2)})`); g.innerHTML = `<g class="ing">${it.svg}</g>`; }
      gar.appendChild(g);
      if (!bouge) return;
      const inner = g.firstElementChild;
      const delai = 230 + (it.fond ? 0 : it.sauce ? 520 : (n++) * 32);
      if (it.sauce) {
        const ps = $$('path', inner); const len = ps[0].getTotalLength();
        ps.forEach(p => p.animate([{ strokeDasharray: len, strokeDashoffset: len }, { strokeDasharray: len, strokeDashoffset: 0 }], { duration: 700, delay: delai, easing: 'cubic-bezier(.6,0,.3,1)', fill: 'both' }));
      } else if (it.fond) {
        inner.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 500, delay: delai, fill: 'both' });
      } else {
        inner.animate([{ opacity: 0, transform: 'translateY(-46px) scale(1.4)' }, { opacity: 1, transform: 'translateY(0) scale(1)' }], { duration: 620, delay: delai, easing: 'cubic-bezier(.3,1.45,.5,1)', fill: 'both' });
      }
    });
  }
  const boutons = $$('#choix button');
  boutons.forEach((b, i) => {
    b.addEventListener('click', () => choisir(b.dataset.k));
    b.addEventListener('keydown', e => {
      const dir = { ArrowDown: 1, ArrowRight: 1, ArrowUp: -1, ArrowLeft: -1 }[e.key];
      if (!dir) return; e.preventDefault();
      const n = boutons[(i + dir + boutons.length) % boutons.length]; n.focus(); choisir(n.dataset.k);
    });
  });
  // première composition jouée quand l'atelier arrive à l'écran
  choisir('zaatar', false);
  [...gar.children].forEach(g => g.style.opacity = 0);
  const premiere = new IntersectionObserver(es => {
    if (!es[0].isIntersecting) return; premiere.disconnect();
    courant = null; choisir('zaatar', true);
  }, { threshold: .35 });
  premiere.observe(plateau);
}

/* ── Carte Google chargée au clic (pas de requête Google avant) ── */
const btnCarte = $('#chargerCarte');
btnCarte && btnCarte.addEventListener('click', () => {
  const f = document.createElement('iframe');
  f.src = 'https://www.google.com/maps?q=Olea,+16+rue+de+la+Juiverie,+44000+Nantes&z=17&output=embed';
  f.title = 'Plan d’accès à Olea'; f.loading = 'lazy'; f.referrerPolicy = 'no-referrer-when-downgrade';
  $('#carteGeo').appendChild(f);
});
})();
