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

/* ── Compose ta kaakeh : assiettes illustrées qui tournent ── */
const assiette = $('#assiette');
if (assiette) {
  const K = {
    zaatar: { nom: 'Kaakeh zaatar', prix: '7,50', desc: 'Thym, sumac, sésame et huile d’olive, avec tomates, menthe et olives.', f: 15, ing: ['Zaatar & sumac', 'Huile d’olive', 'Tomates', 'Menthe', 'Olives'] },
    fromage: { nom: 'Kaakeh fromage & jambon', prix: '8,00', desc: 'Galette garnie de fromage fondant et de jambon.', f: 15, ing: ['Fromage fondant', 'Jambon'] },
    halloumi: { nom: 'Kaakeh halloumi', prix: '9,00', desc: 'Fromage halloumi grillé, tomates et sauce pesto.', f: 15, ing: ['Halloumi grillé', 'Tomates', 'Pesto'] },
    royale: { nom: 'Kaakeh royale', prix: '10,00', desc: 'Fromage et jambon, avec salade, tomates, maïs, cornichons et sauce mayo.', f: 17, ing: ['Fromage', 'Jambon', 'Salade', 'Tomates', 'Maïs', 'Cornichons', 'Mayo'] },
    kafta: { nom: 'Kaakeh kafta', prix: '11,50', desc: 'Viande hachée, persil et oignon, avec tomates, cornichon et sauce mayo.', f: 17, ing: ['Kafta grillée', 'Persil', 'Oignon rouge', 'Tomates', 'Cornichons', 'Mayo'] },
    poulet: { nom: 'Kaakeh poulet', prix: '11,50', desc: 'Poulet grillé aux épices, avec salade, cornichon et sauce à l’ail maison.', f: 17, ing: ['Poulet grillé', 'Salade', 'Cornichons', 'Sauce à l’ail'] },
    falafel: { nom: 'Kaakeh falafel', prix: '11,50', desc: 'Falafels, salade, cornichon et sauce tahini.', f: 17, ing: ['Falafels', 'Salade', 'Cornichons', 'Tahini'] },
  };
  const ordre = Object.keys(K);
  const modele = $('.plat', assiette);
  const plats = { zaatar: modele };
  const plat = k => {
    if (plats[k]) return plats[k];
    const p = modele.cloneNode(true);
    p.classList.remove('actif'); p.dataset.k = k;
    $('source', p).srcset = `img/k-${k}-440.avif 440w, img/k-${k}-720.avif 720w`;
    const i = $('img', p); i.src = `img/k-${k}-720.webp`; i.srcset = `img/k-${k}-440.webp 440w, img/k-${k}-720.webp 720w`;
    i.alt = `${K[k].nom} vue du dessus : ${K[k].ing.join(', ').toLowerCase()}`; i.loading = 'eager';
    assiette.appendChild(p); return plats[k] = p;
  };
  let courant = 'zaatar', angle = 0;
  const fiche = k => {
    const d = K[k];
    $('#kNom').textContent = d.nom; $('#kDesc').textContent = d.desc;
    $('#kPrixGrand').textContent = d.prix;
    $('#kIng').innerHTML = d.ing.map((n, i) => `<li style="animation-delay:${i * 45}ms">${n}</li>`).join('');
    $('#kFormule').innerHTML = `En formule ${d.f === 15 ? 'classique' : 'gourmande'} : <b>${d.f} €</b> avec une entrée ou un dessert, et une boisson.`;
  };
  function choisir(k) {
    if (k === courant) return;
    const dir = ordre.indexOf(k) > ordre.indexOf(courant) ? 1 : -1;
    const ancien = plats[courant], nouveau = plat(k);
    $$('#choix button').forEach(b => { const on = b.dataset.k === k; b.setAttribute('aria-checked', on); b.tabIndex = on ? 0 : -1; });
    fiche(k); courant = k;
    if (calme) { ancien.classList.remove('actif'); nouveau.classList.add('actif'); return; }
    const sortie = angle + dir * 120; angle -= dir * 120;
    ancien.getAnimations().forEach(a => a.cancel()); nouveau.getAnimations().forEach(a => a.cancel());
    ancien.animate([{ transform: `translateX(0) rotate(${angle + dir * 120}deg)`, opacity: 1 }, { transform: `translateX(${-dir * 55}%) rotate(${sortie}deg) scale(.86)`, opacity: 0 }], { duration: 750, easing: 'cubic-bezier(.7,0,.3,1)', fill: 'forwards' })
      .onfinish = () => { if (ancien.dataset.k !== courant) ancien.classList.remove('actif'); };
    nouveau.classList.add('actif');
    const go = () => nouveau.animate([{ transform: `translateX(${dir * 55}%) rotate(${angle - dir * 120}deg) scale(.86)`, opacity: 0 }, { transform: `translateX(0) rotate(${angle}deg) scale(1)`, opacity: 1 }], { duration: 900, delay: 120, easing: 'cubic-bezier(.2,.9,.25,1)', fill: 'both' });
    const img = $('img', nouveau);
    img.complete ? go() : (img.decode ? img.decode().then(go, go) : go());
    $('.scene-prix').animate([{ opacity: 0, transform: 'translateY(10px)' }, { opacity: 1, transform: 'none' }], { duration: 600, delay: 300, easing: 'cubic-bezier(.22,1,.36,1)', fill: 'both' });
  }
  fiche('zaatar');
  const boutons = $$('#choix button');
  boutons.forEach((b, i) => {
    b.addEventListener('click', () => choisir(b.dataset.k));
    b.addEventListener('pointerenter', () => plat(b.dataset.k), { once: true });
    b.addEventListener('keydown', e => {
      const dir = { ArrowDown: 1, ArrowRight: 1, ArrowUp: -1, ArrowLeft: -1 }[e.key];
      if (!dir) return; e.preventDefault();
      const n = boutons[(i + dir + boutons.length) % boutons.length]; n.focus(); choisir(n.dataset.k);
    });
  });
  // entrée en scène + préchargement des autres assiettes quand l'atelier approche
  const scene = $('#scene');
  new IntersectionObserver((es, o) => {
    if (!es[0].isIntersecting) return; o.disconnect();
    scene.classList.add('vu');
    (window.requestIdleCallback || setTimeout)(() => ordre.forEach(plat));
  }, { rootMargin: '0px 0px -15% 0px' }).observe(scene);
  // légère rotation de l'assiette au défilement
  if (!calme) addEventListener('scroll', () => {
    const r = scene.getBoundingClientRect();
    if (r.bottom < 0 || r.top > innerHeight) return;
    assiette.style.rotate = ((r.top + r.height / 2 - innerHeight / 2) * -0.04).toFixed(2) + 'deg';
  }, { passive: true });
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
