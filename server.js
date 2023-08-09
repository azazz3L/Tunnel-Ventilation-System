const express = require("express");
const puppeteer = require("puppeteer");
const path = require("path");
const ejs = require("ejs");
const bcrypt = require("bcrypt");
const mongodb = require("mongodb");
const MongoClient = mongodb.MongoClient;
const session = require("express-session");
const app = express();
const bodyParser = require('body-parser');
const fs = require('fs');
const { ObjectId } = require('mongodb');
const { QuillDeltaToHtmlConverter } = require('quill-delta-to-html');
const cors = require('cors');



app.use(express.static('public'));
app.use(express.static(path.join(__dirname, 'public'))); // Add this line here
app.use(cors());
app.use(bodyParser.json()); // support parsing of application/json type post data
app.use(bodyParser.urlencoded({ extended: true })); //support parsing of application/x-www-form-urlencoded post data

app.set("view engine", "ejs");
app.set("views", path.join(__dirname));
app.use(express.json());
app.use(
  session({
    secret: "your-secret-key", // replace with a real secret in production
    resave: false,
    saveUninitialized: false,
  })
);
const port = 35735;
let calculationsData = null;

app.listen(35735, () => {
  console.log("Server is running on port 35735");
});


app.get('/', function(req, res) {
  res.redirect('/login');
});
// User Authentication routes
const url = "mongodb+srv://hitesh_khanna:AnandMincons@cluster0.sc5xhui.mongodb.net/";
const dbName = "AnandMincons"; // REPLACE WITH YOUR DATABASE NAME

app.get("/login", function (req, res) {
  res.sendFile(path.join(__dirname, "/loginpage.html"));
});

app.get("/register", function (req, res) {
  res.sendFile(path.join(__dirname, "/register.html"));
});

app.post('/register', async (req, res) => {
  const client = new MongoClient(url);
  try {
      await client.connect();
      const db = client.db(dbName);
      const users = db.collection('users');

      // Check if user already exists
      const existingUser = await users.findOne({ username: req.body.username });
      if (existingUser) {
          res.status(400).send({ error: 'Username already taken' });
          return;
      }

      // Hash the password - never store passwords in plaintext!
      const hashedPassword = await bcrypt.hash(req.body.password, 10);

      const user = { username: req.body.username, password: hashedPassword };
      const result = await users.insertOne(user);

      res.send({ success: true, id: result.insertedId });
  } finally {
      await client.close();
  }
});



app.post('/login', async (req, res) => {
  const client = new MongoClient(url);
  try {
      await client.connect();
      const db = client.db(dbName);
      const users = db.collection('users');

      const user = await users.findOne({ username: req.body.username });
      if (user) {
          const isPasswordCorrect = await bcrypt.compare(req.body.password, user.password);
          if (isPasswordCorrect) {
              // Save user details and isAdmin flag in the session
              req.session.user = { username: user.username, isAdmin: user.isAdmin };
              // Redirect based on user type
              if (user.isAdmin) {
                  res.redirect('/admin');
              } else {
                  res.redirect('/calc.html');
              }
          } else {
              res.status(401).send({ error: 'Incorrect password' });
          }
      } else {
          res.status(404).send({ error: 'User not found' });
      }
  } finally {
      await client.close();
  }
});

app.get('/logout', function(req, res) {
  req.session.destroy(function(err) {
      if(err) {
          console.log(err);
      } else {
          res.redirect('/login'); // or redirect to any other page
      }
  });
});


function checkAuthenticated(req, res, next) {
  if (req.session.user) {
    next();
  } else {
    res.redirect("/login");
  }
}

app.use(checkAuthenticated);
app.use(express.static(path.join(__dirname)));




app.get('/admin', async (req, res) => {
  // Check if the user is logged in and is an admin
  if (req.session.user && req.session.user.isAdmin) {
    const client = new MongoClient(url);
    try {
      await client.connect();
      const db = client.db(dbName);
      const projects = db.collection('PDF-Data');
      
      const allProjects = await projects.find().toArray();
      console.log(allProjects);  // Add this line
      res.render('admin', { projects: allProjects });
    } finally {
      await client.close();
    }
  } else {
    res.redirect('/login');
  }
});




