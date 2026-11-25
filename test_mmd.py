import asyncio, sys, json
from playwright.async_api import async_playwright
URL = sys.argv[1] if len(sys.argv) > 1 else 'http://localhost:8765/'
OUT = sys.argv[2] if len(sys.argv) > 2 else '/workspace/vita3d/screens/'
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(channel='chrome', args=['--use-angle=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist'])
        ctx = await b.new_context(viewport={'width':393,'height':852}, device_scale_factor=2, is_mobile=True, has_touch=True)
        pg = await ctx.new_page(); errs = []
        pg.on('console', lambda m: errs.append(f'{m.type}: {m.text}') if m.type in ('error','warning') else None)
        pg.on('pageerror', lambda e: errs.append(f'pageerror: {e}'))
        await pg.goto(URL)
        await pg.wait_for_function('window.__vita && window.__vita.ready', timeout=90000)
        await pg.wait_for_timeout(2500)
        print('morphs', len(await pg.evaluate('Object.keys(window.__vita.dict)')))
        await pg.screenshot(path=OUT+'mmd_01_default.png')
        await pg.get_by_role('button', name='Cười', exact=True).click(); await pg.wait_for_timeout(1000)
        await pg.screenshot(path=OUT+'mmd_02_cuoi.png')
        await pg.click('#tabs >> text=Miệng')
        async def setv(k, v):
            await pg.evaluate("([k,v])=>{const i=document.querySelector(`input[data-k=\"${k}\"]`); i.value=v; i.dispatchEvent(new Event('input'));}", [k, v])
        await pg.click('#btnReset'); await pg.wait_for_timeout(300)
        before = await pg.evaluate("()=>{const m=[];return JSON.stringify(window.__vita.cur)}")
        for k, v in [('びっくり',1),('お',0.8),('上',1),('照れ',0.9)]: await setv(k, v)
        await pg.wait_for_timeout(1200)
        infl = await pg.evaluate("()=>{const d=window.__vita.dict; return {o: window.__vita.cur['お']}}")
        print('slider->cur', infl)
        await pg.screenshot(path=OUT+'mmd_03_sliders_ngac_nhien.png')
        await pg.click('#btnReset'); await pg.click('#tabs >> text=Biểu cảm'); await pg.click('text=Chibi đầu to'); await pg.wait_for_timeout(800)
        await pg.get_by_role('button', name='Nháy mắt', exact=True).click(); await pg.wait_for_timeout(1000)
        await pg.screenshot(path=OUT+'mmd_04_chibi_nhay_mat.png')
        await pg.click('#btnReset'); await pg.click('#btnView'); await pg.click('#handle'); await pg.wait_for_timeout(1800)
        await pg.screenshot(path=OUT+'mmd_05_full_body.png')
        print('errors:', errs)
        await b.close()
asyncio.run(main())
