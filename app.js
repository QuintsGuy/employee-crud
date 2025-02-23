const express = require('express');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
const hbs = require('hbs');
const methodOverride = require('method-override');
const passport = require('passport');
const jwt = require('jsonwebtoken');
const cookieParser = require('cookie-parser');
const Employee = require('./models/Employee');
const User = require('./models/User');
const PORT = process.env.PORT || 3000;
require('dotenv').config();
require('./config/passport')(passport);

const app = express();

app.set('view engine', 'hbs');
app.use(express.static("public"));
app.use(bodyParser.urlencoded({ extended: true }));
app.use(methodOverride('_method'));
app.use(cookieParser());
app.use(passport.initialize());

hbs.registerHelper('eq', (a, b) => a === b);

mongoose.connect(process.env.MONGO_URI)
    .then(() => console.log('Connected to MongoDB.'))
    .catch((err) => console.error('MongoDB connection error: ', err));

app.get('/auth-check', (req, res) => {
    const token = req.cookies.jwtToken;
    if (!token) return res.status(401).json({ msg: 'Unauthorized '});

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        res.json({ user: decoded });
    } catch (err) {
        res.status(401).json({ msg: 'Invalid token '});
    }
})

app.get('/login', (req, res) => { res.render('login'); });

app.post('/login', async (req, res) => {
    try {
        const { username, password } = req.body;
        const user = await User.findOne({ username });

        if (!user) return res.status(400).json({ msg: 'User not found'});

        const isMatch = await user.matchPassword(password);
        if (!isMatch) return res.status(400).json({ msg: 'Invalid credentials'});

        const payload = { id: user.id, username: user.username };
        const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '1hr' });

        res.cookie("jwtToken", token, { httpOnly: true, secure: process.env.NODE_ENV === 'production' });
        res.redirect('/dashboard');
    } catch (err) {
        next(err);
    }
});

app.get('/register', (req, res) => { res.render('register'); });

app.post('/register', async (req, res) => {
    try {
        const { username, email, password } = req.body;
        let user = await User.findOne({ email });

        if (user) return res.status(400).json({ msg: 'Email already exists' });

        user = new User({ username, email, password});
        await user.save();

        const payload = { id: user.id, username: user.username };
        const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '1hr' });

        res.json({ token });
    } catch (err) {
        next(err);
    }
});

app.get('/logout', (req, res) => {
    res.clearCookie('jwtToken');
    res.redirect('/login');
});

const ensureAuthenticated = passport.authenticate('jwt', { session: false });

app.get("/", (req, res) => {
    res.redirect("/login");
});

app.get('/dashboard', ensureAuthenticated, async (req, res) => {
    try {
        res.render('dashboard', {user: req.user });
    } catch (err) {
        next(err);
    }
})

app.get('/create', ensureAuthenticated, (req, res) => {
    res.render('create');
});

app.post('/create', ensureAuthenticated, async (req, res) => {
    try {
        const { firstName, lastName, department, startDate, jobTitle, salary } = req.body;
        await Employee.create({ firstName, lastName, department, startDate, jobTitle, salary });
        res.redirect('/');
    } catch (err) {
        console.error(err);
        res.status(500).send("Error creating new employee.");
    }
    
});

app.get('/update/:id', ensureAuthenticated, async (req, res) => {
    try {
        const employee = await Employee.findById(req.params.id);

        if (employee.startDate) {
            const startDate = new Date(employee.startDate);
            employee.formattedStartDate = startDate.toISOString().split('T')[0];
        }

        res.render('update', { employee });
    } catch (err) {
        console.error(err);
        res.status(500).send('Error fetching employee for update');
    }
});

app.put('/update/:id', ensureAuthenticated, async (req, res) => {
    const { firstName, lastName, department, startDate, jobTitle, salary } = req.body;
    await Employee.findByIdAndUpdate(req.params.id, { firstName, lastName, department, startDate, jobTitle, salary });
    res.redirect('/');
});

app.delete('/delete/:id', ensureAuthenticated, async (req, res) => {
    try {
        await Employee.findByIdAndDelete(req.params.id);
        res.send('<h2>Employee Deleted</h2><a href="/">Go Back</a>');
    } catch (err) {
        console.error(err);
        res.status(500).send("Error deleting employee.");
    }
});

app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).render('error', { message: err.message });
})

app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on port ${PORT}`);
});