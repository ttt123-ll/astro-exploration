/**
 * 极简 HTTPS CONNECT 代理：把 github.com 固定解析到可达的边缘 IP，
 * 绕过 DNS 被污染的地址（20.205.243.166 被墙，140.82.x.x 可达）
 */
const net = require('net');
const http = require('http');

const PORT = Number(process.env.PROXY_PORT || 7899);

/* 各域名 → 可达 IP 列表（依次尝试） */
const MAP = {
    'github.com': ['140.82.112.3', '140.82.113.3', '140.82.114.3', '140.82.116.3', '20.27.177.113'],
    'api.github.com': ['140.82.112.6', '140.82.113.6', '140.82.114.6'],
    'codeload.github.com': ['140.82.112.9', '140.82.113.9', '140.82.114.9'],
    'objects.githubusercontent.com': ['185.199.108.133', '185.199.109.133', '185.199.110.133', '185.199.111.133'],
    'raw.githubusercontent.com': ['185.199.108.133', '185.199.109.133', '185.199.110.133', '185.199.111.133']
};

function connectAny(host, port) {
    const ips = MAP[host] || [host];
    return new Promise((resolve, reject) => {
        let i = 0;
        const tryNext = () => {
            if (i >= ips.length) return reject(new Error('all ips failed: ' + host));
            const ip = ips[i++];
            const sock = net.connect({ host: ip, port });
            sock.setTimeout(9000);
            const onErr = () => { sock.destroy(); tryNext(); };
            sock.once('error', onErr);
            sock.once('timeout', onErr);
            sock.once('connect', () => {
                sock.removeListener('error', onErr);
                sock.removeListener('timeout', onErr);
                sock.setTimeout(0);
                sock.on('error', () => {});
                resolve(sock);
            });
        };
        tryNext();
    });
}

const server = http.createServer((req, res) => {
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end('astro git proxy ok\n');
});

server.on('connect', async (req, clientSocket, head) => {
    const [host, portStr] = String(req.url).split(':');
    const port = Number(portStr) || 443;
    clientSocket.on('error', () => {});
    try {
        const upstream = await connectAny(host, port);
        clientSocket.write('HTTP/1.1 200 Connection Established\r\n\r\n');
        if (head && head.length) upstream.write(head);
        upstream.pipe(clientSocket);
        clientSocket.pipe(upstream);
        upstream.on('error', () => clientSocket.destroy());
        clientSocket.on('error', () => upstream.destroy());
        upstream.on('close', () => clientSocket.destroy());
        clientSocket.on('close', () => upstream.destroy());
    } catch (e) {
        try { clientSocket.end('HTTP/1.1 502 Bad Gateway\r\n\r\n'); } catch (_) { /* 忽略 */ }
    }
});

server.listen(PORT, '127.0.0.1', () => {
    console.log('git proxy listening on 127.0.0.1:' + PORT);
});
