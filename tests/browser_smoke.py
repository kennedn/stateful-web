"""Optional browser QA: existing Chromium + websocket-client, simulated API only."""
import base64
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
import json
from pathlib import Path
import shutil
import subprocess
import tempfile
import threading
import time
import urllib.request

import websocket

ROOT = Path(__file__).resolve().parents[1]

class QuietHandler(SimpleHTTPRequestHandler):
    def log_message(self, *_):
        pass

MOCK = """
window.__calls=[]; window.__apiMode='ok'; window.__errors=[]; window.__readDelay=0; window.__activeReads=0; window.__maxReads=0; window.__battery=26;
window.addEventListener('error',e=>window.__errors.push(e.message)); window.addEventListener('unhandledrejection',e=>window.__errors.push(String(e.reason)));
const originalFetch=window.fetch.bind(window);
window.fetch=async(input,options={})=>{
 const url=new URL(String(input),location.href);
 if(url.origin!=='https://api.kennedn.com') return originalFetch(input,options);
 const headers=new Headers(options.headers), code=url.searchParams.get('code');
 window.__calls.push({url:url.href,method:options.method||'GET',headers:Object.fromEntries(headers),body:options.body,at:performance.now()});
 if(window.__apiMode==='blocked') throw new TypeError('Failed to fetch');
 const read=['status','battery'].includes(code);
 if(read){
  window.__activeReads++; window.__maxReads=Math.max(window.__maxReads,window.__activeReads);
  try{
   if(options.signal?.aborted) throw new DOMException('Aborted','AbortError');
   if(window.__readDelay) await new Promise((resolve,reject)=>{
    const abort=()=>{clearTimeout(timer);reject(new DOMException('Aborted','AbortError'))};
    const timer=setTimeout(()=>{options.signal?.removeEventListener('abort',abort);resolve()},window.__readDelay);
    options.signal?.addEventListener('abort',abort,{once:true});
   });
  }finally{window.__activeReads--}
 }
 const unauthorized=window.__apiMode==='unauthorized'&&!headers.has('Authorization');
 const states={
  '/v2/meross/office':{onoff:1,rgb:16753920,luminance:67},
  '/v2/thermostat':{onoff:1,temperature:{current:188,target:350,heating:true}},
  '/v2/radiator/office':code==='battery'?[{id:'test',value:window.__battery}]:[{id:'test',onoff:0,online:1,temperature:{current:185,target:200,heating:false,openWindow:true}}],
  '/v2/bthome/office':{temperature:'18.46',humidity:'58.81',battery:'19'},
  '/v2/tvcom/volume':code==='status'?'26':code,
  '/v2/wol/pc':'on', '/v2/hikvision/front_camera':{onoff:'off'}, '/v2/snowdon':{onoff:code==='status'?(window.__snowdonStatus||'off'):'off',input:'off'}
 };
 let data=window.__apiPayload??states[url.pathname]??{test:true,unsafe:'<img src=x onerror=alert(1)>'};
 if(url.pathname==='/v2/meross/office'&&window.__pollSequence){
  data={...states[url.pathname],onoff:code==='status'?(window.__pollSequence.length?window.__pollSequence.shift():1):0};
 }
 return new Response(JSON.stringify(unauthorized?{message:'Unauthorized'}:{message:'OK',data}),{status:unauthorized?401:200,headers:{'Content-Type':'application/json'}});
};
"""

