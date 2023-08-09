
let a0;
let len;
let dia;
let fricCoeffInt;
let leakage;
let siteHeight;
let temperature;
let pressureAtDuctEnd;
let ventilatorEfficiency;
let zetaLossFactor;
let lossFactor;
let airDensity;
let ldFactor;
let airVelocityAtFace;
let FS;
let a51;
let pressureFactorInt;
let ventilatorVolumeSupply;
let statPressureLoss;
let dynPressureLoss;
let additLosses;
let totalPressureLoss;
let kw;
let projectName;
let projectDate;
let quill; 
let contents;
let tempContainer;
let htmlText;
let costOfElectricty;
let electricPowerPrice;
let durationDays;
var toolbarOptions = [
  ['bold', 'italic', 'underline', 'strike'],        // toggled buttons
  ['blockquote', 'code-block'],

  [{ 'header': 1 }, { 'header': 2 }],               // custom dropdown
  [{ 'list': 'ordered'}, { 'list': 'bullet' }],
  [{ 'script': 'sub'}, { 'script': 'super' }],      // superscript/subscript
  [{ 'indent': '-1'}, { 'indent': '+1' }],          // outdent/indent
  [{ 'direction': 'rtl' }],                         // text direction

  [{ 'size': ['small', false, 'large', 'huge'] }],  // custom dropdown
  [{ 'header': [1, 2, 3, 4, 5, 6, false] }],

  [{ 'color': [] }, { 'background': [] }],          // dropdown with defaults from theme
  [{ 'font': [] }],
  [{ 'align': [] }],

  ['clean']                                         // remove formatting button
];


function calculateLossFactor() {
  let fricCoeffInt = parseFloat(
      document.getElementById("FrictionCoefficient").value
    ),
    FS = parseFloat(document.getElementById("Leakage").value) * 0.000001,
    X3 = 1.73,
    EO = 0.3333,
    TT,
    C,
    X,
    a32,
    lossFactor = 5,
    g0 = 10.0,
    g2 = 1.0,
    ldfactor,
    a0,
    len,
    dia;

  a0 = parseFloat(document.getElementById("AirVolume").value);
  len = parseFloat(document.getElementById("DuctLength").value);
  dia = parseFloat(document.getElementById("DuctDiameter").value);
  let pressureAtDuctEnd = parseFloat(
    document.getElementById("PressureatDuctEnd").value
  );

  ldfactor = len / dia;
  a32 = (a0 * 4) / Math.pow(dia, 2) / Math.PI;
  let a51 = (pressureAtDuctEnd * 2) / 1.2 / Math.pow(a32, 2);

  for (let i = 0; i < 24; i++) {
    let K = 8 * fricCoeffInt * Math.pow(FS, 2) * Math.pow(ldfactor, 3);
    let TM = 2 * Math.sqrt(a51) * Math.pow(FS / fricCoeffInt, EO);

    C = Math.pow(K, EO);
    C += Math.log((1 + TM + Math.pow(TM, 2)) / Math.pow(1 - TM, 2)) / 6;
    C -= Math.atan((2 * TM + 1) / X3) / X3;

    TT = (Math.pow(a51, 1.5) * 8 * FS) / fricCoeffInt;
    TT = Math.pow((TT - 1) / Math.pow(lossFactor, 3) + 1, EO);

    X =
      C -
      (Math.log(1 + TT + Math.pow(TT, 2)) - Math.log(Math.pow(1 - TT, 2))) / 6;
    X += Math.atan((2 * TT + 1) / X3) / X3;

    if (X < 0) {
      g0 = lossFactor;
    } else if (X > 0) {
      g2 = lossFactor;
    }

    lossFactor = (g0 + g2) / 2;
  }
  return lossFactor;
}

function calculateAirDensity(siteHeight, temperature) {
  return (353 * Math.pow(10, -(siteHeight * 0.000046))) / (273 + temperature);
}

function calculateLdFactor(ductLength, ductDiameter) {
  return ductLength / ductDiameter;
}

function calculateAirVelocityAtFace(airVolAtFront, dia) {
  return (airVolAtFront * 4) / (Math.pow(dia, 2) * Math.PI);
}

function calculateFS(leakage) {
  return leakage * 0.000001;
}

function calculateA51(pressureAtDuctEnd, airDensity, airVelocity) {
  return (pressureAtDuctEnd * 2) / airDensity / Math.pow(airVelocity, 2);
}

function calculatePressureFactorInt(lossFactor, fricCoeffInt, FS, a51) {
  return Math.pow(
    ((Math.pow(lossFactor, 3) - 1) * fricCoeffInt) / (8 * FS) +
      Math.pow(a51, 1.5),
    2 / 3
  );
}

