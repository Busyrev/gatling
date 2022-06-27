///@ts-ignore
import dig from 'node-dig-dns';
import http from 'http';
import net from 'net';
import {performance} from 'perf_hooks';

class Target {
    public ip: string;
    
    constructor(ip:string) {
        this.ip = ip;
    }
    public socket:net.Socket | null = null;
    public madeRequests:number = 0;
}

let queue = new Set<Target>();

console.log('hello');
dig(['rshb-in.tech', '+short'])
    .then((result: any) => {
        let adresses = result.split('\n');
        for (let addr of adresses) {
            console.log(addr);
        }
        for (let addr of adresses) {
            for (let i = 0; i < 10; i++) {
                queue.add(new Target(addr));
            }
        }
        
        // console.log(adresses.join(', '));
    })
    .catch((err: any) => {
        console.log('Error:', err);
    });

let counter = 0;
let responceTimes = 0;
let inProgress = 0;
function run1 (ip:string) {
    let start = performance.now();
    inProgress++;
    const options = {
        setHost: false,
        host: ip,
        port: 80,
        path: '/',
        method: 'GET',
        headers: {
            'Host': 'rshb-in.tech',
            'X-Email-Id': 'busyrev@gmail.com',
        },
      };
      
      const req = http.request(options, res => {
        counter++;
        let end = performance.now();
        // console.log(end - start);
        responceTimes += end - start;
        run1(ip);
        res.on('data', d => {});
        res.on('end', () => {
            inProgress--;
        });
      });
      req.on('error', error => {
        console.error(error);
      });
      req.end();
}

// let text = "GET / HTTP/1.1\r\n"
// + "Host: rshb-in.tech\r\n"
// + "User-Agent: mike\r\n"
// + "X-Email-Id: busyrev@gmail.com\r\n"
// + "Accept-Encoding: gzip, deflate\r\n"
// + "Connection: Keep-Alive\r\n\r\n"

let text = "GET /get HTTP/1.1\r\n"
+ "Host: rshb-in.tech\r\n"
// + "User-Agent: mike\r\n"
+ "X-Email-Id: busyrev@gmail.com\r\n"
// + "Accept-Encoding: gzip, deflate\r\n"
+ "Connection: Keep-Alive\r\n\r\n"

let closes = 0;
let drains = 0;
let errors = 0;
let totalRequestsMade = 0;
let totalRequestsConfirmed = 0;

setInterval(()=>{
    let targets = [];
    for (let target of queue.values() ) {
        targets.push(target);
    }
    
    for (let target of targets) {
        run(target);
    }
}, 10);

function run(target:Target) {
    if (target.socket) {
        let prevSocket = target.socket;
        prevSocket.destroy(); 
        target.madeRequests = 0;
    }
    var socket = new net.Socket();
    target.socket = socket;
    queue.delete(target);
    socket.connect(80, target.ip, function() {
        // console.log('Connected');
        fuckClient(target);
    });
    
    socket.on('data', function(data:any) {
        // console.log('Received: ' + data);
        let oks = data.toString().split("200").length - 1 ;
        totalRequestsConfirmed += oks;
        inProgress -= oks;
        // client.destroy(); // kill client after server's response
    });
    
    socket.on('drain', function() {
        // console.log('drain');
        drains++;
        fuckClient(target);
        // client.destroy(); // kill client after server's response
    });

    socket.on('close', function() {
        closes++;
        // console.log('Connection closed');
        queue.add(target);
    });
    
    socket.on('error', function(err) {
        errors++;
        queue.add(target);
    });
}

function fuckClient(target:Target) {
    let writeResult = false;
    do {
        inProgress++;
        counter++;
        totalRequestsMade++;
        writeResult = target.socket!.write(text);
        target.madeRequests++;
        if (target.madeRequests >= 10000) {
            target.socket?.destroy();
            target.madeRequests = 0;
            target.socket = null;
            queue.add(target);
            return;
        }
    } while (writeResult == true);
    // console.log('writeResult: ' + writeResult);
}



setInterval(()=>{
    let avgReqTime = responceTimes / counter;
    let mem = process.memoryUsage();
    console.log('ops: ' + counter + ', avg time ms: ' + Math.round(avgReqTime) + ', inProgress: ' + inProgress, ', rss: ' + Math.round(mem.rss/(1024*1024)) + 'mb');
    console.log('closes: ' + closes + ', drains: ' + drains + ', errors: ' + errors, ' totalRequestsMade: ' + totalRequestsMade + ' totalRequestsConfirmed: ' + totalRequestsConfirmed);
    closes = 0;
    drains = 0;
    errors = 0;
    counter = 0;
    responceTimes = 0;
}, 1000);
    
    
    