app.post("/save-calculations", async (req, res) => {
  console.log('Received data:', req.body); // log incoming request data
  calculationsData = req.body; // Save the calculations
  console.log('Calculations received:', calculationsData); // log saved calculations

  const client = new MongoClient(url);
  try {
    await client.connect();
    const db = client.db(dbName);
    const calculations = db.collection('Calculations');
    
    const result = await calculations.insertOne({
      data: calculationsData,
      createdAt: new Date()
    });

    console.log('Inserted document with ID:', result.insertedId); // log the id of the inserted document
  } catch(err) {
    console.error('Failed to save calculations:', err); // log any errors
  } finally {
    await client.close();
  }

  res.sendStatus(200);
});


async function generatePdf(calculatedValues) {
  return new Promise((resolve, reject) => {
   let deltaOps = calculatedValues.text; // your delta object
    console.log(deltaOps);
    let cfg = {};
    console.log("hello");
    let converter = new QuillDeltaToHtmlConverter(deltaOps.ops, cfg);
    let htmlContent = converter.convert(); 
    console.log(htmlContent); // logs the converted HTML to the console

    ejs.renderFile(path.join(__dirname, 'template.ejs'), { calculatedValues, htmlContent }, async function(err, html){
      if (err){
        console.error('Error in rendering ejs:', err);
        reject(err); // if there is an error, reject the Promise
      }

      try {
        const browser = await puppeteer.launch();
        const page = await browser.newPage();
      
        await page.setContent(html);
        const pdfBuffer = await page.pdf({ format: 'A4', printBackground: true });
      
        await browser.close();

        resolve(pdfBuffer); // if everything went fine, resolve the Promise with the pdfBuffer
      } catch (error) {
        console.error('Error in generating PDF:', error);
        reject(error); // if there is an error, reject the Promise
      }
    });
  });
}

app.post('/save-project', async (req, res) => {
  console.log(req);
  const { calculations } = req.body;

  // Generate and save PDF
  console.log("Showing Calculations");
  console.log(calculations);
  const pdfBuffer = await generatePdf(calculations); // replace this with your PDF generation logic

  // Check if directory exists, if not, create it
  const dir = path.join(__dirname, 'public', 'pdfs');
  if (!fs.existsSync(dir)){
    fs.mkdirSync(dir, { recursive: true });
  }

  // Assume that calculations has a projectId
  const projectId = calculations.projectNumber;
  
  const pdfPath = path.join(dir, `${projectId}.pdf`);
  fs.writeFileSync(pdfPath, pdfBuffer);

  const pdfUrl = `/pdfs/${projectId}.pdf`;

  const client = new MongoClient(url);
  try {
    await client.connect();
    const db = client.db(dbName);
    const projects = db.collection('PDF-Data');
    
    const result = await projects.insertOne({
      calculations,
      pdfUrl
    });

    res.sendStatus(200);
  } finally {
    await client.close();
  }
});



app.get('/generate-pdf', async (req, res) => {
  const client = new MongoClient(url);
  let calculatedValues = null;

  try {
    await client.connect();
    const db = client.db(dbName);
    const calculations = db.collection('Calculations');
    // Get the latest document in the collection
    calculatedValues = await calculations.find().sort({ createdAt: -1 }).limit(1).next();
    console.log('Calc Values');
    console.log(calculatedValues);
    console.log(calculatedValues.data.calculations.text);

   


  } catch (err) {
    console.error('Error retrieving calculations:', err);
  } finally {
    await client.close();
  }

  // Check if calculatedValues.data exists and pass it to the template
  if (calculatedValues && calculatedValues.data) {

    let deltaOps = calculatedValues.data.calculations.text; // your delta object
    console.log(deltaOps);
    let cfg = {};
    console.log("hello");
    let converter = new QuillDeltaToHtmlConverter(deltaOps.ops, cfg);
    let html = converter.convert(); 
    console.log(html); // logs the converted HTML to the console

    res.render('template', { calculatedValues: calculatedValues.data.calculations ,htmlContent: html });
  } else {
    res.status(500).send('Error: No data found for PDF generation');
  }
});





app.get('/api/user', function (req, res) {
  if (req.session && req.session.user) {
    res.json(req.session.user);
  } else {
    res.json({});
  }
});