def main():
    browser = shutil.which('google-chrome') or shutil.which('chromium-browser') or shutil.which('chromium')
    if not browser:
        raise RuntimeError('Install Chromium for the optional browser test.')
    server = ThreadingHTTPServer(('127.0.0.1', 0), partial(QuietHandler, directory=str(ROOT / 'public')))
    thread = threading.Thread(target=server.serve_forever, daemon=True)
    thread.start()
    process = None
    ws = None
    with tempfile.TemporaryDirectory(prefix='stateful-browser-') as profile:
        try:
            process = subprocess.Popen([browser, '--headless=new', '--no-sandbox', '--disable-gpu', '--remote-debugging-port=0', '--remote-allow-origins=http://localhost', '--user-data-dir=' + profile, 'about:blank'], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
            port_file = Path(profile) / 'DevToolsActivePort'
            for _ in range(100):
                if port_file.exists(): break
                if process.poll() is not None: raise RuntimeError('Chromium exited before startup')
                time.sleep(.1)
            port = port_file.read_text().splitlines()[0]
            with urllib.request.urlopen(f'http://127.0.0.1:{port}/json') as response:
                target = next(page for page in json.load(response) if page.get('type') == 'page')
            ws = websocket.create_connection(target['webSocketDebuggerUrl'], origin='http://localhost', timeout=10)
            sequence = 0
            def call(method, params=None):
                nonlocal sequence
                sequence += 1
                ws.send(json.dumps({'id': sequence, 'method': method, 'params': params or {}}))
                while True:
                    message = json.loads(ws.recv())
                    if message.get('id') == sequence:
                        if 'error' in message: raise RuntimeError(message['error'])
                        return message.get('result', {})
            def evaluate(expression):
                result = call('Runtime.evaluate', {'expression': expression, 'returnByValue': True, 'awaitPromise': True})
                if 'exceptionDetails' in result: raise RuntimeError(result['exceptionDetails'])
                return result['result'].get('value')
            def wait(expression, timeout=12):
                until = time.monotonic() + timeout
                while time.monotonic() < until:
                    if evaluate(expression): return
                    time.sleep(.05)
                raise AssertionError('Timed out: ' + expression + ' / ' + str(evaluate('({url:location.href,text:document.body?.innerText,calls:window.__calls,errors:window.__errors})')))
            def check(expression):
                assert evaluate(expression), expression + ' / ' + str(evaluate('({calls:window.__calls.slice(window.__mark),errors:window.__errors})'))
            call('Page.enable')
            call('Log.enable')
            call('Page.addScriptToEvaluateOnNewDocument', {'source': MOCK})
            call('Emulation.setDeviceMetricsOverride', {'width': 1440, 'height': 1100, 'deviceScaleFactor': 1, 'mobile': False})
            call('Emulation.setEmulatedMedia', {'features': [{'name': 'prefers-color-scheme', 'value': 'light'}]})
            call('Page.navigate', {'url': f'http://127.0.0.1:{server.server_port}/'})
            def selector(path, suffix=''):
                return json.dumps('[data-path="' + path + '"]' + (' ' + suffix if suffix else ''))
            def click(path, action):
                evaluate('document.querySelector(' + selector(path, '[data-action="' + action + '"]') + ').click()')
            def service(label):
                evaluate('[...document.querySelectorAll(".service-filter")].find(x=>x.textContent===' + json.dumps(label) + ').click()')
            def search(text):
                evaluate('document.querySelector("#device-search").value=' + json.dumps(text) + '; document.querySelector("#device-search").dispatchEvent(new Event("input"))')
            def reading(path, expected):
                wait('document.querySelector(' + selector(path, '.device-state') + ').textContent.includes(' + json.dumps(expected) + ')')
            office='/v2/meross/office'
            wait("window.__calls?.length === 1 && document.querySelectorAll('.device-tile').length > 40")
            check("document.querySelector('#connection-strip').hidden && !document.querySelector('#advanced-panel').open")
            check("!document.querySelector('a[href=\"https://kennedn.com/\"]') && !document.querySelector('a[href=\"https://kennedn.com/blog/\"]')")
            check("document.documentElement.scrollWidth <= innerWidth")
            # Send the action once, even on a double click. A manual read supersedes its polling.
            evaluate('document.querySelector(' + selector(office,'[data-action=toggle]') + ').click(); document.querySelector(' + selector(office,'[data-action=toggle]') + ').click()')
            wait('document.querySelector(' + selector(office,'.device-feedback') + ').dataset.kind === "success"')
            click(office,'status')
            reading(office,'On')
            check("window.__calls.filter(x=>new URL(x.url).searchParams.get('code')==='toggle').length === 1")
            check('document.querySelector(' + selector(office,'[data-action=toggle]') + ').textContent === "Turn off"')
            # Favourites bulk refresh only the current filtered set.
            evaluate('document.querySelector(' + selector(office,'.favorite-button') + ').click()')
            service('★ Favourites')
            check("document.querySelectorAll('.device-tile').length === 1")
            evaluate("window.__mark=window.__calls.length; document.querySelector('.refresh-category').click()")
            wait("document.querySelector('#bulk-progress').textContent.includes('1/1 refreshed') && document.querySelector('#cancel-refresh').hidden")
            check("window.__calls.slice(window.__mark).every(x=>new URL(x.url).pathname==='/v2/meross/office' && new URL(x.url).searchParams.get('code')==='status')")
            # The global refresh ignores the current favourites filter and covers all status nodes.
            evaluate("window.__mark=window.__calls.length; document.querySelector('#refresh-all').click()")
            wait("document.querySelector('#cancel-refresh').hidden && window.__calls.length>window.__mark")
            check("new Set(window.__calls.slice(window.__mark).map(x=>new URL(x.url).pathname)).size>40 && window.__calls.slice(window.__mark).every(x=>['status','battery'].includes(new URL(x.url).searchParams.get('code')))")
            check("document.querySelectorAll('.device-tile').length===1")
            # Category refresh is bounded to three concurrent reads.
            service('Television')
            evaluate("window.__readDelay=50; window.__maxReads=0; window.__mark=window.__calls.length; document.querySelector('.refresh-category').click()")
            wait("document.querySelector('#cancel-refresh').hidden && window.__calls.length > window.__mark")
            check("window.__maxReads <= 3 && window.__calls.slice(window.__mark).every(x=>new URL(x.url).pathname.startsWith('/v2/tvcom/') && new URL(x.url).searchParams.get('code')==='status')")
            evaluate("window.__readDelay=0")
            reading('/v2/tvcom/volume','26')
            # All tiles keep identical dimensions, including simple and numeric controls.
            evaluate("new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)))")
            check('document.querySelector(' + selector('/v2/tvcom/power') + ').getBoundingClientRect().height === document.querySelector(' + selector('/v2/tvcom/volume') + ').getBoundingClientRect().height')
            check("[...document.querySelectorAll('.device-tile')].every(a=>[...document.querySelectorAll('.device-tile')].every(b=>{if(a===b)return true; const x=a.getBoundingClientRect(),y=b.getBoundingClientRect();return x.right<=y.left+1||y.right<=x.left+1||x.bottom<=y.top+1||y.bottom<=x.top+1}))")
            # Slider changes are drafts; Apply sends a single write.
            evaluate('let n=document.querySelector(' + selector('/v2/tvcom/volume','input[type=number]') + '); n.value=42; n.dispatchEvent(new Event("input")); window.__mark=window.__calls.length')
            check("window.__calls.length===window.__mark")
            evaluate('document.querySelector(' + selector('/v2/tvcom/volume','.main-action') + ').click()')
            reading('/v2/tvcom/volume','42')
            click('/v2/tvcom/volume','status')
            reading('/v2/tvcom/volume','26')
            check('document.querySelector(' + selector('/v2/tvcom/volume','input[type=number]') + ').value === "26"')
            # Radiator battery is a partial reading: preserve temperature/power across both reads.
            service('Radiators'); search('radiator/office')
            evaluate("window.__mark=window.__calls.length; document.querySelector('.refresh-category').click()")
            wait("document.querySelector('#cancel-refresh').hidden && window.__calls.length >= window.__mark+2")
            reading('/v2/radiator/office','26%'); reading('/v2/radiator/office','18.5°C')
            check("window.__calls.slice(window.__mark).map(x=>new URL(x.url).searchParams.get('code')).join(',') === 'status,battery'")
            evaluate("window.__battery=19")
            click('/v2/radiator/office','battery'); reading('/v2/radiator/office','19%')
            reading('/v2/radiator/office','Low battery'); reading('/v2/radiator/office','18.5°C')
            click('/v2/radiator/office','status'); reading('/v2/radiator/office','20°C')
            wait("window.__activeReads === 0")
            reading('/v2/radiator/office','19%')
            # Bulk cancellation aborts queued work as well as active reads.
            search(''); service('Lights & plugs')
            evaluate("window.__readDelay=2000; window.__mark=window.__calls.length; document.querySelector('.refresh-category').click()")
            wait("window.__activeReads === 3")
            evaluate("document.querySelector('#cancel-refresh').click()")
            wait("document.querySelector('#cancel-refresh').hidden && window.__activeReads === 0")
            check("window.__calls.length-window.__mark === 3 && document.querySelector('#bulk-progress').textContent.includes('stopped')")
            evaluate("window.__readDelay=0")
            service('Soundbar')
            check("[...document.querySelectorAll('.device-tile .quick-action[data-action]')].map(x=>x.dataset.action).join(',') === 'power,input,status'")
            # Status-message changes must not move the action controls.
            evaluate("""
              const feedback=document.querySelector('[data-path="/v2/snowdon"] .device-feedback');
              const button=document.querySelector('[data-path="/v2/snowdon"] [data-action=power]');
              const measure=()=>button.getBoundingClientRect().top;
              const saved=feedback.textContent;
              feedback.textContent=''; const empty=measure();
              feedback.textContent='Power · sending…'; const pending=measure();
              feedback.textContent='No readable response · action may have run.'; const error=measure();
              feedback.textContent=saved;
              if(Math.abs(empty-pending)>.5||Math.abs(empty-error)>.5) throw new Error('Tile controls moved with feedback');
              window.__snowdonButtonTop=measure();
              const message=feedback.getBoundingClientRect(),controls=button.getBoundingClientRect();
              if(message.bottom>controls.top)throw new Error('Message area is not above the controls');
            """)
            # Snowdon clears its indicator as soon as a post-action read confirms the power change.
            click('/v2/snowdon','status'); reading('/v2/snowdon','Off')
            evaluate("window.__snowdonStatus='on'; window.__mark=window.__calls.length")
            click('/v2/snowdon','power'); reading('/v2/snowdon','On')
            wait('!document.querySelector(' + selector('/v2/snowdon','.polling-state') + ')')
            check('Math.abs(document.querySelector(' + selector('/v2/snowdon','[data-action=power]') + ').getBoundingClientRect().top-window.__snowdonButtonTop)<.5')
            evaluate('new Promise(r=>setTimeout(r,350))')
            check("window.__calls.slice(window.__mark).map(x=>new URL(x.url).searchParams.get('code')).join(',')==='power,status'")
            evaluate('delete window.__snowdonStatus')
            # More is the only panel trigger, and its colour follows the tile.
            service('All devices'); search('meross/office')
            evaluate("document.querySelector('.device-identity').click()")
            check("!document.querySelector('#device-dialog').open")
            evaluate("document.querySelector('.more-button').click()")
            check("document.querySelector('#device-dialog').open && getComputedStyle(document.querySelector('#device-dialog')).backgroundColor === getComputedStyle(document.querySelector('.device-tile')).backgroundColor")
            evaluate("document.querySelector('#device-dialog [data-action=rgb]').click()")
            check("document.querySelector('#advanced-panel').open && document.querySelector('#code').value==='rgb'")
            evaluate("window.__mark=window.__calls.length; document.querySelector('#request-path').value='//evil.example'; document.querySelector('#send').click()")
            check("!document.querySelector('#validation').hidden && window.__calls.length===window.__mark")
            evaluate("document.querySelector('#request-path').value='/v2/meross/office'; document.querySelector('#code').value='status'; window.__apiPayload={unsafe:'<img src=x onerror=alert(1)>'}; document.querySelector('#send').click()")
            wait("document.querySelector('#response').textContent.includes('<img')")
            check("!document.querySelector('#response img') && !document.querySelector('.device-state img')")
            # Authentication only checks GET, never replays an action.
            evaluate("delete window.__apiPayload; window.__apiMode='unauthorized'; window.__mark=window.__calls.length; document.querySelector('#send').click()")
            wait("document.querySelector('#auth-dialog').open")
            evaluate("document.querySelector('#username').value='test'; document.querySelector('#password').value='test'; document.querySelector('#login').click()")
            wait("!document.querySelector('#auth-dialog').open")
            check("window.__calls.length-window.__mark === 2 && window.__calls.at(-1).method==='GET' && document.querySelector('#connection-strip').hidden")
            check("localStorage.length===1 && localStorage.getItem('kennedn-control-favorites')!==null && sessionStorage.length===0 && document.querySelector('#password').value===''")
            # Multiple kinds of status render without free-text JSON.
            evaluate("document.querySelector('#advanced-panel').open=false")
            search(''); service('All devices')
            for path, expected in [('/v2/thermostat','18.8°C'),('/v2/bthome/office','58.8%'),('/v2/wol/pc','On'),('/v2/hikvision/front_camera','Off'),('/v2/snowdon','Off')]:
                click(path,'status'); reading(path,expected)
            check('document.querySelector(' + selector('/v2/thermostat') + ').dataset.heating === "true"')
            # Read failures remain uncertain; the action is not replayed.
            evaluate("window.__apiMode='blocked'")
            click(office,'toggle')
            wait('document.querySelector(' + selector(office,'.device-feedback') + ').dataset.kind === "unconfirmed"')
            reading(office,'Last known')
            # A manual status cancels that recovery loop before testing a complete backoff cycle.
            evaluate("window.__apiMode='ok'"); click(office,'status'); reading(office,'On')
            # A new action supersedes an in-flight bulk read for the same tile.
            search('meross/office')
            evaluate("window.__readDelay=1000; window.__mark=window.__calls.length; document.querySelector('.refresh-category').click()")
            wait("window.__activeReads === 1")
            click(office,'toggle')
            wait("document.querySelector('#cancel-refresh').hidden")
            wait('document.querySelector(' + selector(office,'.device-feedback') + ').dataset.kind === "success"')
            check("window.__calls.slice(window.__mark).filter(x=>new URL(x.url).searchParams.get('code')==='toggle').length === 1")
            evaluate("window.__readDelay=0")
            click(office,'status'); reading(office,'On')
            search('')
            # Ignore stale old-state reads; stop as soon as the expected toggle state is confirmed.
            evaluate("window.__apiPayload={onoff:0}")
            click(office,'status'); reading(office,'Off')
            evaluate('delete window.__apiPayload')
            evaluate("""
              window.__mark=window.__calls.length; window.__pollSequence=[0,0,1,1,1]; window.__pollStarted=performance.now();
              window.__replacement={old:0,new:0}; const replacement=new StatusUpdates.Poller();
              replacement.start('same',()=>{window.__replacement.old++});
              setTimeout(()=>replacement.start('same',()=>{window.__replacement.new++}),50);
              window.__cutoffCalls=0; window.__cutoffDone=false; window.__cutoffStarted=performance.now();
              const cutoff=new StatusUpdates.Poller();
              cutoff.start('slow',({signal})=>{window.__cutoffCalls++;return new Promise(r=>signal.addEventListener('abort',()=>r({}),{once:true}))}).then(()=>{window.__cutoffDone=true;window.__cutoffElapsed=performance.now()-window.__cutoffStarted});
              void 0;
            """)
            click(office,'toggle')
            wait("window.__calls.slice(window.__mark).filter(x=>new URL(x.url).searchParams.get('code')==='status').length >= 1")
            check('document.querySelector(' + selector(office) + ').dataset.power === "off"')
            check('!!document.querySelector(' + selector(office,'.polling-state') + ')')
            wait('document.querySelector(' + selector(office) + ').dataset.power === "on"')
            wait('!document.querySelector(' + selector(office,'.polling-state') + ')')
            wait("window.__cutoffDone && window.__replacement.new===12", timeout=13)
            check("window.__cutoffCalls===1 && window.__cutoffElapsed>=9900 && window.__cutoffElapsed<10600 && window.__replacement.old===0")
            check("window.__calls.slice(window.__mark).filter(x=>new URL(x.url).searchParams.get('code')==='toggle').length===1")
            check("window.__calls.slice(window.__mark).filter(x=>new URL(x.url).searchParams.get('code')==='status').length===3")
            check("window.__calls.slice(window.__mark).every(x=>new URL(x.url).pathname==='/v2/meross/office' && x.at-window.__pollStarted<10000)")
            check("(()=>{const r=window.__calls.slice(window.__mark).filter(x=>new URL(x.url).searchParams.get('code')==='status').map(x=>x.at-window.__pollStarted); return r[0]>=80 && r[0]<350 && r[1]>=230 && r[2]>=480})()")
            evaluate("delete window.__pollSequence; window.scrollTo(0,0)")
            evaluate('document.fonts.ready.then(()=>true)')
            check("window.__errors.length===0")
            check("[...document.querySelectorAll('.device-tile')].every(x=>x.scrollHeight<=x.clientHeight+1)")
            check("!document.querySelector('.brightness-meter') && ![...document.querySelectorAll('.state-metric dt')].some(x=>x.textContent==='Brightness')")
            check('getComputedStyle(document.querySelector(' + selector(office) + '),"::after").animationName==="live-border"')
            check('getComputedStyle(document.querySelector(' + selector(office,".device-identity svg") + ')).filter==="none"')
            check("[...document.querySelectorAll('.device-tile')].every(x=>getComputedStyle(x).boxShadow!=='none')")
            check("document.querySelector('.refresh-category').textContent==='↻' && document.querySelector('#refresh-all').textContent==='↻'")
            check("getComputedStyle(document.querySelector('.device-tile')).backgroundImage==='none' && getComputedStyle(document.querySelector('.device-tile')).transform==='none'")
            time.sleep(.15)
            screenshot=call('Page.captureScreenshot',{'format':'png','captureBeyondViewport':False})
            Path('/tmp/stateful-desktop.png').write_bytes(base64.b64decode(screenshot['data']))
            call('Emulation.setDeviceMetricsOverride',{'width':390,'height':844,'deviceScaleFactor':1,'mobile':True})
            evaluate("new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)))")
            check("document.documentElement.scrollWidth <= innerWidth")
            check("[...document.querySelectorAll('.device-tile')].every(x=>x.scrollHeight<=x.clientHeight+1)")
            screenshot=call('Page.captureScreenshot',{'format':'png','captureBeyondViewport':False})
            Path('/tmp/stateful-mobile.png').write_bytes(base64.b64decode(screenshot['data']))
            print('Browser checks passed: uniform tile sizing, animated on-state borders, muted palette/shadows, battery/status merge, global/category bulk refresh/concurrency/cancellation, early completion after confirmed state, stale-state retry, bounded follow-ups and replacement/cutoff, Snowdon shortcuts, device visuals and mobile layout.')
        finally:
            if ws: ws.close()
            if process:
                process.terminate()
                try: process.wait(timeout=10)
                except subprocess.TimeoutExpired: process.kill(); process.wait()
            server.shutdown(); server.server_close(); thread.join()

if __name__ == '__main__':
    main()