function calculateVentilatorVolumeSupply(airVolAtFront, lossFactor) {
  return airVolAtFront * lossFactor;
}

function calculateStatPressureLoss(airDensity, pressureFactor, airVelocity) {
  return (airDensity * pressureFactor * Math.pow(airVelocity, 2)) / 2;
}

function calculateDynPressureLoss(
  airDensity,
  ventilatorVolumeSupply,
  ductDiameter
) {
  return (
    (airDensity / 2) *
    Math.pow(
      (ventilatorVolumeSupply * 4) / Math.pow(ductDiameter, 2) / Math.PI,
      2
    )
  );
}

function calculateAdditLosses(zetaLossFactor, dynPressureLoss) {
  return zetaLossFactor * dynPressureLoss;
}

function calculateTotalPressureLoss(
  statPressureLoss,
  dynPressureLoss,
  additLosses
) {
  return statPressureLoss + dynPressureLoss + additLosses;
}

function calculateKW(
  ventilatorVolumeSupply,
  totalPressureLoss,
  ventilatorEfficiency
) {
  return (
    (ventilatorVolumeSupply * totalPressureLoss) / 1020 / ventilatorEfficiency
  );
}
function saveCalculations() {
  fetch("http://localhost:35735/save-calculations", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      calculations: getCalculatedValues(),
    }),
  }).then((response) => {
    if (!response.ok) {
      console.error("Failed to save calculations");
    }
  });
}

function saveProject() {
  return new Promise((resolve, reject) => {
    fetch("http://localhost:35735/save-project", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        calculations: getCalculatedValues(),
      }),
    })
    .then((response) => {
      if (response.ok) {
        resolve(); // If the response was OK, resolve the Promise
      } else {
        reject(new Error("Failed to save project")); // If there was an error, reject the Promise
      }
    })
    .catch((error) => {
      reject(new Error(`Fetch error: ${error}`)); // If there was an error with the fetch request, reject the Promise
    });
  });
}


function performCalculations() {
  electricPowerPrice = parseFloat(document.getElementById('ElectricPowerPrice').value)
  durationDays = parseFloat(document.getElementById('ProductionDays').value);
  a0 = parseFloat(document.getElementById("AirVolume").value);
  len = parseFloat(document.getElementById("DuctLength").value);
  dia = parseFloat(document.getElementById("DuctDiameter").value);
  fricCoeffInt = parseFloat(
    document.getElementById("FrictionCoefficient").value
  );
  leakage = parseFloat(document.getElementById("Leakage").value);
  siteHeight = parseFloat(document.getElementById("SiteHeightM").value);
  temperature = parseFloat(document.getElementById("Temperature").value);
  pressureAtDuctEnd = parseFloat(
    document.getElementById("PressureatDuctEnd").value
  );
  ventilatorEfficiency = parseFloat(
    document.getElementById("VentilatorEfficiency").value
  );
  zetaLossFactor = parseFloat(document.getElementById("ZetaLossFactor").value);

  lossFactor = calculateLossFactor();
  airDensity = calculateAirDensity(siteHeight, temperature);
  ldFactor = calculateLdFactor(len, dia);
  airVelocityAtFace = calculateAirVelocityAtFace(a0, dia);
  FS = calculateFS(leakage);
  a51 = calculateA51(pressureAtDuctEnd, airDensity, airVelocityAtFace);
  pressureFactorInt = calculatePressureFactorInt(
    lossFactor,
    fricCoeffInt,
    FS,
    a51
  );
  ventilatorVolumeSupply = calculateVentilatorVolumeSupply(a0, lossFactor);
  statPressureLoss = calculateStatPressureLoss(
    airDensity,
    pressureFactorInt,
    airVelocityAtFace
  );
  dynPressureLoss = calculateDynPressureLoss(
    airDensity,
    ventilatorVolumeSupply,
    dia
  );
  additLosses = calculateAdditLosses(zetaLossFactor, dynPressureLoss);
  totalPressureLoss = calculateTotalPressureLoss(
    statPressureLoss,
    dynPressureLoss,
    additLosses
  );
  kw = calculateKW(
    ventilatorVolumeSupply,
    totalPressureLoss,
    ventilatorEfficiency
  );

  document.getElementById("AirDensity").value = airDensity.toFixed(2);
  document.getElementById("LDFactor").value = ldFactor.toFixed(2);
  document.getElementById("PressureFactora1").value =
    pressureFactorInt.toFixed(2);
  document.getElementById("LossFactor").value = lossFactor.toFixed(2);
  document.getElementById("VentilatorVolumeSupply").value =
    ventilatorVolumeSupply.toFixed(2);
  document.getElementById("StatPressureLoss").value =
    statPressureLoss.toFixed(2);
  document.getElementById("DynPressureLoss").value = dynPressureLoss.toFixed(2);
  document.getElementById("AdditLosses").value = additLosses.toFixed(2);
  document.getElementById("TotalPressureLoss").value =
    totalPressureLoss.toFixed(2);
  document.getElementById("MinimumInstCapacity").value = kw.toFixed(2);
  projectName = document.getElementById("ProjectName").value;

  costOfElectricty = electricPowerPrice * durationDays;
  let currency = function () {
    let currencyCode = document.getElementById('CurrencyPerKWH').value;
    switch(currencyCode) {
        case 'INR': return '₹';
        case 'USD': return '$';
        case 'EUR': return '€';
        case 'GBP': return '£';
        case 'JPY': return '¥';
        case 'CNY': return '¥';
        case 'AUD': return 'A$';
        // Add more currencies as needed
        default: return '';
    }
  }
  costOfElectricty = `${currency()} ${costOfElectricty}`
  document.getElementById('CostOfElectricity').value = costOfElectricty;
}




