"""Pruebas reales de la interfaz en Chromium; no toca datos de partidas del usuario."""
from pathlib import Path
from playwright.sync_api import sync_playwright
import json

root = Path(__file__).resolve().parent.parent / 'resources'
with sync_playwright() as pw:
    browser = pw.chromium.launch(executable_path='/usr/bin/chromium', headless=True, args=['--no-sandbox','--disable-dev-shm-usage'])
    context = browser.new_context(viewport={'width': 1550, 'height': 960}, accept_downloads=True)
    page = context.new_page()
    js_errors=[]
    page.on('pageerror',lambda error: js_errors.append(str(error)))
    def route_handler(route):
        rel = route.request.url.split('127.0.0.1:8765/',1)[-1].split('?',1)[0]
        if rel == 'js/neutralino.js':
            return route.fulfill(status=200, body='', content_type='text/javascript')
        f=root / (rel if rel else 'index.html')
        if not f.is_file():
            return route.fulfill(status=404, body='')
        return route.fulfill(path=str(f))
    page.route('http://127.0.0.1:8765/**', route_handler)
    page.goto('http://127.0.0.1:8765/',timeout=45000)
    page.wait_for_function('window.NCG && window.NCGStartup && window.NCG.debug().session',timeout=60000)
    if page.locator('#startStandard').count():
        page.locator('#startStandard').click()
    else:
        page.locator('[data-menu-action=continue]').first.click()
    initial=page.evaluate('({id:NCG.debug().session.campaignId,history:NCG.debug().history.length,stored:localStorage.getItem("ncg_v6_session")})')
    assert initial['id'] is not None
    # R must be ignored while a select is focused.
    page.locator('#gradeSel').focus()
    page.keyboard.press('r')
    assert not page.locator('#modal').evaluate('(m)=>m.classList.contains("show")'), 'R with focused select opened modal'
    assert page.evaluate('NCG.debug().session.campaignId') == initial['id']
    # R must also be ignored when menus and settings are visible.
    page.locator('#menuBtn').click()
    page.keyboard.press('r')
    assert page.evaluate('NCG.debug().session.campaignId') == initial['id']
    assert not page.locator('#modal').evaluate('(m)=>m.classList.contains("show")'), 'R should be ignored from menu'
    page.locator('[data-menu-action=continue]').first.click()
    page.locator('#qolSettingsBtn').click()
    page.keyboard.press('r')
    assert not page.locator('#modal').evaluate('(m)=>m.classList.contains("show")'), 'R with settings open must be ignored'
    page.locator('[data-qol-close]').first.click()

    # First R: only show modal; neither progress nor native reset is triggered.
    page.locator('#desk').click(position={'x': 15, 'y': 15})
    page.keyboard.press('r')
    page.locator('#ncgResetTitle').wait_for(timeout=10000)
    assert not page.locator('#ncgResetConfirm').is_enabled(), 'The destructive button must start disabled'
    assert page.evaluate('NCG.debug().session.campaignId') == initial['id']
    assert page.evaluate('localStorage.getItem("ncg_v6_session")') == initial['stored']
    # Second R with modal open must have no effect.
    page.keyboard.press('r')
    assert page.locator('#ncgResetTitle').count()==1
    # Export backup without deletion, check download is initiated.
    with page.expect_download(timeout=20000) as download_info:
        page.locator('#ncgResetExport').click()
    download=download_info.value
    assert download.suggested_filename.endswith('.json')
    assert page.evaluate('NCG.debug().session.campaignId') == initial['id']
    # Cancel modal; data unchanged.
    page.locator('#ncgResetCancel').click()
    assert not page.locator('#modal').evaluate('(m)=>m.classList.contains("show")')
    assert page.evaluate('NCG.debug().session.campaignId') == initial['id']
    assert page.evaluate('localStorage.getItem("ncg_v6_session")') == initial['stored']
    # After 1s, explicit confirmation really performs reset.
    page.wait_for_timeout(1100)
    page.keyboard.press('r')
    page.locator('#ncgResetTitle').wait_for(timeout=10000)
    page.locator('#ncgResetAcknowledge').check()
    assert page.locator('#ncgResetConfirm').is_enabled()
    page.locator('#ncgResetConfirm').click()
    page.wait_for_function('(old)=>NCG.debug().session.campaignId!==old', initial['id'], timeout=20000)
    assert page.evaluate('NCG.debug().history.length') == 0
    assert page.evaluate('NCG.debug().session.day') == 1
    assert not js_errors, '\n'.join(js_errors[:6])
    print('CHROMIUM OK: selector, menú, ajustes, un R no borra, respaldo JSON, cancelar conserva, confirmar borra, sin errores JS')
    context.close()
    browser.close()
