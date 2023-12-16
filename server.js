const express = require('express');
const bodyParser = require('body-parser');
const session = require('express-session');
const sqlite3 = require('sqlite3').verbose();

const app = express();

app.listen(3000, () => {
  console.log("Server is running!");
});

app.use(express.static('public'));
app.use(bodyParser.urlencoded({ extended: true }));
app.use(session({ secret: 'secret-key', resave: false, saveUninitialized: true }));
app.set('view engine', 'ejs');

const db = new sqlite3.Database('./phonebook.db');
db.serialize(() => {
  db.run('CREATE TABLE IF NOT EXISTS users (id INTEGER PRIMARY KEY, username TEXT, password TEXT)');
  db.run('CREATE TABLE IF NOT EXISTS contacts (id INTEGER PRIMARY KEY, userId INTEGER, name TEXT, phoneNumber TEXT)');
});

const requireLogin = (req, res, next) => {
  if (!req.session.userId) {
    res.redirect('/login');
  } else {
    next();
  }
};

app.get('/', requireLogin, (req, res) => {
  const sql = `SELECT * FROM contacts WHERE userId = ${req.session.userId}`;

  db.all(sql, (err, contacts) => {
    if (err) {
      console.error(err.message);
      res.status(500).send('Internal Server Error');
      return;
    }
    res.render('phonebook', { contacts });
  });
});

app.get('/login', (req, res) => {
  res.render('login');
});

app.post('/login', (req, res) => {
  const { username, password } = req.body;

  const sql = `SELECT * FROM users WHERE username = '${username}' AND password = '${password}'`;

  db.get(sql, (err, user) => {
    if (err) {
      console.error(err.message);
      res.status(500).send('Internal Server Error');
      return;
    }

    if (user) {
      req.session.userId = user.id;
      res.redirect('/');
    } else {
      res.redirect('/login');
    }
  });
});

app.get('/register', (req, res) => {
  res.render('register');
});

app.post('/register', (req, res) => {
  const { username, password } = req.body;

  const sql = `INSERT INTO users (username, password) VALUES ('${username}', '${password}')`;

  db.run(sql, (err) => {
    if (err) {
      console.error(err.message);
      res.status(500).send('Internal Server Error');
      return;
    }

    res.redirect('/login');
  });
});

app.get('/logout', (req, res) => {
  req.session.destroy(() => {
    res.redirect('/login');
  });
});

app.get('/addContact', requireLogin, (req, res) => {
  res.render('addContact');
});

app.post('/addContact', requireLogin, (req, res) => {
  const { name, phoneNumber } = req.body;

  const sql = `INSERT INTO contacts (userId, name, phoneNumber) VALUES (${req.session.userId}, '${name}', '${phoneNumber}')`;

  db.run(sql, (err) => {
    if (err) {
      console.error(err.message);
      res.status(500).send('Internal Server Error');
      return;
    }

    res.redirect('/');
  });
});

app.get('/edit/:id', requireLogin, (req, res) => {
  const contactId = req.params.id;

  const sql = `SELECT * FROM contacts WHERE id = ${contactId} AND userId = ${req.session.userId}`;

  db.get(sql, (err, contact) => {
    if (err) {
      console.error(err.message);
      res.status(500).send('Internal Server Error');
      return;
    }

    if (contact) {
      res.render('editContact', { contact });
    } else {
      res.redirect('/');
    }
  });
});

app.post('/edit/:id', requireLogin, (req, res) => {
  const contactId = req.params.id;
  const { name, phoneNumber } = req.body;

  const sql = `UPDATE contacts SET name = '${name}', phoneNumber = '${phoneNumber}' WHERE id = ${contactId} AND userId = ${req.session.userId}`;

  db.run(sql, (err) => {
    if (err) {
      console.error(err.message);
      res.status(500).send('Internal Server Error');
      return;
    }

    res.redirect('/');
  });
});

app.post('/delete/:id', requireLogin, (req, res) => {
  const contactId = req.params.id;

  const sql = `DELETE FROM contacts WHERE id = ${contactId} AND userId = ${req.session.userId}`;

  db.run(sql, (err) => {
    if (err) {
      console.error(err.message);
      res.status(500).send('Internal Server Error');
      return;
    }

    res.redirect('/');
  });
});