function getCalculatedValues() {
  // Perform calculations and return the result as an object
  return {
    companyName: document.getElementById('CompanyName').value,
    projectName: projectName,
    tunnelName: document.getElementById('TunnelName').value,
    excavationType: document.querySelector('select[name="TypeofExcavation"]').value,
    projectNumber: document.getElementById('ProjectNumber').value,
    tunnelType: document.querySelector('select[name="TypeofTunnel"]').value,
    tunnelArea:document.getElementById('TunnelArea').value,
    tunnelHeight:document.getElementById('TunnelHeight').value,
    tunnelWidth:document.getElementById('TunnelWidth').value,
    rav:document.getElementById('RAV').value,
    productionDays:document.getElementById('ProductionDays').value,
    electricPowerPrice:document.getElementById('ElectricPowerPrice').value,
    currency: document.querySelector('select[name="CurrencyPerKWH"]').value,
    projectDate: projectDate,
    ductClassification:document.querySelector('select[name="DuctClassification"]').value,
    application: document.getElementById('Application').value,
    personIncharge: document.getElementById('PersoninCharge').value,
    customer: document.getElementById('Customer').value,
    ductLength: len,
    ductDiameter: dia,
    fricCoeffInt: fricCoeffInt,
    leakage: leakage,
    siteHeight: siteHeight,
    temperature: temperature,
    airVolAtFront: a0,
    pressureAtDuctEnd: pressureAtDuctEnd,
    ventilatorEfficiency: ventilatorEfficiency,
    zetaLossFactor: zetaLossFactor,
    airDensity: airDensity,
    ldFactor: ldFactor,
    pressureFactor: pressureFactorInt,
    lossFactor: lossFactor,
    ventilatorVolumeSupply: ventilatorVolumeSupply,
    statPressureLoss: statPressureLoss,
    dynPressureLoss: dynPressureLoss,
    additLosses: additLosses,
    totalPressureLoss: totalPressureLoss,
    kw: kw,
    costOfElectricty: costOfElectricty,
    text: quill.getContents()
    
  };
}

document.addEventListener("DOMContentLoaded", function () {
  document.getElementById("Calculate").addEventListener("click", async function () {
    await performCalculations();
    saveCalculations();
  });
});




document.addEventListener("DOMContentLoaded", function () {
  document.getElementById("Save").addEventListener("click", function () {
    const field1 = document.getElementById("ProjectName");

    // Saving calculations when Save button clicked
    saveProject()
      .then(() => {
        alert("Save Successful"); // This will be called if the Promise resolves successfully
      })
      .catch((error) => {
        console.error(error);
        alert("Error: Save Failed"); // This will be called if the Promise is rejected
      });
  });
});
document.addEventListener("DOMContentLoaded", function () {
  quill = new Quill('#editor', {
    modules: {
      toolbar: toolbarOptions
    },
    theme: 'snow'
  });
  document.getElementById("Generate").addEventListener("click", function () {
    

    // Open the PDF in a new tab
    window.open("http://localhost:35735/generate-pdf", "_blank");
  });
});

document.addEventListener("DOMContentLoaded", function () {
  // Getting the field by its ID
  let projectDateField = document.getElementById("ProjectDate");
  // Creating a new Date object
  let currentDate = new Date();
  // Formatting the date as a string in the YYYY-MM-DD format
  let formattedDate =
    currentDate.getDate().toString().padStart(2, "0") +
    "-" +
    (currentDate.getMonth() + 1).toString().padStart(2, "0") +
    "-" +
    currentDate.getFullYear();
  // Setting the value of the field to the formatted date
  projectDateField.value = formattedDate;
  projectDate = formattedDate;
});




