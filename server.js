const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = 3000;
const DB_FILE = path.join(__dirname, 'reviews-db.json');

function reviewAuthor(review) {
  return String(review.userEmail || review.userName || 'guest@filmly.app').trim().toLowerCase();
}

function reviewKey(review) {
  return `${review.movieId}:${reviewAuthor(review)}`.replace(/[^a-z0-9_-]/gi, '_');
}

function dedupeDb(db) {
  const unique = {};

  Object.values(db || {}).forEach((review) => {
    if (!review || typeof review !== 'object' || !review.movieId) return;

    const key = reviewKey(review);
    const existing = unique[key];
    const existingTime = existing ? new Date(existing.createdAt).getTime() : 0;
    const reviewTime = new Date(review.createdAt).getTime();

    if (!existing || reviewTime >= existingTime) {
      unique[key] = review;
    }
  });

  return unique;
}

function readDb(callback) {
  fs.readFile(DB_FILE, 'utf8', (err, data) => {
    if (err) {
      callback(err);
      return;
    }

    try {
      callback(null, dedupeDb(JSON.parse(data || '{}')));
    } catch {
      callback(null, {});
    }
  });
}

function writeDb(db, callback) {
  fs.writeFile(DB_FILE, JSON.stringify(dedupeDb(db), null, 2), 'utf8', callback);
}

// Ensure db file exists and is valid JSON
if (!fs.existsSync(DB_FILE)) {
  fs.writeFileSync(DB_FILE, JSON.stringify({}), 'utf8');
}

const server = http.createServer((req, res) => {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    res.end();
    return;
  }

  if (req.url === '/reviews.json') {
    if (req.method === 'GET') {
      readDb((err, db) => {
        if (err) {
          res.writeHead(500, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Failed to read database' }));
          return;
        }
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(db, null, 2));
      });
    } else if (req.method === 'POST') {
      let body = '';
      req.on('data', chunk => {
        body += chunk.toString();
      });
      req.on('end', () => {
        try {
          const review = JSON.parse(body);
          readDb((err, db) => {
            if (err) {
              res.writeHead(500, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify({ error: 'Failed to read database' }));
              return;
            }
            const key = reviewKey(review);
            db[key] = review;
            writeDb(db, (writeErr) => {
              if (writeErr) {
                res.writeHead(500, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: 'Failed to write database' }));
                return;
              }
              res.writeHead(200, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify({ name: key }));
            });
          });
        } catch (parseErr) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Invalid JSON' }));
        }
      });
    } else {
      res.writeHead(405);
      res.end();
    }
  } else if (req.method === 'PUT' && req.url.startsWith('/reviews/') && req.url.endsWith('.json')) {
    let body = '';
    req.on('data', chunk => {
      body += chunk.toString();
    });
    req.on('end', () => {
      try {
        const review = JSON.parse(body);
        const key = decodeURIComponent(req.url.replace('/reviews/', '').replace(/\.json$/, ''));

        readDb((err, db) => {
          if (err) {
            res.writeHead(500, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'Failed to read database' }));
            return;
          }

          db[key] = review;
          writeDb(db, (writeErr) => {
            if (writeErr) {
              res.writeHead(500, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify({ error: 'Failed to write database' }));
              return;
            }

            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify(review));
          });
        });
      } catch (parseErr) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Invalid JSON' }));
      }
    });
  } else {
    res.writeHead(404);
    res.end();
  }
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`\n======================================================`);
  console.log(`Mock Firebase Sync Server running!`);
  console.log(`Local Access:   http://localhost:${PORT}`);
  console.log(`Network Access: use your laptop IP address with port ${PORT}`);
  console.log(`Saving reviews to: ${DB_FILE}`);
  console.log(`======================================================\n`);
});
