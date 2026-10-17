# FISCO BCOS local chain

Anchoring runs on a 4-node FISCO BCOS v3.17.1 chain in Docker, reached through its Ethereum-compatible web3 RPC, so the app uses `ethers` directly.

## Build and start (once)

The CDN that `build_chain.sh` uses for `tassl` and `get_account.sh` returned 403 on 17 Oct 2026, so the chain is built inside an Ubuntu container with system OpenSSL standing in for `tassl` (fine for non-SM mode) and `get_account.sh` taken from GitHub.

```bash
mkdir -p ~/fisco && cd ~/fisco
curl -fLo build_chain.sh https://github.com/FISCO-BCOS/FISCO-BCOS/releases/download/v3.17.1/build_chain.sh
curl -fLo get_account.sh https://raw.githubusercontent.com/FISCO-BCOS/console/master/tools/get_account.sh
docker run --rm -v ~/fisco:/fisco -w /fisco ubuntu:22.04 bash -c "apt-get update -qq && apt-get install -y -qq curl wget openssl && mkdir -p /root/.fisco && ln -s \$(which openssl) /root/.fisco/tassl-1.1.1b && bash build_chain.sh -l 127.0.0.1:4 -p 30300,20200 -v v3.17.1"

# enable web3 RPC (node0 8545 ... node3 8548) and listen on all interfaces inside the container
cd ~/fisco/nodes/127.0.0.1
for i in 0 1 2 3; do sed -i '' "/^\[web3_rpc\]/,/^\[/ { s/enable=false/enable=true/; s/listen_port=8545/listen_port=854$((5+i))/; }" node$i/config.ini; done

docker run -d --name fisco-guardian --restart unless-stopped -v ~/fisco/nodes:/nodes -w /nodes/127.0.0.1 \
  -p 127.0.0.1:20200-20203:20200-20203 -p 127.0.0.1:8545:8545 ubuntu:22.04 bash -c "bash start_all.sh; tail -f /dev/null"
```

`sed -i ''` is the macOS form; on Linux use `sed -i`.

## Check and deploy

```bash
curl -s -X POST 127.0.0.1:8545 -H 'content-type: application/json' -d '{"jsonrpc":"2.0","id":1,"method":"eth_chainId","params":[]}'   # 0x4ee8 = 20200
npm run fisco:deploy   # compiles contracts/Anchor.sol, deploys, prints FISCO_BCOS_PRIVATE_KEY and FISCO_BCOS_CONTRACT_ADDRESS for .env
```

Transactions use `gasPrice: 0, type: 0`. FISCO reports `block.timestamp` in milliseconds.

## Stop / start

```bash
docker stop fisco-guardian && docker start fisco-guardian
```
