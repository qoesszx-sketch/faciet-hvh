const express = require('express');
const fs = require('fs');
const path = require('path');
const app = express();

app.use(express.json());
app.use(express.static(__dirname)); // Раздает index.html из корня

const DB_PATH = './database.json';
const INVITES_PATH = './invites.json';

// --- АВТОМАТИЧЕСКАЯ ПРОВЕРКА ФАЙЛОВ ---
if (!fs.existsSync(DB_PATH)) {
    fs.writeFileSync(DB_PATH, JSON.stringify({}, null, 2));
    console.log("[INIT] database.json создан.");
}

// --- API: РЕГИСТРАЦИЯ ---
app.post('/api/register', (req, res) => {
    try {
        const { login, password, nickname, invite } = req.body;

        if (!login || !password || !nickname || !invite) {
            return res.status(400).json({ error: "Заполните все поля!" });
        }

        // Читаем инвайты
        const invites = JSON.parse(fs.readFileSync(INVITES_PATH, 'utf8'));
        const inviteIndex = invites.indexOf(invite.trim());

        if (inviteIndex === -1) {
            console.log(`[AUTH] Отказ: Неверный инвайт [${invite}]`);
            return res.status(403).json({ error: "INVALID INVITE" });
        }

        const db = JSON.parse(fs.readFileSync(DB_PATH, 'utf8'));
        if (db[login]) {
            return res.status(400).json({ error: "Логин занят!" });
        }

        // Сохраняем игрока
        db[login] = { 
            password, 
            nickname, 
            elo: 100, 
            level: 1, 
            matches: 0, 
            wins: 0 
        };
        fs.writeFileSync(DB_PATH, JSON.stringify(db, null, 2));

        console.log(`[SUCCESS] Зарегистрирован: ${nickname}`);
        res.json({ success: true });

    } catch (err) {
        console.error("[ERROR]", err);
        res.status(500).json({ error: "Ошибка сервера" });
    }
});

// --- API: ВХОД ---
app.post('/api/login', (req, res) => {
    const { login, password } = req.body;
    const db = JSON.parse(fs.readFileSync(DB_PATH, 'utf8'));

    if (db[login] && db[login].password === password) {
        res.json({ success: true, user: db[login] });
    } else {
        res.status(401).json({ error: "Ошибка авторизации" });
    }
});

// --- API: МАТЧМЕЙКИНГ ---
app.post('/api/match', (req, res) => {
    const { login } = req.body;
    const db = JSON.parse(fs.readFileSync(DB_PATH, 'utf8'));

    if (!db[login]) return res.status(404).send();

    setTimeout(() => {
        const win = Math.random() > 0.45;
        const gain = win ? 25 : -20;
        
        db[login].elo += gain;
        if (db[login].elo < 100) db[login].elo = 100;
        db[login].matches += 1;
        if (win) db[login].wins += 1;
        
        // Расчет уровня Faceit
        let e = db[login].elo;
        let lvl = 1;
        if(e >= 200) lvl = 2; if(e >= 400) lvl = 3; if(e >= 600) lvl = 4;
        if(e >= 800) lvl = 5; if(e >= 1000) lvl = 6; if(e >= 1300) lvl = 8; if(e >= 1800) lvl = 10;
        db[login].level = lvl;

        fs.writeFileSync(DB_PATH, JSON.stringify(db, null, 2));
        res.json({ win, gain, user: db[login] });
    }, 4000);
});

const PORT = 8080;
app.listen(PORT, '0.0.0.0', () => {
    console.log(`[SYSTEM] FACEIT.CC запущен на порту ${PORT}`);
});
