const express = require('express');
const bodyParser = require('body-parser');
const session = require('express-session');
const bcrypt = require('bcrypt');
const sqlite3 = require('sqlite3').verbose();

const app = express();

app.use((req, res, next) => {
  res.setHeader('Content-Security-Policy', "default-src 'self';");
  next();
});

app.use((req, res, next) => {
  res.setHeader('X-Frame-Options', 'DENY');
  next();
});


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
  db.all('SELECT * FROM contacts WHERE userId = ?', [req.session.userId], (err, contacts) => {
    if (err) throw err;
    res.render('phonebook', { contacts });
    
  });
});

app.get('/login', (req, res) => {
  res.render('login');
});

app.post('/login', (req, res) => {
  const { username, password } = req.body;

  db.get('SELECT * FROM users WHERE username = ?' ,[username], (err, user) => {
    if (err) throw err;
    
    if (user && bcrypt.compareSync(password, user.password)) {
      req.session.userId = user.id;
      res.redirect('/');
    } 
    
    else {
      res.redirect('/login');
    }
  });
  
});

app.get('/register', (req, res) => {
  res.render('register');
});

app.post('/register', (req, res) => {
  const { username, password } = req.body;

  const hashedPassword = bcrypt.hashSync(password, 10);

  db.run('INSERT INTO users (username, password) VALUES (?, ?)', [username, hashedPassword], (err) => {
    if (err) throw err;

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

  db.run('INSERT INTO contacts (userId, name, phoneNumber) VALUES (?, ?, ?)', [req.session.userId, name, phoneNumber], (err) => {
    if (err) throw err;
    res.redirect('/');
  });
});

app.get('/edit/:id', requireLogin, (req, res) => {
  const contactId = req.params.id;

  db.get('SELECT * FROM contacts WHERE id = ? AND userId = ?', [contactId, req.session.userId], (err, contact) => {
    if (err) throw err;

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

  db.run('UPDATE contacts SET name = ?, phoneNumber = ? WHERE id = ? AND userId = ?', [name, phoneNumber, contactId, req.session.userId], (err) => {
    if (err) throw err;
    res.redirect('/');
  });
});

app.post('/delete/:id', requireLogin, (req, res) => {
    const contactId = req.params.id;
  
    db.run('DELETE FROM contacts WHERE id = ? AND userId = ?', [contactId, req.session.userId], (err) => {
      if (err) throw err;
      res.redirect('/');
    });
  });


