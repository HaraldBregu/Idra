import WebSocket from 'ws';

const infoRes = await fetch('http://127.0.0.1:5858/json');
const [info] = await infoRes.json();
const ws = new WebSocket(info.webSocketDebuggerUrl);

let id = 0;
function send(method, params) {
	return new Promise((resolve, reject) => {
		const msgId = ++id;
		const handler = (data) => {
			const msg = JSON.parse(data.toString());
			if (msg.id === msgId) {
				ws.off('message', handler);
				if (msg.error) reject(new Error(JSON.stringify(msg.error)));
				else resolve(msg.result);
			}
		};
		ws.on('message', handler);
		ws.send(JSON.stringify({ id: msgId, method, params }));
	});
}

await new Promise((resolve) => ws.once('open', resolve));

const expr = `
(async () => {
  const { BrowserWindow } = await import('electron');
  const wins = BrowserWindow.getAllWindows();
  const win = wins[0];
  if (!win) return 'no window';
  const script = \`
    (function() {
      const video = document.querySelector('video');
      if (!video) return 'no video element found';
      const info = {
        tagName: video.tagName,
        hasControls: video.controls,
        outerHTMLStart: video.outerHTML.slice(0, 200),
      };
      let handlerFired = false;
      const listener = () => { handlerFired = true; };
      video.addEventListener('contextmenu', listener);
      const rect = video.getBoundingClientRect();
      const evt = new MouseEvent('contextmenu', {
        bubbles: true, cancelable: true,
        clientX: rect.left + rect.width/2, clientY: rect.top + rect.height/2,
      });
      video.dispatchEvent(evt);
      video.removeEventListener('contextmenu', listener);
      info.handlerFiredOnDirectDispatch = handlerFired;
      info.defaultPrevented = evt.defaultPrevented;
      return JSON.stringify(info);
    })()
  \`;
  const result = await win.webContents.executeJavaScript(script);
  return result;
})()
`;

const result = await send('Runtime.evaluate', {
	expression: expr,
	awaitPromise: true,
	returnByValue: true,
});
console.log(JSON.stringify(result, null, 2));
ws.close();
process.exit(0);
