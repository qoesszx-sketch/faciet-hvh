const express = require('express');
const fs = require('fs');
const path = require('path');
const app = express();

app.use(express.json());
app.use(express.static(__dirname));

const DB_PATH = './database.json';
const INVITES_PATH = './invites.json';
const NEWS_PATH = './news.json';
const CHAT_PATH = './chat.json';

// Инициализация файлов при запуске
const initFile = (path, content) => {
    if (!fs.existsSync(path)) fs.writeFileSync(path, JSON.stringify(content, null, 2));
};

initFile(DB_PATH, {});
initFile(NEWS_PATH, []);
initFile(CHAT_PATH, []);

// --- API: РЕГИСТРАЦИЯ ---
app.post('/api/register', (req, res) => {
    const { login, password, nickname, invite } = req.body;
    const invites = JSON.parse(fs.readFileSync(INVITES_PATH, 'utf8'));
    
    if (!invites.includes(invite)) return res.status(403).json({ error: "Invalid registration key" });
    
    const db = JSON.parse(fs.readFileSync(DB_PATH, 'utf8'));
    if (db[login]) return res.status(400).json({ error: "Username already taken" });

    db[login] = { 
        password, 
        nickname, 
        elo: 1000, 
        level: 1, 
        matches: 0, 
        wins: 0,
        isAdmin: nickname === 'Admin-hvh'
    };
    
    fs.writeFileSync(DB_PATH, JSON.stringify(db, null, 2));
    res.json({ success: true });
});

// --- API: ВХОД ---
app.post('/api/login', (req, res) => {
    const { login, password } = req.body;
    const db = JSON.parse(fs.readFileSync(DB_PATH, 'utf8'));
    const user = db[login];

    if (user && user.password === password) {
        res.json({ success: true, user });
    } else {
        res.status(401).json({ error: "Login failed" });
    }
});

// --- API: НОВОСТИ (Доступ только для Admin-hvh) ---
app.post('/api/news', (req, res) => {
    const { nickname, text } = req.body;
    if (nickname !== 'Admin-hvh') return res.status(403).json({ error: "No permission" });

    const news = JSON.parse(fs.readFileSync(NEWS_PATH, 'utf8'));
    news.unshift({ text, date: new Date().toLocaleString(), author: nickname });
    fs.writeFileSync(NEWS_PATH, JSON.stringify(news.slice(0, 15), null, 2));
    res.json({ success: true });
});

app.get('/api/news', (req, res) => {
    res.json(JSON.parse(fs.readFileSync(NEWS_PATH, 'utf8')));
});

// --- API: ЧАТ (С сохранением в файл) ---
app.post('/api/chat', (req, res) => {
    const { nickname, message } = req.body;
    const chat = JSON.parse(fs.readFileSync(CHAT_PATH, 'utf8'));
    const msg = { nickname, message, time: new Date().toLocaleTimeString() };
    chat.push(msg);
    fs.writeFileSync(CHAT_PATH, JSON.stringify(chat.slice(-50), null, 2));
    res.json(msg);
});

app.get('/api/chat', (req, res) => {
    res.json(JSON.parse(fs.readFileSync(CHAT_PATH, 'utf8')));
});

const PORT = 8080;
app.listen(PORT, '0.0.0.0', () => console.log(`[SKEET.CC] Engine started on ${PORT}`));