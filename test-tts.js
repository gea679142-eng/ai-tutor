const WebSocket = require('ws');
const wsUrl = 'wss://speech.platform.bing.com/consumer/speech/synthesize/readaloud/edge/v1?TrustedClientToken=6A5AA1D4EAFF4E9FB37E23D68491D6F4';
const ws = new WebSocket(wsUrl, { headers: { 'User-Agent': 'Mozilla/5.0' } });

ws.on('open', function() {
  console.log('connected');
  ws.send(JSON.stringify({
    context: { synthesis: { audio: {
      metadataoptions: { sentenceBoundaryEnabled: 'false', wordBoundaryEnabled: 'false' },
      outputFormat: 'audio-24khz-48kbitrate-mono-mp3'
    }}}
  }));
  const ssml = "<speak version='1.0' xmlns='http://www.w3.org/2001/10/synthesis' xml:lang='en-US'><voice name='en-US-AriaNeural'>Hello, how are you?</voice></speak>";
  const msg = "X-RequestId:12345\r\nContent-Type:application/ssml+xml\r\nX-Timestamp:2024-01-01T00:00:00Z\r\nPath:ssml\r\n\r\n" + ssml;
  ws.send(msg);
});

ws.on('message', function(data, isBinary) {
  if (!isBinary) {
    const s = data.toString();
    console.log('TEXT:', s.substring(0, 150));
  } else {
    console.log('BIN chunk:', data.length);
  }
});

ws.on('error', function(e) { console.log('ERROR:', e.message); });
ws.on('close', function() { console.log('closed'); process.exit(0); });
setTimeout(function(){ console.log('timeout'); process.exit(1); }, 10000);
