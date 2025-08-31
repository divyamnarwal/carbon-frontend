document.addEventListener('DOMContentLoaded', () => {
  // Mobile menu toggle
  const mobileMenuBtn = document.getElementById('mobile-open');
  const nav = document.querySelector('nav');
  if (mobileMenuBtn) {
    mobileMenuBtn.addEventListener('click', () => {
      nav.classList.toggle('hidden');
      nav.classList.toggle('flex');
      nav.classList.toggle('md:hidden');
      nav.classList.toggle('absolute');
      nav.classList.toggle('top-16');
      nav.classList.toggle('left-0');
      nav.classList.toggle('right-0');
      nav.classList.toggle('bg-white');
      nav.classList.toggle('dark:bg-gray-800');
      nav.classList.toggle('p-4');
      nav.classList.toggle('flex-col');
      nav.classList.toggle('items-start');
      nav.classList.toggle('gap-4');
    });
  }

  // Tiny helper: smooth active nav links
  document.querySelectorAll('a.nav-link').forEach(a => {
    a.addEventListener('click', (e) => {
      e.preventDefault();
      const id = a.getAttribute('href').slice(1);
      document.getElementById(id).scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  });

  // Theme toggle
  const themeToggle = document.getElementById('theme-toggle');
  const iconSun = document.getElementById('icon-sun'), iconMoon = document.getElementById('icon-moon');
  function setTheme(dark) {
    if (dark) { document.documentElement.classList.add('dark'); iconMoon.classList.remove('hidden'); iconSun.classList.add('hidden'); localStorage.setItem('cn-theme', 'dark'); }
    else { document.documentElement.classList.remove('dark'); iconSun.classList.remove('hidden'); iconMoon.classList.add('hidden'); localStorage.setItem('cn-theme', 'light'); }
  }
  const stored = localStorage.getItem('cn-theme') || (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
  setTheme(stored === 'dark');
  themeToggle.addEventListener('click', () => setTheme(!document.documentElement.classList.contains('dark')));

  // ---------- DYNAMIC DASHBOARD LOGIC ----------
  const AQI_TOKEN = "c1ebca30b3f4338ff326ce803a2174bbfe4d66c4";

  // Live CO2 Simulation
  const liveCo2ValueEl = document.getElementById('live-co2-value');
  const liveCo2StatusEl = document.getElementById('live-co2-status');
  const quickCo2ValueEl = document.getElementById('quick-co2-value');
  const quickCo2StatusEl = document.getElementById('quick-co2-status');
  let currentCo2 = 420;

  function updateCo2Simulation() {
    currentCo2 += (Math.random() - 0.5) * 4; // Fluctuate
    if (currentCo2 < 415) currentCo2 = 415;
    if (currentCo2 > 500) currentCo2 = 500;
    const co2 = Math.round(currentCo2);

    let statusText, statusColor;
    if (co2 < 440) { statusText = 'Normal'; statusColor = 'text-green-600'; }
    else if (co2 < 470) { statusText = 'Elevated'; statusColor = 'text-yellow-500'; }
    else { statusText = 'High'; statusColor = 'text-red-500'; }

    // Update main dashboard card
    liveCo2ValueEl.textContent = `${co2} ppm`;
    liveCo2StatusEl.textContent = statusText;
    liveCo2StatusEl.className = `font-medium ${statusColor}`;

    // Update hero snapshot card
    quickCo2ValueEl.textContent = `${co2} ppm`;
    quickCo2StatusEl.textContent = statusText;
    quickCo2StatusEl.className = `text-xs mt-1 ${statusColor}`;
  }

  // Live AQI Fetching
  const aqiValueContainerEl = document.getElementById('aqi-value-container');
  const aqiCityEl = document.getElementById('aqi-city');
  const aqiTimestampEl = document.getElementById('aqi-timestamp');
  const aqiDominantEl = document.getElementById('aqi-dominant');
  const aqiCityInputEl = document.getElementById('aqi-city-input');
  const aqiSearchBtn = document.getElementById('aqi-search');
  const showPollutantsBtn = document.getElementById('show-pollutants');
  const pollutantDetailsEl = document.getElementById('pollutant-details');
  const pollutantGridEl = document.getElementById('pollutant-grid');
  
  let currentAqiData = null;

  async function fetchAqiData(city) {
    if (!AQI_TOKEN) {
        aqiCityEl.textContent = "API Token Needed";
        return;
    }
    
    try {
  aqiCityEl.textContent = "Loading...";
  const q = encodeURIComponent(city);
  const response = await fetch(`https://api.waqi.info/feed/${q}/?token=${AQI_TOKEN}`);
      const data = await response.json();
      
      if (data.status === 'ok') {
        currentAqiData = data.data;
        const aqi = data.data.aqi;
        let color = 'bg-gray-400';
        if (aqi <= 50) color = 'bg-green-500';
        else if (aqi <= 100) color = 'bg-yellow-500';
        else if (aqi <= 150) color = 'bg-orange-500';
        else if (aqi <= 200) color = 'bg-red-500';
        else color = 'bg-purple-700';
        
        aqiValueContainerEl.textContent = aqi;
        aqiValueContainerEl.className = `w-28 h-28 rounded-full flex items-center justify-center text-white text-3xl font-bold ${color}`;
  aqiCityEl.textContent = data.data.city?.name?.split(',')[0] || city;
  const t = data.data.time?.s || data.data.time?.iso || Date.now();
  aqiTimestampEl.textContent = `Updated: ${new Date(t).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}`;
        aqiDominantEl.textContent = data.data.dominentpol ? data.data.dominentpol.toUpperCase() : 'N/A';
        
        // Reset pollutants view
        pollutantDetailsEl.classList.add('hidden');
  if (showPollutantsBtn) showPollutantsBtn.textContent = 'Details';
  if (aqiCityInputEl) aqiCityInputEl.value = city;
      } else {
        aqiCityEl.textContent = `Error: ${data.data || 'Invalid response'}`;
        console.error('AQI API Error:', data);
      }
    } catch (error) {
      aqiCityEl.textContent = 'Network error';
      console.error('AQI Fetch Error:', error);
    }
  }
  
  function showPollutantDetails() {
    if (!currentAqiData || !currentAqiData.iaqi) {
      pollutantGridEl.innerHTML = '<div class="text-center col-span-2">No pollutant data available</div>';
      return;
    }
    
    pollutantGridEl.innerHTML = '';
    const iaqi = currentAqiData.iaqi;
    
    // Names of pollutants for display
    const pollutantNames = {
      pm25: 'PM<sub>2.5</sub>',
      pm10: 'PM<sub>10</sub>',
      o3: 'Ozone (O<sub>3</sub>)',
      no2: 'NO<sub>2</sub>',
      so2: 'SO<sub>2</sub>',
      co: 'CO',
      t: 'Temp',
      h: 'Humidity',
      p: 'Pressure',
      w: 'Wind',
      dew: 'Dew'
    };
    
    // Sort pollutants by value
    const pollutants = Object.entries(iaqi)
      .map(([key, value]) => ({ key, value: value.v }))
      .sort((a, b) => b.value - a.value);
    
    pollutants.forEach(({ key, value }) => {
      const name = pollutantNames[key] || key;
      const item = document.createElement('div');
      item.className = 'p-2 border rounded dark:border-gray-700 flex justify-between';
      item.innerHTML = `
        <span>${name}:</span>
        <span class="font-medium">${Number(value).toFixed(3)}</span>
      `;
      pollutantGridEl.appendChild(item);
    });
    
    // Show the pollutant details section
    pollutantDetailsEl.classList.remove('hidden');
  }
  
  // Add event listeners for AQI search and pollutants
  if (aqiSearchBtn) {
    aqiSearchBtn.addEventListener('click', () => {
      const cityName = aqiCityInputEl.value.trim();
      if (cityName) {
        fetchAqiData(cityName);
      }
    });
  }
  
  if (aqiCityInputEl) {
    aqiCityInputEl.addEventListener('keypress', (event) => {
      if (event.key === 'Enter') {
        event.preventDefault();
        const cityName = aqiCityInputEl.value.trim();
        if (cityName) {
          fetchAqiData(cityName);
        }
      }
    });
  }
  
  if (showPollutantsBtn) {
    showPollutantsBtn.addEventListener('click', () => {
      const isHidden = pollutantDetailsEl.classList.contains('hidden');
      if (isHidden) {
        showPollutantDetails();
        showPollutantsBtn.textContent = 'Hide';
      } else {
        pollutantDetailsEl.classList.add('hidden');
        showPollutantsBtn.textContent = 'Details';
      }
    });
  }

  // ---------- Mini charts ----------
  const miniCtx = document.getElementById('mini-forecast').getContext('2d');
  new Chart(miniCtx, { 
    type: 'line', 
    data: { 
      labels: ['-4', '-3', '-2', '-1', 'now'], 
      datasets: [{ 
        label: 'CO₂ (ppm)', 
        data: [410, 412, 419, 420, 421], 
        fill: true, 
        borderColor: 'rgb(75, 192, 192)', 
        tension: 0.1 
      }] 
    }, 
    options: { 
      responsive: true, 
      plugins: { 
        legend: { 
          display: false 
        } 
      } 
    } 
  });
  const dashCtx = document.getElementById('dashboard-forecast').getContext('2d');
  new Chart(dashCtx, { type: 'bar', data: { labels: ['M1', 'M2', 'M3', 'M4'], datasets: [{ label: 'Projected CO₂e', data: [800, 820, 780, 760], backgroundColor: 'rgba(75, 192, 192, 0.2)', borderColor: 'rgba(75, 192, 192, 1)', borderWidth: 1 }] }, options: { responsive: true, plugins: { legend: { display: false } } } });

  // --------- Footprint calculator logic ----------
  const EF_CAR_KM = 0.00018, EF_FLIGHT_HOUR = 0.09, EF_ELECTRICITY_INR = 0.00085 / 8;
  const EF_DIET = { 'meat-high': 3.3, 'meat-medium': 2.5, 'meat-low': 1.9, 'vegetarian': 1.7, 'vegan': 1.5 };
  const EF_SHOP = 0.00004;
  
  // Slider UI Polish
  const sliders = [
    { id: 'fp-car-kms', valId: 'fp-car-kms-val', unit: ' km' },
    { id: 'fp-flights', valId: 'fp-flights-val', unit: ' hrs' },
    { id: 'fp-electricity', valId: 'fp-electricity-val', unit: '' },
    { id: 'fp-shopping', valId: 'fp-shopping-val', unit: '' }
  ];
  sliders.forEach(slider => {
    const el = document.getElementById(slider.id);
    const valEl = document.getElementById(slider.valId);
    if (el) {
        el.addEventListener('input', () => {
            valEl.textContent = el.value;
        });
    }
  });

  function calcFootprint() {
    const carKms = Number(document.getElementById('fp-car-kms').value);
    const flights = Number(document.getElementById('fp-flights').value);
    const elec = Number(document.getElementById('fp-electricity').value);
    const shop = Number(document.getElementById('fp-shopping').value);
    const diet = document.getElementById('fp-diet').value;
    const transport = carKms * 52 * EF_CAR_KM + flights * EF_FLIGHT_HOUR;
    let energy = elec * 12 * EF_ELECTRICITY_INR;
    const dietVal = EF_DIET[diet] || 2.5;
    const cons = shop * 12 * EF_SHOP;
    const total = transport + energy + dietVal + cons;
    document.getElementById('fp-total').textContent = total.toFixed(2) + ' t CO₂e';
    // tips
    const tipsEl = document.getElementById('fp-tips');
    const tips = [];
    if (carKms > 100) tips.push('Try carpooling or use public transit for regular commutes.');
    if (flights > 10) tips.push('Reduce flights: consider trains or hybrid meeting options.');
    if (elec > 3000) tips.push('Consider energy efficient appliances or rooftop solar.');
    tipsEl.innerHTML = tips.map(t => '<div>• ' + t + '</div>').join('');
    // chart
    const ctx = document.getElementById('fp-chart').getContext('2d');
    if (window.fpChart) window.fpChart.destroy();
    window.fpChart = new Chart(ctx, { 
      type: 'doughnut', 
      data: { 
        labels: ['Transport', 'Energy', 'Diet', 'Consumption'], 
        datasets: [{ 
          data: [transport, energy, dietVal, cons],
          backgroundColor: [
            'rgba(59, 130, 246, 0.8)',  // Blue
            'rgba(34, 197, 94, 0.8)',   // Green
            'rgba(249, 115, 22, 0.8)',  // Orange
            'rgba(168, 85, 247, 0.8)'   // Purple
          ]
        }] 
      }, 
      options: { 
        responsive: true,
        plugins: {
          legend: {
            labels: {
              color: document.documentElement.classList.contains('dark') ? '#e5e7eb' : '#374151'
            }
          }
        }
      } 
    });
  }

  document.getElementById('fp-calc').addEventListener('click', (e) => { e.preventDefault(); calcFootprint(); });

  // ---------- Travel planner logic ----------
  const CITY_COORDS = { Jaipur: [26.9124, 75.7873], Delhi: [28.6139, 77.2090], Mumbai: [19.0760, 72.8777], Bengaluru: [12.9716, 77.5946], Udaipur: [24.5854, 73.7125] };
  const EF = { flight_short: 0.158, flight_long: 0.110, train: 0.041, bus: 0.089, car_petrol: 0.192, car_diesel: 0.171, car_cng: 0.132, car_ev: 0.050 };

  function haversine(a, b) { const toR = Math.PI / 180; const dLat = (b[0] - a[0]) * toR; const dLon = (b[1] - a[1]) * toR; const R = 6371; const x = Math.sin(dLat / 2) ** 2 + Math.cos(a[0] * toR) * Math.cos(b[0] * toR) * Math.sin(dLon / 2) ** 2; return 2 * R * Math.asin(Math.sqrt(x)); }

  let legs = [];
  const tTableBody = document.querySelector('#t-table tbody');
  const tChartCtx = document.getElementById('t-chart').getContext('2d');
  let tChart;

  function renderLegs() {
    tTableBody.innerHTML = '';
    legs.forEach((l, i) => {
      const tr = document.createElement('tr'); tr.className = 'border-b dark:border-gray-700';
      tr.innerHTML = `<td class="py-2 px-1">${l.origin}→${l.dest}</td><td class="py-2 px-1">${l.mode}</td><td class="py-2 px-1">${l.km}</td><td class="py-2 px-1">${l.kg}</td><td class="py-2 px-1"><button data-i="${i}" class="del text-red-600">Remove</button></td>`;
      tTableBody.appendChild(tr);
    });
    document.querySelectorAll('.del').forEach(btn => btn.addEventListener('click', (e) => { legs.splice(Number(e.target.dataset.i), 1); updatePlan(); }));
  }

  function computeTrip(origin, dest, mode, round) {
    const a = CITY_COORDS[origin], b = CITY_COORDS[dest];
    const km = Math.round(haversine(a, b));
    let kg = 0;
    if (mode === 'flight') {
      const type = km < 1500 ? 'short' : 'long'; const ef = EF['flight_' + type]; kg = km * ef * (round === 'round' ? 2 : 1);
    } else if (mode === 'train') { kg = km * EF.train * (round === 'round' ? 2 : 1); }
    else if (mode === 'bus') { kg = km * EF.bus * (round === 'round' ? 2 : 1); }
    else if (mode === 'car') { kg = km * EF.car_petrol * (round === 'round' ? 2 : 1); }
    return { km, kg: Math.round(kg * 10) / 10 };
  }

  function updatePlan() {
    renderLegs();
    // summary
    const months = Number(document.getElementById('t-months').value) || 6;
    const totalPerMonth = legs.reduce((s, l) => s + (l.kg * (Number(l.trips) || 1)), 0);
    document.getElementById('t-total').textContent = Math.round(totalPerMonth) + ' kg / month';
    // chart: monthly projection for months horizon
    const labels = Array.from({ length: months }, (_, i) => 'M' + (i + 1));
    const datasets = [];
    const modeMap = {};
    legs.forEach(l => {
      const mLabel = l.mode.toUpperCase();
      if (!modeMap[mLabel]) modeMap[mLabel] = Array(labels.length).fill(0);
      const perMonth = l.kg * (Number(l.trips) || 1);
      modeMap[mLabel] = modeMap[mLabel].map(v => v + perMonth);
    });
    Object.entries(modeMap).forEach(([k, v], i) => datasets.push({ label: k, data: v }));
    if (tChart) tChart.destroy();
    tChart = new Chart(tChartCtx, { type: 'bar', data: { labels, datasets }, options: { responsive: true, plugins: { legend: { position: 'top' } }, scales: { x: { stacked: true }, y: { stacked: true } } } });
    // recs simple
    const recsEl = document.getElementById('t-recs');
    const recs = [];
    const flightShare = legs.filter(l => l.mode === 'flight').reduce((s, l) => s + l.kg, 0);
    if (flightShare > 0) recs.push('Consider swapping short flights (<800 km) with train for large savings.');
    if (legs.some(l => l.mode === 'car')) recs.push('Carpooling can reduce per-person emissions significantly.');
    recsEl.innerHTML = recs.map(r => '<li>' + r + '</li>').join('') || '<li>Add a trip to get recommendations.</li>';
    // quick counters update
    document.getElementById('quick-trip-count').textContent = legs.length + ' legs';
    // insights update
    document.getElementById('ins-forecast').textContent = Math.round((totalPerMonth * months)) + ' kg';
    document.getElementById('ins-trees').textContent = Math.round((totalPerMonth * months) / 20) + ' trees';
    document.getElementById('ins-top').textContent = legs.length ? legs.sort((a, b) => b.kg - a.kg)[0].mode.toUpperCase() : '—';
    document.getElementById('ins-tip').textContent = recs[0] || 'Add a trip to see tips.';
  }

  document.getElementById('t-add').addEventListener('click', (e) => {
    e.preventDefault();
    const origin = document.getElementById('t-origin').value;
    const dest = document.getElementById('t-dest').value;
    const mode = document.getElementById('t-mode').value;
    const trips = Number(document.getElementById('t-trips').value) || 1;
    const round = document.getElementById('t-round').value;
    const months = Number(document.getElementById('t-months').value) || 6;
    const trip = computeTrip(origin, dest, mode, round);
    trip.origin = origin; trip.dest = dest; trip.mode = mode; trip.trips = trips; trip.months = months;
    legs.push(trip);
    updatePlan();
  });

  document.getElementById('t-clear').addEventListener('click', (e) => { e.preventDefault(); legs = []; updatePlan(); });

  // init
  calcFootprint();
  updatePlan();
  setInterval(updateCo2Simulation, 3000); // Start CO2 simulation
  fetchAqiData('jaipur'); // Fetch initial AQI data for Jaipur
  
  // Initialize the city input with default value
  if (aqiCityInputEl) {
    aqiCityInputEl.value = 'jaipur';
  }

});