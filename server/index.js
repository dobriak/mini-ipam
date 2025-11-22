const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const cors = require('cors');
const bodyParser = require('body-parser');

const app = express();
const PORT = 3001;

// Middleware
app.use(cors());
app.use(bodyParser.json());

// Helper: IP/CIDR utilities
function ipToInt(ip) {
    return ip.split('.').reduce((acc, oct) => (acc << 8) + parseInt(oct, 10), 0) >>> 0;
}

function parseCIDR(cidr) {
    const parts = cidr.split('/');
    if (parts.length !== 2) return null;
    const ip = parts[0];
    const prefix = parseInt(parts[1], 10);
    if (!/^\d+\.\d+\.\d+\.\d+$/.test(ip) || isNaN(prefix) || prefix < 0 || prefix > 32) return null;
    const ipInt = ipToInt(ip);
    const mask = prefix === 0 ? 0 : (~0 << (32 - prefix)) >>> 0;
    const network = ipInt & mask;
    return { network, mask, prefix };
}

function isRFC1918CIDR(cidr) {
    const parsed = parseCIDR(cidr);
    if (!parsed) return false;
    const { network, mask } = parsed;
    // 10.0.0.0/8
    const tenNet = ipToInt('10.0.0.0');
    const tenMask = (~0 << (32 - 8)) >>> 0;
    if ((network & tenMask) === (tenNet & tenMask)) return true;
    // 172.16.0.0/12
    const a172 = ipToInt('172.16.0.0');
    const a172Mask = (~0 << (32 - 12)) >>> 0;
    if ((network & a172Mask) === (a172 & a172Mask)) return true;
    // 192.168.0.0/16
    const n192 = ipToInt('192.168.0.0');
    const n192Mask = (~0 << (32 - 16)) >>> 0;
    if ((network & n192Mask) === (n192 & n192Mask)) return true;
    return false;
}

function ipInCIDR(ip, cidr) {
    const parsed = parseCIDR(cidr);
    if (!parsed) return false;
    const ipInt = ipToInt(ip);
    return (ipInt & parsed.mask) === parsed.network;
}

function cidrRange(cidr) {
    const parsed = parseCIDR(cidr);
    if (!parsed) return null;
    const start = parsed.network >>> 0;
    const maskInv = (~parsed.mask) >>> 0;
    const end = (parsed.network | maskInv) >>> 0;
    return { start, end };
}

function rangesOverlap(a, b) {
    return a.start <= b.end && b.start <= a.end;
}

// Database Setup
const DB_PATH = process.env.DATABASE_PATH || './network.db';
let db;
const ready = new Promise((resolve, reject) => {
    db = new sqlite3.Database(DB_PATH, (err) => {
        if (err) {
            console.error('Error opening database', err);
            return reject(err);
        }
        console.log('Connected to SQLite database.');
        // Create table if it doesn't exist (include collection_id, name, notes for new DBs)
        db.run(`CREATE TABLE IF NOT EXISTS nodes (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            ip_address TEXT NOT NULL,
            port INTEGER NOT NULL,
            collection_id INTEGER,
            name TEXT,
            notes TEXT
        )`);
        // Create collections table for grouping IPs
        db.run(`CREATE TABLE IF NOT EXISTS collections (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            cidr TEXT NOT NULL
        )`);

        // Migration: add missing columns (collection_id, name, notes) to existing nodes table if missing
        db.all("PRAGMA table_info(nodes)", [], (err, rows) => {
            if (!err) {
                const existing = new Set(rows.map(r => r.name));
                const toAdd = [];
                if (!existing.has('collection_id')) toAdd.push({ sql: "ALTER TABLE nodes ADD COLUMN collection_id INTEGER", name: 'collection_id' });
                if (!existing.has('name')) toAdd.push({ sql: "ALTER TABLE nodes ADD COLUMN name TEXT", name: 'name' });
                if (!existing.has('notes')) toAdd.push({ sql: "ALTER TABLE nodes ADD COLUMN notes TEXT", name: 'notes' });
                let pending = toAdd.length;
                if (pending === 0) return resolve();
                toAdd.forEach(col => {
                    db.run(col.sql, (alterErr) => {
                        if (alterErr) console.warn(`Could not add ${col.name} column:`, alterErr.message);
                        else console.log(`Added ${col.name} column to nodes table (migration).`);
                        pending -= 1;
                        if (pending === 0) resolve();
                    });
                });
            } else {
                resolve();
            }
        });
        // If there were no columns to add, the resolve above might not have been called; ensure resolve
        setTimeout(() => resolve(), 50);
    });
});

