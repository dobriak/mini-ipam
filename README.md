# Mini IPAM

## Mini IP address management application

Extremely simplistic IPAM app to help keep track of multiple ip/port combinations, especially if you are running docker/podman and exposing applications on various ports.

To try it out, open 2 terminal tabs.

In **tab 1:**
```
cd server
npm install
npm start
```

In **tab 2:**
```
cd client
npm run dev
```

Open your browser to [localhost:5173](http://localhost:5173)

You can currently add CIDR ranges (collections) and IP address / port (node) to a given range.

All data will be saved to a sqlite database `server/network.db`
