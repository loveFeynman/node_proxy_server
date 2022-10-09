const fs = require('fs');
const httpProxy = require('http-proxy');
const path = require('path');
const pem = require('pem');
const yargs = require('yargs');
const http = require("http");
const https = require("https");
const { option } = require('yargs');
const express = require("express");

const httpsToHttp = [
  // https port 3443 redirects the blockexplorer's API server at 3001
  {
    from: 9001,
    to: 8546,
    ws: true,
  },
  // https port 8443 redirects to the validator node's JSON RPC endpoint
  {
    from: 9000,
    to: 8545,
    ws: false,
  },
  // https port 8444 redirects to the validator node's JSON RPC websocket
  {
    from: 8444,
    to: 8900,
    ws: true,
  },
];

const argv = yargs
  .usage('Usage: $0 <options>\nExample: $0 --keys ~')
  .describe('keys', 'path for storing .key.pem and .cert.pem')
  .default('keys', '.').argv;

function readKeys(location = '.') {
  const serviceKeyFile = path.resolve(location, 'server.key');
  const certificateFile = path.resolve(location, 'server.cert');

  function readFileSync(file) {
    if (fs.existsSync(file)) {
      return fs.readFileSync(file);
    }
    return null;
  }

  const serviceKey = readFileSync(serviceKeyFile);
  const certificate = readFileSync(certificateFile);

  return new Promise((resolve, reject) => {
    if (serviceKey && certificate) {
      console.log('Certificate loaded from', certificateFile);
      resolve({serviceKey, certificate});
    } else {
      console.log('Creating a self-signed certificate');
      pem.createCertificate(
        {
          days: 1000,
          selfSigned: true,
        },
        (err, keys) => {
          if (err) {
            reject(err);
          }

          fs.writeFileSync(serviceKeyFile, keys.serviceKey);
          fs.writeFileSync(certificateFile, keys.certificate);
          resolve(keys);
        },
      );
    }
  });
}

async function main() {
  const keys = await readKeys(argv.keys);

  var options = {
    https: {
      key: keys.serviceKey,
      cert: keys.certificate
    }
  };


  const proxy = httpProxy.createProxyServer({
    target: {
      host: "44.211.12.215",
      port: 8545
    }
  });
  
  const app = express();
  const bodyParser = require("body-parser");
  app.use(bodyParser.urlencoded({ extended: false }));
  app.use(bodyParser.json());
  app.get("/", function (req, res) {
  
    // Sending index.html to the browser
    console.log("hello");
  });

  https.createServer(options.https,
    (req, res) => {
    try {
      console.log("req: ", req);
      proxy.proxyRequest(req, res);
    } catch (err) {
      console.log("err: ", err)
      done(err);
      res.end();
    }
  })
  .listen(7000,  (req, res) => {
    console.log("Server started at port 7000");
  })

}

main().catch(err => {
  console.error(err);
  process.exit(1);
});