// --- API ROUTES ---

// 1. GET ALL (Read)
app.get('/api/nodes', (req, res) => {
    const sql = "SELECT * FROM nodes";
    db.all(sql, [], (err, rows) => {
        if (err) return res.status(400).json({ error: err.message });
        res.json({ data: rows });
    });
});

// --- Collections API ---

// GET ALL collections
app.get('/api/collections', (req, res) => {
    const sql = "SELECT * FROM collections";
    db.all(sql, [], (err, rows) => {
        if (err) return res.status(400).json({ error: err.message });
        res.json({ data: rows });
    });
});

// CREATE collection
app.post('/api/collections', (req, res) => {
    const { name, cidr } = req.body;
    if (!name || !cidr) return res.status(400).json({ error: 'name and cidr required' });
    if (!parseCIDR(cidr)) return res.status(400).json({ error: 'Invalid CIDR format' });
    if (!isRFC1918CIDR(cidr)) return res.status(400).json({ error: 'CIDR must be within RFC1918 private ranges' });
    // ensure no overlapping collection CIDR exists
    const newRange = cidrRange(cidr);
    db.all('SELECT id, cidr FROM collections', [], (err, rows) => {
        if (err) return res.status(400).json({ error: err.message });
        for (const r of rows) {
            const otherRange = cidrRange(r.cidr);
            if (otherRange && rangesOverlap(newRange, otherRange)) {
                return res.status(400).json({ error: 'CIDR overlaps existing collection' });
            }
        }
        const sql = "INSERT INTO collections (name, cidr) VALUES (?, ?)";
        const params = [name, cidr];
        db.run(sql, params, function (err) {
            if (err) return res.status(400).json({ error: err.message });
            res.json({
                message: "success",
                data: { id: this.lastID, name, cidr }
            });
        });
    });
});

// UPDATE collection
app.put('/api/collections/:id', (req, res) => {
    const { name, cidr } = req.body;
    if (!name || !cidr) return res.status(400).json({ error: 'name and cidr required' });
    if (!parseCIDR(cidr)) return res.status(400).json({ error: 'Invalid CIDR format' });
    if (!isRFC1918CIDR(cidr)) return res.status(400).json({ error: 'CIDR must be within RFC1918 private ranges' });
    // ensure no overlapping collection CIDR exists (exclude self)
    const newRange = cidrRange(cidr);
    db.all('SELECT id, cidr FROM collections WHERE id != ?', [req.params.id], (err, rows) => {
        if (err) return res.status(400).json({ error: err.message });
        for (const r of rows) {
            const otherRange = cidrRange(r.cidr);
            if (otherRange && rangesOverlap(newRange, otherRange)) {
                return res.status(400).json({ error: 'CIDR overlaps existing collection' });
            }
        }
        const sql = "UPDATE collections SET name = ?, cidr = ? WHERE id = ?";
        const params = [name, cidr, req.params.id];
        db.run(sql, params, function (err) {
            if (err) return res.status(400).json({ error: err.message });
            res.json({ message: "updated", changes: this.changes });
        });
    });
});

// DELETE collection
app.delete('/api/collections/:id', (req, res) => {
    const sql = "DELETE FROM collections WHERE id = ?";
    db.run(sql, req.params.id, function (err) {
        if (err) return res.status(400).json({ error: err.message });
        res.json({ message: "deleted", changes: this.changes });
    });
});