app.post('/new-project', async (req, res) => {

  const client = new MongoClient(url);

  await client.connect();
  const db = client.db(dbName);
  const collection = db.collection('Projects');
  const counters = db.collection('Counter');

  // Generate a unique project number
  // Use the current date and a sequence number from the database
  const date = new Date();
  const counter = await counters.findOneAndUpdate(
    { _id: 'projectNumber' },
    { $inc: { seq: 1 } },
    { returnOriginal: false }
  );

  const projectNumber = `PRJ${date.getDate().toString().padStart(2, '0')}${(date.getMonth() + 1).toString().padStart(2, '0')}${date.getFullYear()}-${counter.value.seq}`;

  // Create a new project in the database
  const project = {
    projectNumber,
    // Add any other properties you need for the project
  };

  try {
    const result = await collection.insertOne(project);
    console.log(`Successfully inserted item with _id: ${result.insertedId}`);
    res.json({ projectNumber: projectNumber });
  } catch (err) {
    console.error(`Failed to insert item: ${err}`);
    res.status(500).json({ error: 'Failed to create new project' });
  }

  await client.close();
});





app.get('/download-pdf/:projectId', async (req, res) => {
  let projectId = req.params.projectId;
  const client = new MongoClient(url);
  
  try {
    await client.connect();
    const db = client.db(dbName);
    const projects = db.collection('PDF-Data');
    const project = await projects.findOne({ _id: new ObjectId(projectId) });

    if (!project) {
      console.error('Project does not exist:', projectId);
      return res.status(404).send('Project does not exist');
    }

    let calculations = project.calculations;

    // Read the template files
    let html = fs.readFileSync(path.join(__dirname, 'template.html'), 'utf8');

    // Generate table rows
    let rows = `
      <tr>
        <td>Air Density</td>
        <td></td>
        <td>${calculations.airDensity.toFixed(2)}</td>
      </tr>
      <tr>
        <td>LD Factor</td>
        <td></td>
        <td>${calculations.ldFactor.toFixed(2)}</td>
      </tr>
      <tr>
        <td>Pressure Factor</td>
        <td></td>
        <td>${calculations.pressureFactor.toFixed(2)}</td>
      </tr>
      <!-- Add more rows for additional properties -->
    `;

    // Inject the date and table rows into the template
    html = html.replace('<p id="date"></p>', `<p id="date">Date: ${calculations.projectDate}</p>`);
    html = html.replace('<!-- Content will be added dynamically -->', rows);

    // Launch Puppeteer
    const browser = await puppeteer.launch();
    const page = await browser.newPage();

    // Set the HTML content and render as PDF
    await page.setContent(html, { waitUntil: 'networkidle0' });
    const pdf = await page.pdf({ format: 'A4' });

    // Set headers
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename=${calculations.projectNumber}.pdf`);

    // Send the PDF
    res.send(pdf);

    await browser.close();
  } catch (err) {
    console.error('Error connecting to MongoDB:', err);
    res.status(500).send('Error connecting to MongoDB');
  } finally {
    await client.close();
  }
});


//Changes

app.get('/search', async (req, res) => {
  const client = new MongoClient(url);

  try {
    await client.connect();
    const db = client.db(dbName);
    const projects = db.collection('PDF-Data');

    // Define the fields to search within
    const searchFields = ['calculations.projectNumber', 'calculations.projectName', 'calculations.companyName', 'calculations.tunnelName','calculations.projectDate'];

    // Create an array of search queries for each field
    const searchQueries = searchFields.map(field => {
      return { [field]: { $regex: new RegExp(req.query.query, "i") } };
    });

    // Use the $or operator to search in all fields
    const searchQuery = { $or: searchQueries };

    const matchingProjects = await projects.find(searchQuery).toArray();

    res.json(matchingProjects);
  } finally {
    await client.close();
  }
});


app.get('/all-projects', async (req, res) => {
  const client = new MongoClient(url);

  try {
    await client.connect();
    const db = client.db(dbName);
    const projects = db.collection('PDF-Data');

    const allProjects = await projects.find({}).toArray();

    res.json(allProjects);
  } finally {
    await client.close();
  }
});