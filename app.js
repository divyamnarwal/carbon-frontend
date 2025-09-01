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
  function setDarkTheme() {
    document.documentElement.classList.add('dark');
    iconMoon.classList.remove('hidden');
    iconSun.classList.add('hidden');
    localStorage.setItem('cn-theme', 'dark');
  }

  function setLightTheme() {
    document.documentElement.classList.remove('dark');
    iconSun.classList.remove('hidden');
    iconMoon.classList.add('hidden');
    localStorage.setItem('cn-theme', 'light');
  }

  function setTheme(dark) {
    if (dark) {
      setDarkTheme();
    } else {
      setLightTheme();
    }
  }
  const stored = localStorage.getItem('cn-theme') || (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
  setTheme(stored === 'dark');
  themeToggle.addEventListener('click', () => setTheme(!document.documentElement.classList.contains('dark')));

  // ---------- DYNAMIC DASHBOARD LOGIC ----------
  let AQI_TOKEN = "c1ebca30b3f4338ff326ce803a2174bbfe4d66c4";

  // Resolve token from URL (?token=...), then localStorage ('aqi-token').
  // This avoids leaking the token in the UI and works without a backend.
  async function fetchApiToken() {
    const params = new URLSearchParams(window.location.search);
    const urlToken = params.get('token');
    const stored = localStorage.getItem('aqi-token');
    AQI_TOKEN = urlToken || stored || "c1ebca30b3f4338ff326ce803a2174bbfe4d66c4";
    if (urlToken && urlToken !== stored) {
      localStorage.setItem('aqi-token', urlToken);
    }
    // Provide a tiny helper for manually setting the token via console
    // Usage: setAqiToken('your-token');
    window.setAqiToken = (t) => {
      if (typeof t === 'string' && t.trim()) {
        localStorage.setItem('aqi-token', t.trim());
        AQI_TOKEN = t.trim();
        const cityName = (aqiCityInputEl && aqiCityInputEl.value.trim()) || 'jaipur';
        fetchAqiData(cityName);
      }
    };
  }

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
  const aqiLoadingOverlay = document.getElementById('aqi-loading-overlay');
  
  let currentAqiData = null;

  // Popular cities for autocomplete
  const popularCities = [
    'Delhi', 'Mumbai', 'Bangalore', 'Kolkata', 'Chennai', 
    'Hyderabad', 'Pune', 'Jaipur', 'Lucknow', 'Ahmedabad',
    'Surat', 'Kanpur', 'Nagpur', 'Patna', 'Indore'
  ];

  // Create datalist for city suggestions
  const datalist = document.createElement('datalist');
  datalist.id = 'city-suggestions';
  popularCities.forEach(city => {
    const option = document.createElement('option');
    option.value = city;
    datalist.appendChild(option);
  });
  document.body.appendChild(datalist);
  aqiCityInputEl.setAttribute('list', 'city-suggestions');

  async function fetchAqiData(city) {
    if (!AQI_TOKEN) {
        // Graceful placeholder when token is missing; do NOT show any token.
        aqiCityEl.textContent = (city || '—').toString();
        aqiTimestampEl.textContent = 'API token missing';
        aqiDominantEl.textContent = '—';
        aqiValueContainerEl.textContent = '—';
        aqiValueContainerEl.className = 'w-28 h-28 rounded-full flex items-center justify-center text-white text-3xl font-bold bg-gray-400';
        console.warn('AQI token not set. Add ?token=YOUR_TOKEN to the URL or run setAqiToken("YOUR_TOKEN") in the console.');
        return;
    }
    
    try {
      // Show loading overlay
      if (aqiLoadingOverlay) aqiLoadingOverlay.classList.remove('hidden');
      
      aqiCityEl.textContent = "Loading...";
      const q = encodeURIComponent(city);
      
      // For demo purposes, use enhanced mock data with more pollutants
      if (window.location.protocol === 'file:' || window.USE_MOCK_DATA) {
        console.log('Using enhanced mock AQI data for demonstration purposes');
        
        // Generate more realistic AQI data based on city
        const cityFactors = {
          'delhi': { base: 150, variation: 50 },
          'mumbai': { base: 120, variation: 40 },
          'bangalore': { base: 80, variation: 30 },
          'kolkata': { base: 140, variation: 45 },
          'chennai': { base: 90, variation: 35 },
          'jaipur': { base: 100, variation: 40 },
          'default': { base: 85, variation: 25 }
        };
        
        const factor = cityFactors[city.toLowerCase()] || cityFactors.default;
        const aqi = Math.max(20, Math.min(300, factor.base + (Math.random() - 0.5) * factor.variation));
        
        const mockData = {
          status: 'ok',
          data: {
            aqi: Math.round(aqi),
            idx: Math.floor(Math.random() * 10000),
            city: { name: city || 'Demo City' },
            dominentpol: aqi > 150 ? 'pm25' : aqi > 100 ? 'pm10' : 'o3',
            time: { s: new Date().toISOString() },
            iaqi: {
              pm25: { v: Math.max(5, Math.round(aqi * 0.8 + (Math.random() - 0.5) * 20)) },
              pm10: { v: Math.max(10, Math.round(aqi * 0.6 + (Math.random() - 0.5) * 30)) },
              o3: { v: Math.max(5, Math.round(aqi * 0.4 + (Math.random() - 0.5) * 15)) },
              no2: { v: Math.max(5, Math.round(aqi * 0.3 + (Math.random() - 0.5) * 10)) },
              so2: { v: Math.max(2, Math.round(aqi * 0.2 + (Math.random() - 0.5) * 8)) },
              co: { v: Math.max(0.5, Number((aqi * 0.15 + (Math.random() - 0.5) * 2).toFixed(1))) },
              t: { v: Math.round(25 + (Math.random() - 0.5) * 10) },
              h: { v: Math.round(60 + (Math.random() - 0.5) * 20) },
              p: { v: Math.round(1013 + (Math.random() - 0.5) * 10) },
              w: { v: Math.round(5 + Math.random() * 10) },
              dew: { v: Math.round(20 + (Math.random() - 0.5) * 8) }
            }
          }
        };
        
        // Set a small delay to simulate network request
        await new Promise(resolve => setTimeout(resolve, 800));
        
        // Process mock data
        handleAqiResponse(mockData, city);
        
        // Set flag to use mock data for all future requests
        window.USE_MOCK_DATA = true;
        return;
      }
      
      // Real API request
      const response = await fetch(`https://api.waqi.info/feed/${q}/?token=${AQI_TOKEN}`);
      const data = await response.json();
      
      handleAqiResponse(data, city);
    } catch (error) {
      console.error('AQI Fetch Error:', error);
      // Hide loading overlay on error
      if (aqiLoadingOverlay) aqiLoadingOverlay.classList.add('hidden');
      
      // Build a comprehensive demo response with all pollutants
      const demo = {
        status: 'ok',
        data: {
          aqi: 85,
          idx: 0,
          city: { name: city || 'Demo City' },
          dominentpol: 'pm25',
          time: { s: new Date().toISOString() },
          iaqi: { 
            pm25: { v: 85 }, 
            pm10: { v: 65 }, 
            o3: { v: 45 }, 
            no2: { v: 25 }, 
            so2: { v: 15 }, 
            co: { v: 5.5 }, 
            t: { v: 28 }, 
            h: { v: 65 }, 
            p: { v: 1015 }, 
            w: { v: 8 }, 
            dew: { v: 22 }
          }
        }
      };
      // Populate the UI using the same handler for consistency
      handleAqiResponse(demo, city);
      // Mark mock mode so subsequent requests use demo data quickly
      window.USE_MOCK_DATA = true;
    } finally {
      // Always hide loading overlay
      if (aqiLoadingOverlay) aqiLoadingOverlay.classList.add('hidden');
    }
  }
  
  // Helper function to process API response
  function handleAqiResponse(data, city) {
    // Hide loading overlay
    if (aqiLoadingOverlay) aqiLoadingOverlay.classList.add('hidden');
    
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
      
      // Populate and show pollutant details automatically for better UX
      if (aqiCityInputEl) aqiCityInputEl.value = city;
      try {
        // build and reveal pollutant details
        showPollutantDetails();
        if (showPollutantsBtn) showPollutantsBtn.textContent = 'Hide';
      } catch (e) {
        // if something goes wrong, keep the details hidden but log
        console.warn('Failed to auto-show pollutant details', e);
        if (showPollutantsBtn) showPollutantsBtn.textContent = 'Details';
        pollutantDetailsEl.classList.add('hidden');
      }
    } else {
      aqiCityEl.textContent = city || 'Error';
      aqiTimestampEl.textContent = `Error: ${data.data || 'Invalid response'}`;
      console.error('AQI API Error:', data);
    }
  }
  
  // Build pollutant details HTML but do not toggle visibility. Called after fetch to populate grid.
  function buildPollutantDetails() {
    if (!pollutantDetailsEl) return;
    if (!currentAqiData) {
      pollutantDetailsEl.innerHTML = '<h4 class="text-sm font-medium mb-2 border-t dark:border-gray-700 pt-3">Pollutant Details</h4><div class="text-center col-span-2">No AQI data available</div>';
      return;
    }

    const iaqi = currentAqiData.iaqi || {};
    const pollutantNames = {
      pm25: 'PM<sub>2.5</sub>',
      pm10: 'PM<sub>10</sub>',
      o3: 'Ozone (O<sub>3</sub>)',
      no2: 'NO<sub>2</sub>',
      so2: 'SO<sub>2</sub>',
      co: 'CO',
      t: 'Temperature',
      h: 'Humidity (%)',
      p: 'Pressure (hPa)',
      w: 'Wind (m/s)',
      dew: 'Dew Point (°C)'
    };

    const items = [];
    items.push(`<div class="p-2 border rounded dark:border-gray-700 flex justify-between col-span-2 bg-green-50 dark:bg-gray-800"><span><strong>Overall AQI:</strong></span><span class="font-bold">${currentAqiData.aqi}</span></div>`);

    const pollutants = Object.entries(iaqi).map(([k, v]) => ({ k, v: v?.v })).sort((a, b) => (b.v || 0) - (a.v || 0));
    if (pollutants.length === 0) {
      items.push('<div class="p-2 col-span-2 text-center">No pollutant readings available</div>');
    } else {
      pollutants.forEach(p => {
        const name = pollutantNames[p.k] || p.k.toUpperCase();
        const val = (p.v === undefined || p.v === null) ? 'N/A' : Number(p.v).toFixed(3);
        items.push(`<div class="p-2 border rounded dark:border-gray-700 flex justify-between"><span>${name}:</span><span class="font-medium">${val}</span></div>`);
      });
    }

    if (currentAqiData.forecast && currentAqiData.forecast.daily) {
      const pm25f = currentAqiData.forecast.daily.pm25?.[0]?.avg || 'N/A';
      const pm10f = currentAqiData.forecast.daily.pm10?.[0]?.avg || 'N/A';
      const o3f = currentAqiData.forecast.daily.o3?.[0]?.avg || 'N/A';
      items.push(`<div class="p-2 border rounded dark:border-gray-700 col-span-2 mt-2"><div class="text-xs text-gray-500 mb-1">Tomorrow's Forecast:</div><div class="text-sm">PM2.5: ${pm25f} | PM10: ${pm10f} | O3: ${o3f}</div></div>`);
    }

    pollutantDetailsEl.innerHTML = `
      <h4 class="text-sm font-medium mb-2 border-t dark:border-gray-700 pt-3">Pollutant Details</h4>
      <div id="pollutant-grid" class="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
        ${items.join('\n')}
      </div>
    `;
  }

  // Show pollutant details (toggle will call this). Keeps logic separate.
  function showPollutantDetails() {
    buildPollutantDetails();
    pollutantDetailsEl.classList.remove('hidden');
  }
  
  // Add real-time update functionality
  let autoRefreshInterval = null;
  const startAutoRefresh = () => {
    if (autoRefreshInterval) clearInterval(autoRefreshInterval);
    autoRefreshInterval = setInterval(() => {
      const currentCity = aqiCityInputEl.value.trim() || 'jaipur';
      fetchAqiData(currentCity);
    }, 300000); // Refresh every 5 minutes
  };

  const stopAutoRefresh = () => {
    if (autoRefreshInterval) {
      clearInterval(autoRefreshInterval);
      autoRefreshInterval = null;
    }
  };

  // Add auto-refresh toggle button
  const refreshBtn = document.createElement('button');
  refreshBtn.id = 'auto-refresh-toggle';
  refreshBtn.className = 'ml-2 px-2 py-1 text-xs bg-blue-500 text-white rounded hover:bg-blue-600';
  refreshBtn.textContent = 'Auto Refresh: OFF';
  refreshBtn.onclick = () => {
    if (autoRefreshInterval) {
      stopAutoRefresh();
      refreshBtn.textContent = 'Auto Refresh: OFF';
      refreshBtn.className = 'ml-2 px-2 py-1 text-xs bg-gray-500 text-white rounded hover:bg-gray-600';
    } else {
      startAutoRefresh();
      refreshBtn.textContent = 'Auto Refresh: ON';
      refreshBtn.className = 'ml-2 px-2 py-1 text-xs bg-green-500 text-white rounded hover:bg-green-600';
    }
  };

  // Insert the auto-refresh button after the search button
  if (aqiSearchBtn && aqiSearchBtn.parentNode) {
    aqiSearchBtn.parentNode.insertBefore(refreshBtn, aqiSearchBtn.nextSibling);
  }
  
  if (aqiCityInputEl) {
    aqiCityInputEl.addEventListener('keypress', (event) => {
      if (event.key === 'Enter') {
        event.preventDefault();
        const cityName = aqiCityInputEl.value.trim();
        console.log('Enter key pressed, city:', cityName);
        if (cityName) {
          fetchAqiData(cityName);
        }
      }
    });
  }
  
  if (showPollutantsBtn) {
    showPollutantsBtn.addEventListener('click', () => {
      // Rebuild details on each click to ensure latest data is shown
      const isHidden = pollutantDetailsEl.classList.contains('hidden');
      if (isHidden) {
        buildPollutantDetails();
        pollutantDetailsEl.classList.remove('hidden');
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

  function getRoundTripMultiplier(round) {
    return round === 'round' ? 2 : 1;
  }

  function computeTrip(origin, dest, mode, round) {
    const a = CITY_COORDS[origin], b = CITY_COORDS[dest];
    const km = Math.round(haversine(a, b));
    const multiplier = getRoundTripMultiplier(round);
    let kg = 0;
    if (mode === 'flight') {
      const type = km < 1500 ? 'short' : 'long';
      const ef = EF['flight_' + type];
      kg = km * ef * multiplier;
    } else if (mode === 'train') {
      kg = km * EF.train * multiplier;
    } else if (mode === 'bus') {
      kg = km * EF.bus * multiplier;
    } else if (mode === 'car') {
      kg = km * EF.car_petrol * multiplier;
    }
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

  // Fetch API token first, then fetch AQI data
  fetchApiToken().then(() => {
    fetchAqiData('jaipur'); // Fetch initial AQI data for Jaipur
  });
  
  // Initialize the city input with default value
  if (aqiCityInputEl) {
    aqiCityInputEl.value = 'jaipur';
  }

});