// 2. CREATE (Insert)
app.post('/api/nodes', (req, res) => {
    const { ip_address, port, collection_id, name, notes } = req.body;
    if (!ip_address || (port === undefined || port === null)) return res.status(400).json({ error: 'ip_address and port required' });
    const portNum = parseInt(port, 10);
    if (!Number.isInteger(portNum) || portNum < 0 || portNum > 65535) return res.status(400).json({ error: 'port must be integer between 0 and 65535' });
    // if collection_id provided, ensure it exists and ip belongs to its CIDR
    if (collection_id) {
        db.get('SELECT cidr FROM collections WHERE id = ?', [collection_id], (err, row) => {
            if (err) return res.status(400).json({ error: err.message });
            if (!row) return res.status(400).json({ error: 'collection not found' });
            const cidr = row.cidr;
            if (!parseCIDR(cidr) || !ipInCIDR(ip_address, cidr)) return res.status(400).json({ error: 'IP not within collection CIDR' });
            const sql = "INSERT INTO nodes (ip_address, port, collection_id, name, notes) VALUES (?, ?, ?, ?, ?)";
            const params = [ip_address, portNum, collection_id, name || null, notes || null];
            db.run(sql, params, function (err) {
                if (err) return res.status(400).json({ error: err.message });
                res.json({
                    message: "success",
                    data: { id: this.lastID, ip_address, port: portNum, collection_id, name: name || null, notes: notes || null }
                });
            });
        });
    } else {
        const sql = "INSERT INTO nodes (ip_address, port, name, notes) VALUES (?, ?, ?, ?)";
        const params = [ip_address, portNum, name || null, notes || null];
        db.run(sql, params, function (err) {
            if (err) return res.status(400).json({ error: err.message });
            res.json({
                message: "success",
                data: { id: this.lastID, ip_address, port: portNum, name: name || null, notes: notes || null }
            });
        });
    }
});

// 3. UPDATE (Edit)
app.put('/api/nodes/:id', (req, res) => {
    const { ip_address, port, collection_id, name, notes } = req.body;
    if (!ip_address || (port === undefined || port === null)) return res.status(400).json({ error: 'ip_address and port required' });
    const portNum = parseInt(port, 10);
    if (!Number.isInteger(portNum) || portNum < 0 || portNum > 65535) return res.status(400).json({ error: 'port must be integer between 0 and 65535' });
    const doUpdate = () => {
        const sql = "UPDATE nodes SET ip_address = ?, port = ?, collection_id = ?, name = ?, notes = ? WHERE id = ?";
        const params = [ip_address, portNum, collection_id || null, name || null, notes || null, req.params.id];
        db.run(sql, params, function (err) {
            if (err) return res.status(400).json({ error: err.message });
            res.json({ message: "updated", changes: this.changes });
        });
    };
    if (collection_id) {
        db.get('SELECT cidr FROM collections WHERE id = ?', [collection_id], (err, row) => {
            if (err) return res.status(400).json({ error: err.message });
            if (!row) return res.status(400).json({ error: 'collection not found' });
            const cidr = row.cidr;
            if (!parseCIDR(cidr) || !ipInCIDR(ip_address, cidr)) return res.status(400).json({ error: 'IP not within collection CIDR' });
            doUpdate();
        });
    } else {
        doUpdate();
    }
});

// 4. DELETE
app.delete('/api/nodes/:id', (req, res) => {
    const sql = "DELETE FROM nodes WHERE id = ?";
    db.run(sql, req.params.id, function (err) {
        if (err) return res.status(400).json({ error: err.message });
        res.json({ message: "deleted", changes: this.changes });
    });
});

// Start Server
if (require.main === module) {
    // Only start listening when executed directly
    ready.then(() => {
        app.listen(PORT, () => {
            console.log(`Server running on http://localhost:${PORT}`);
        });
    }).catch(err => {
        console.error('Failed to initialize DB, not starting server.', err);
    });
}

// Export for tests
module.exports = { app, dbGetter: () => db, ready };
