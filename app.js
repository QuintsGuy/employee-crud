const express = require('express');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
const hbs = require('hbs');
const methodOverride = require('method-override');
const Employee = require('./models/Employee');
require('dotenv').config();

const app = express();
const PORT = 3000;

app.set('view engine', 'hbs');
app.use(express.static("public"));
app.use(bodyParser.urlencoded({ extended: true }));
app.use(methodOverride('_method'));

hbs.registerHelper('eq', (a, b) => a === b);

mongoose.connect(process.env.MONGO_URI, {useNewUrlParser: true, useUnifiedTopology: true })
    .then(() => console.log('Connected to MongoDB.'))
    .catch((err) => console.error('MongoDB connection error: ', err));

app.get("/", async (req, res) => {
    try {
        const employees = await Employee.find();
        res.render('view', { employees });
    } catch (err) {
        console.error(err);
        res.status(500).send('Error retrieving employees.');
    }
});

app.get('/create', (req, res) => {
    res.render('create');
});

app.post('/create', async (req, res) => {
    try {
        const { firstName, lastName, department, startDate, jobTitle, salary } = req.body;
        await Employee.create({ firstName, lastName, department, startDate, jobTitle, salary });
        res.redirect('/');
    } catch (err) {
        console.error(err);
        res.status(500).send("Error creating new employee.");
    }
    
});

app.get('/update/:id', async (req, res) => {
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

app.put('/update/:id', async (req, res) => {
    const { firstName, lastName, department, startDate, jobTitle, salary } = req.body;
    await Employee.findByIdAndUpdate(req.params.id, { firstName, lastName, department, startDate, jobTitle, salary });
    res.redirect('/');
});

app.delete('/delete/:id', async (req, res) => {
    try {
        await Employee.findByIdAndDelete(req.params.id);
        res.send('<h2>Employee Deleted</h2><a href="/">Go Back</a>');
    } catch (err) {
        console.error(err);
        res.status(500).send("Error deleting employee.");
    }
});

app.listen(3000, () => {
    console.log("Server running on http://localhost:3000.");
});