window.addEventListener("DOMContentLoaded", (event) => {
  // Get the "Project Name" input field and the buttons
  const projectNameInput = document.querySelector("#ProjectName");
  const generatePdfButton = document.querySelector("#Generate");
  const saveProjectButton = document.querySelector("#Save");

  // Function to check the "Project Name" input field value and enable or disable the buttons
  const checkProjectName = () => {
    const isProjectNameEmpty = projectNameInput.value.trim() === "";
    generatePdfButton.disabled = isProjectNameEmpty;
    saveProjectButton.disabled = isProjectNameEmpty;
  };

  // Call the checkProjectName function when the page loads
  checkProjectName();

  // Add an event listener to the "Project Name" input field to call the checkProjectName function every time the field value changes
  projectNameInput.addEventListener("input", checkProjectName);
});


document.addEventListener("DOMContentLoaded", async function () {
  try {
    const response = await fetch('http://localhost:35735/new-project', { method: 'POST' });
    if (response.ok) {
      const data = await response.json();
      // Store the project number in session data
      sessionStorage.setItem('projectNumber', data.projectNumber);
      console.log(`Project Number: ${data.projectNumber} saved to session.`);

      // Set the value of the ProjectNumber field
      document.getElementById('ProjectNumber').value = data.projectNumber;
    } else {
      console.log('Error: ', response.status, response.statusText);
    }
  } catch (error) {
    console.error('Error:', error);
  }

  fetch("/api/user")
    .then((response) => response.json())
    .then((user) => {
      const adminConsoleButton = document.getElementById("adminConsoleButton");
      if (user.isAdmin) {
        adminConsoleButton.style.display = "block";
      }
    });

  document.getElementById("FrictionCoefficient").value = 0.018;
  document.getElementById("Leakage").value = 10;
  document.getElementById("SiteHeightM").value = 50;
  document.getElementById("Temperature").value = 20;
  document.getElementById("PressureatDuctEnd").value = 100;
  document.getElementById("VentilatorEfficiency").value = 0.8;
  document.getElementById("ZetaLossFactor").value = 1;
});


document.addEventListener("DOMContentLoaded", async function () {
  // Your existing functions here...
  let TunnelHeight = document.getElementById('TunnelHeight');
  let TunnelWidth = document.getElementById('TunnelWidth');
  let TypeofTunnel = document.querySelector('select[name="TypeofTunnel"]');
  let RAV = document.getElementById('RAV');
  let AirVolume = document.getElementById('AirVolume');
  
  let Area = document.getElementById('TunnelArea');

  function calculateArea() {
    let height = parseFloat(TunnelHeight.value);
    let width = parseFloat(TunnelWidth.value);
    let type = TypeofTunnel.value;
    let area = parseFloat(Area.value);

    if (!isNaN(height) && !isNaN(width) && type && type !== "") {
      // Check that rav is a valid number
  
      if(type=="DShape"){
         area = width * width * 0.8927;
         Area.value = area.toFixed(2);
      }

      else{
        area = width * width * 0.82932;
        Area.value = area.toFixed(2);
      }
      calculateVolume();
    }


  }

  function calculateVolume(){
    
    let area = parseFloat(Area.value);
    let rav = parseFloat(RAV.value); // Get the value of the RAV input field
    let volume;

    if(!isNaN(area) && !isNaN(rav) ){
      volume = area * rav;
      AirVolume.value = volume.toFixed(2);
    }


  }

  

  TunnelHeight.addEventListener('input', calculateArea);
  TunnelWidth.addEventListener('input', calculateArea);
  TypeofTunnel.addEventListener('change', calculateArea);
  RAV.addEventListener('input', calculateVolume); // Listen for input changes in RAV as well
  Area.addEventListener('input', calculateVolume);
});

document.addEventListener("DOMContentLoaded", async function () {

  let ductClassification = document.querySelector('select[name="DuctClassification"]');

  function changeInputValues(){

    let type = ductClassification.value;
    if(type == 'A'){
      document.getElementById("FrictionCoefficient").value = 0.018;
      document.getElementById("Leakage").value = 10;
    }
    else if(type == 'B'){
      document.getElementById("FrictionCoefficient").value = 0.024;
      document.getElementById("Leakage").value = 20;
    }
    else if(type == 'X'){
      document.getElementById("FrictionCoefficient").value = 0.02;
      document.getElementById("Leakage").value = 10;
    }
  }

  ductClassification.addEventListener('change',changeInputValues);
})