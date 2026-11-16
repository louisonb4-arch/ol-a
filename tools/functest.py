"""Tests de fonctionnement (Playwright + Chrome). Usage : python3 tools/functest.py [url]"""
import asyncio, sys
from playwright.async_api import async_playwright
URL = sys.argv[1] if len(sys.argv) > 1 else 'http://localhost:8801/'
ok = []
def check(nom, cond, info=''):
    ok.append(cond); print(('OK  ' if cond else 'ÉCHEC ') + nom + (f'  [{info}]' if info else ''))
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(executable_path='/usr/bin/google-chrome', args=['--no-sandbox'])
        for W, H, nom in [(1440, 900, 'bureau'), (390, 844, 'mobile'), (360, 740, 'petit')]:
            ctx = await b.new_context(viewport={'width': W, 'height': H})
            pg = await ctx.new_page(); errs = []
            pg.on('pageerror', lambda e: errs.append(str(e)))
            pg.on('console', lambda m: errs.append(m.text) if m.type == 'error' else None)
            pg.on('response', lambda r: errs.append(f'{r.status} {r.url}') if r.status >= 400 else None)
            await pg.goto(URL); await pg.wait_for_timeout(600)
            check(f'{nom} · ouverture visible', await pg.locator('#intro').count() == 1)
            await pg.wait_for_timeout(2400)
            check(f'{nom} · ouverture retirée', await pg.locator('#intro').count() == 0)
            check(f'{nom} · hero prêt', await pg.evaluate("document.documentElement.classList.contains('pret')"))
            st = await pg.evaluate("document.querySelector('[data-statut-long]').textContent")
            check(f'{nom} · statut calculé', st.startswith(('Ouvert', 'Fermé')), st)
            check(f'{nom} · pas de débordement horizontal', await pg.evaluate("document.documentElement.scrollWidth<=innerWidth"))
            H2 = await pg.evaluate('document.body.scrollHeight')
            for y in list(range(0, H2, 500)) + [H2]:
                await pg.evaluate(f'scrollTo(0,{y})'); await pg.wait_for_timeout(70)
            await pg.wait_for_timeout(1300)
            n, v = await pg.evaluate("[document.querySelectorAll('.rv,.titre-anime,.devoile').length, document.querySelectorAll('.rv.vu,.titre-anime.vu,.devoile.vu').length]")
            check(f'{nom} · apparitions déclenchées', n == v, f'{v}/{n}')
            check(f'{nom} · logo du pied dessiné', await pg.evaluate("getComputedStyle(document.querySelector('#piedWm .f')).opacity")=='1')
            await pg.evaluate("document.getElementById('composer').scrollIntoView()"); await pg.wait_for_timeout(1500)
            await pg.click('#choix button[data-k="falafel"]'); await pg.wait_for_timeout(1500)
            ok_img, nomK, chk = await pg.evaluate("[(()=>{const p=document.querySelector('.plat.actif[data-k=falafel] img');return !!p&&p.naturalWidth>0&&getComputedStyle(p.closest('.plat')).opacity==='1'})(), document.getElementById('kNom').textContent, document.querySelector('#choix [aria-checked=true]').dataset.k]")
            check(f'{nom} · composer : falafel', nomK == 'Kaakeh falafel' and chk == 'falafel' and ok_img)
            n_vis = await pg.evaluate("[...document.querySelectorAll('.plat')].filter(p=>getComputedStyle(p).opacity>'0.5').length")
            check(f'{nom} · une seule assiette visible', n_vis == 1, str(n_vis))
            bloques = await pg.evaluate("[...document.querySelectorAll('#choix button')].filter(b=>{b.scrollIntoView({block:'center'});const r=b.getBoundingClientRect();const e=document.elementFromPoint(r.left+r.width/2,r.top+r.height/2);return !(e&&b.contains(e))}).map(b=>b.dataset.k)")
            check(f'{nom} · tous les boutons cliquables', not bloques, ','.join(bloques))
            for k in ['kafta','zaatar','poulet','royale','falafel','fromage','halloumi']:
                await pg.locator(f'#choix button[data-k="{k}"]').click(timeout=3000); await pg.wait_for_timeout(90)
            await pg.wait_for_timeout(1500)
            rap = await pg.evaluate("[document.querySelector('#choix [aria-checked=true]').dataset.k,[...document.querySelectorAll('.plat')].filter(p=>getComputedStyle(p).opacity>'0.5').map(p=>p.dataset.k).join(',')]")
            check(f'{nom} · clics rapides', rap[0]=='halloumi' and rap[1]=='halloumi', str(rap))
            await pg.focus('#choix button[data-k="falafel"]'); await pg.keyboard.press('ArrowDown'); await pg.wait_for_timeout(300)
            check(f'{nom} · composer au clavier', await pg.evaluate("document.querySelector('#choix [aria-checked=true]').dataset.k") == 'zaatar')
            if W < 1100:
                await pg.evaluate('scrollTo(0,0)'); await pg.wait_for_timeout(300)
                await pg.click('#burger'); await pg.wait_for_timeout(300)
                check(f'{nom} · menu mobile ouvert', await pg.evaluate("!document.getElementById('menuMobile').hidden"))
                await pg.click('#menuMobile a[href="#carte"]'); await pg.wait_for_timeout(1200)
                check(f'{nom} · menu fermé + ancre', await pg.evaluate("document.getElementById('menuMobile').hidden && Math.abs(document.getElementById('carte').getBoundingClientRect().top)<140"))
                await pg.evaluate('scrollTo(0,1200)'); await pg.wait_for_timeout(500)
                check(f'{nom} · barre mobile visible', await pg.evaluate("document.getElementById('barreMobile').classList.contains('on')"))
            await pg.evaluate("document.getElementById('infos').scrollIntoView()"); await pg.wait_for_timeout(400)
            await pg.click('#chargerCarte'); await pg.wait_for_timeout(300)
            check(f'{nom} · carte Google au clic', await pg.locator('#carteGeo iframe').count() == 1)
            check(f'{nom} · aucune erreur', not [e for e in errs if 'google' not in e], '; '.join(errs)[:200])
            # 2e visite : pas d'ouverture
            await pg.goto(URL); await pg.wait_for_timeout(500)
            check(f'{nom} · ouverture 1 fois par visite', await pg.locator('#intro').count() == 0)
            await ctx.close()
        ctx = await b.new_context(viewport={'width': 1440, 'height': 900}, reduced_motion='reduce')
        pg = await ctx.new_page(); await pg.goto(URL); await pg.wait_for_timeout(500)
        check('mouvement réduit · pas d\'ouverture, contenu visible', await pg.locator('#intro').count() == 0 and await pg.evaluate("document.documentElement.classList.contains('pret')"))
        for u, code in [('/mentions-legales.html', 200), ('/page-qui-nexiste-pas', 404), ('/favicon.ico', 200), ('/apple-touch-icon.png', 200), ('/robots.txt', 200), ('/sitemap.xml', 200), ('/llms.txt', 200), ('/og.jpg', 200)]:
            r = await pg.request.get(URL.rstrip('/') + u)
            check(f'fichier {u} → {code}', r.status == code, str(r.status))
        await b.close()
    print(f'\n{sum(ok)}/{len(ok)} tests OK')
asyncio.run(main())
