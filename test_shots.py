import asyncio, sys
from playwright.async_api import async_playwright
URL = sys.argv[1] if len(sys.argv) > 1 else 'http://localhost:8765/'
OUT = '/workspace/vita3d/screens/'
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(channel='chrome', args=['--use-angle=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist'])
        ctx = await b.new_context(viewport={'width':393,'height':852}, device_scale_factor=2, is_mobile=True, has_touch=True)
        pg = await ctx.new_page(); errs = []
        pg.on('console', lambda m: errs.append(f'{m.type}: {m.text}') if m.type in ('error','warning') else None)
        pg.on('pageerror', lambda e: errs.append(f'pageerror: {e}'))
        await pg.goto(URL); await pg.wait_for_timeout(2500)
        await pg.screenshot(path=OUT+'01_default.png')
        # sliders
        async def setv(k, v):
            await pg.evaluate("([k,v])=>{const i=document.getElementById('s_'+k); i.value=v; i.dispatchEvent(new Event('input'));}", [k, v])
        before = await pg.evaluate("()=>JSON.stringify(window.__vita.cur)")
        for k, v in [('eyeSize',1.4),('cheek',1),('blush',0.9),('headW',1.12),('chin',0),('pupil',1.4)]: await setv(k, v)
        await pg.wait_for_timeout(1200)
        after = await pg.evaluate("()=>JSON.stringify(window.__vita.cur)")
        print('changed:', before != after)
        await pg.screenshot(path=OUT+'02_sliders_cute.png')
        await pg.click('#btnReset'); await pg.wait_for_timeout(500)
        await pg.click('text=Giận dỗi'); await pg.wait_for_timeout(1000)
        await pg.screenshot(path=OUT+'03_gian_doi.png')
        await pg.click('text=Nháy mắt'); await pg.wait_for_timeout(1000)
        await pg.screenshot(path=OUT+'04_nhay_mat.png')
        await pg.click('#btnView'); await pg.click('#handle'); await pg.wait_for_timeout(1500)
        await pg.screenshot(path=OUT+'05_full_body.png')
        print('errors:', errs)
        await b.close()
asyncio.run(main())
