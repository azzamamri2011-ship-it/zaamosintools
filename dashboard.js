// ---- CURSOR ----
    const cursor = document.getElementById('cursor');
    const trail = document.getElementById('cursorTrail');
    document.addEventListener('mousemove', e => {
      cursor.style.left = (e.clientX - 4.5) + 'px';
      cursor.style.top = (e.clientY - 4.5) + 'px';
      setTimeout(() => {
        trail.style.left = (e.clientX - 15) + 'px';
        trail.style.top = (e.clientY - 15) + 'px';
      }, 60);
    });
    document.querySelectorAll('a,button,input').forEach(el => {
      el.addEventListener('mouseenter', () => { cursor.style.transform = 'scale(2)'; trail.style.transform = 'scale(1.4)'; });
      el.addEventListener('mouseleave', () => { cursor.style.transform = 'scale(1)'; trail.style.transform = 'scale(1)'; });
    });

    // ---- SIDEBAR MOBILE ----
    function toggleSidebar() {
      document.getElementById('sidebar').classList.toggle('open');
      document.getElementById('sidebarOverlay').classList.toggle('open');
    }

    // ---- TOOL SWITCH ----
    function switchTool(tool) {
      const titles = { nik: ['NIK Parser', 'Ekstrak informasi lengkap dari NIK Indonesia'], ip: ['IP Tracker', 'Lacak lokasi dan informasi jaringan dari IP/domain'] };
      document.getElementById('topbar-title').textContent = titles[tool][0];
      document.getElementById('topbar-sub').textContent = titles[tool][1];
      ['nik', 'ip'].forEach(t => {
        document.getElementById(`panel-${t}`).classList.toggle('active', t === tool);
        document.getElementById(`tab-${t}`).classList.toggle('active', t === tool);
        document.getElementById(`nav-${t}`).classList.toggle('active', t === tool);
      });
      document.getElementById('history-section').style.display = 'none';
      document.getElementById('nav-history').classList.remove('active');
      if (window.innerWidth < 900) toggleSidebar();
    }

    function showHistory() {
      document.getElementById('history-section').style.display = 'block';
      document.getElementById('nav-history').classList.add('active');
      ['nik', 'ip'].forEach(t => {
        document.getElementById(`panel-${t}`).classList.remove('active');
        document.getElementById(`tab-${t}`).classList.remove('active');
        document.getElementById(`nav-${t}`).classList.remove('active');
      });
      renderHistory();
      if (window.innerWidth < 900) toggleSidebar();
    }

    // ---- HISTORY ----
    function getHistory() { try { return JSON.parse(localStorage.getItem('zaamtools_history') || '[]'); } catch { return []; } }
    function addHistory(type, query) {
      let h = getHistory();
      h = h.filter(x => !(x.type === type && x.query === query));
      h.unshift({ type, query, time: Date.now() });
      if (h.length > 20) h = h.slice(0, 20);
      localStorage.setItem('zaamtools_history', JSON.stringify(h));
      updateHistoryCount();
    }
    function clearHistory() { localStorage.removeItem('zaamtools_history'); renderHistory(); updateHistoryCount(); }
    function updateHistoryCount() {
      const c = getHistory().length;
      document.getElementById('history-count').textContent = c;
    }
    function renderHistory() {
      const h = getHistory();
      const list = document.getElementById('history-list');
      if (!h.length) { list.innerHTML = '<span style="font-size:0.8rem;color:var(--text-muted);">Belum ada riwayat pencarian.</span>'; return; }
      list.innerHTML = h.map(x => `
        <span class="history-chip" onclick="runFromHistory('${x.type}','${x.query}')">
          <i class="fas fa-${x.type === 'nik' ? 'id-card' : 'globe'}"></i>
          ${x.query}
        </span>
      `).join('');
    }
    function runFromHistory(type, query) {
      switchTool(type);
      if (type === 'nik') { document.getElementById('nik-input').value = query; searchNIK(); }
      else { document.getElementById('ip-input').value = query; searchIP(); }
    }
    updateHistoryCount();

    // ---- HELPERS ----
    function setLoading(btnId, loading) {
      const btn = document.getElementById(btnId);
      btn.classList.toggle('loading', loading);
      btn.disabled = loading;
    }

    function showResult(areaId, html) {
      const area = document.getElementById(areaId);
      area.innerHTML = html;
      area.classList.add('show');
    }

    function cachedBadge(data) {
      return data && data._cached
        ? '<span class="cached-badge"><i class="fas fa-bolt"></i> Cache</span>'
        : '';
    }

    function highlightJSON(json) {
      const str = JSON.stringify(json, null, 2);
      return str
        .replace(/("(\\u[a-zA-Z0-9]{4}|\\[^u]|[^\\"])*"(?:\s*:)?|\b(true|false|null)\b|-?\d+(?:\.\d*)?(?:[eE][+\-]?\d+)?)/g, match => {
          if (/^"/.test(match)) {
            if (/:$/.test(match)) return `<span class="json-key">${match}</span>`;
            return `<span class="json-string">${match}</span>`;
          }
          if (/true|false/.test(match)) return `<span class="json-bool">${match}</span>`;
          if (/null/.test(match)) return `<span class="json-null">${match}</span>`;
          return `<span class="json-number">${match}</span>`;
        });
    }

    function getFlagEmoji(countryCode) {
      if (!countryCode || countryCode.length !== 2) return '🌐';
      return countryCode.toUpperCase().split('').map(c => String.fromCodePoint(0x1F1E6 - 65 + c.charCodeAt(0))).join('');
    }

    // ---- NIK SEARCH ----
    async function searchNIK() {
      const nik = document.getElementById('nik-input').value.trim();
      if (!nik) return showResult('nik-result', errorHTML('Input Kosong', 'Masukkan NIK 16 digit terlebih dahulu.'));
      if (nik.length !== 16) return showResult('nik-result', errorHTML('NIK Tidak Valid', `NIK harus 16 digit. Kamu memasukkan ${nik.length} digit.`));

      setLoading('nik-btn', true);
      document.getElementById('nik-result').classList.remove('show');

      try {
        const res = await fetch(`api.php?action=nik&nik=${encodeURIComponent(nik)}`);
        const data = await res.json();

        if (!data.status || !data.result) throw new Error(data.message || 'Data tidak ditemukan atau NIK tidak valid.');

        const r = data.result;
        addHistory('nik', nik);

        const html = `
          <div class="nik-result-grid fade-up">

            <div class="result-card span-3 accent-purple">
              <div style="display:flex;align-items:center;gap:14px;flex-wrap:wrap;">
                <div>
                  <div class="result-card-label">NIK</div>
                  <div style="font-family:'DM Mono',monospace;font-size:1.1rem;color:var(--accent);letter-spacing:1px;">${r.nik}</div>
                </div>
                <div style="margin-left:auto;display:flex;gap:8px;flex-wrap:wrap;">
                  <span style="background:rgba(124,111,255,0.1);border:1px solid rgba(124,111,255,0.2);padding:5px 12px;border-radius:100px;font-size:0.75rem;color:var(--accent);">
                    <i class="fas fa-check-circle"></i> Valid
                  </span>
                  <span style="background:rgba(79,195,247,0.1);border:1px solid rgba(79,195,247,0.2);padding:5px 12px;border-radius:100px;font-size:0.75rem;color:var(--accent2);">
                    ${r.tambahan?.kategori_usia || '—'}
                  </span>
                </div>
              </div>
            </div>

            <div class="result-card accent-cyan">
              <div class="result-card-icon cyan"><i class="fas fa-venus-mars"></i></div>
              <div class="result-card-label">Jenis Kelamin</div>
              <div class="result-card-value">${r.kelamin}</div>
            </div>

            <div class="result-card accent-pink">
              <div class="result-card-icon pink"><i class="fas fa-cake-candles"></i></div>
              <div class="result-card-label">Tanggal Lahir</div>
              <div class="result-card-value">${r.lahir_lengkap || r.lahir}</div>
              <div class="result-card-sub">${r.tambahan?.usia || '—'}</div>
            </div>

            <div class="result-card accent-green">
              <div class="result-card-icon green"><i class="fas fa-star"></i></div>
              <div class="result-card-label">Zodiak</div>
              <div class="result-card-value">${r.tambahan?.zodiak || '—'}</div>
              <div class="result-card-sub">${r.tambahan?.pasaran || '—'}</div>
            </div>

            <div class="result-card span-2 accent-purple">
              <div class="result-card-icon purple"><i class="fas fa-map"></i></div>
              <div class="result-card-label">Wilayah</div>
              <div class="result-card-value">${r.provinsi?.nama || '—'}</div>
              <div class="result-card-sub">${r.kotakab?.jenis || ''} ${r.kotakab?.nama || ''} &nbsp;·&nbsp; Kec. ${r.kecamatan?.nama || '—'}</div>
            </div>

            <div class="result-card">
              <div class="result-card-icon orange"><i class="fas fa-gift"></i></div>
              <div class="result-card-label">Ulang Tahun</div>
              <div class="result-card-value" style="font-size:0.9rem;">${r.tambahan?.ultah || '—'}</div>
              <div class="result-card-sub">lagi</div>
            </div>

            <div class="result-card span-2">
              <div class="result-card-icon purple"><i class="fas fa-code-branch"></i></div>
              <div class="result-card-label">Kode Wilayah</div>
              <div class="result-card-value" style="font-family:'DM Mono',monospace;font-size:0.9rem;">${r.kode_wilayah || '—'}</div>
              <div class="result-card-sub">Nomor urut: ${r.nomor_urut || '—'}</div>
            </div>

            <div class="result-card">
              <div class="result-card-icon cyan"><i class="fas fa-hashtag"></i></div>
              <div class="result-card-label">Kode Provinsi</div>
              <div class="result-card-value">${r.provinsi?.kode || '—'}</div>
              <div class="result-card-sub">Kode Kota: ${r.kotakab?.kode || '—'}</div>
            </div>

          </div>

          <div class="raw-section">
            <button class="raw-toggle" onclick="toggleRaw('nik-raw')">
              <i class="fas fa-code"></i> Lihat Raw JSON
            </button>
            <pre class="raw-json" id="nik-raw">${highlightJSON(data)}</pre>
          </div>

          <div class="response-meta">
            <div class="meta-item"><i class="fas fa-clock"></i> Response time: <span class="meta-val">${data.response_time || '—'}</span></div>
            <div class="meta-item"><i class="fas fa-circle-check"></i> Status: <span class="meta-val" style="color:var(--success)">Berhasil</span></div>
            <div class="meta-item"><i class="fas fa-user"></i> <span class="meta-val">${data.author || '—'}</span></div>
          </div>
        `;
        showResult('nik-result', html);

      } catch (e) {
        showResult('nik-result', errorHTML('Gagal Mengambil Data', e.message || 'Terjadi kesalahan. Coba lagi.'));
      } finally {
        setLoading('nik-btn', false);
      }
    }

    // ---- IP SEARCH ----
    let ipMap = null;

    async function searchIP() {
      const target = document.getElementById('ip-input').value.trim();
      if (!target) return showResult('ip-result', errorHTML('Input Kosong', 'Masukkan IP address atau domain terlebih dahulu.'));

      setLoading('ip-btn', true);
      document.getElementById('ip-result').classList.remove('show');

      if (ipMap) { ipMap.remove(); ipMap = null; }

      try {
        const res = await fetch(`api.php?action=ip&target=${encodeURIComponent(target)}`);
        const data = await res.json();

        if (!data.status || !data.result) throw new Error(data.message || 'Target tidak ditemukan atau tidak valid.');

        const r = data.result;
        addHistory('ip', target);

        const flag = getFlagEmoji(r.country_code);
        const lat = parseFloat(r.latitude);
        const lon = parseFloat(r.longitude);

        const html = `
          <div class="ip-result-layout fade-up">

            <div>
              <div class="ip-header-card">
                <div class="ip-flag">${flag}</div>
                <div>
                  <div class="ip-addr">${r.ip}</div>
                  <div class="ip-location">${r.city}, ${r.region_name}, ${r.country}</div>
                </div>
              </div>

              <div class="ip-info-grid">

                <div class="result-card accent-cyan">
                  <div class="result-card-icon cyan"><i class="fas fa-earth-asia"></i></div>
                  <div class="result-card-label">Negara</div>
                  <div class="result-card-value">${r.country}</div>
                  <div class="result-card-sub">${r.country_code}</div>
                </div>

                <div class="result-card accent-purple">
                  <div class="result-card-icon purple"><i class="fas fa-map-pin"></i></div>
                  <div class="result-card-label">Kota / Wilayah</div>
                  <div class="result-card-value">${r.city}</div>
                  <div class="result-card-sub">${r.region_name} (${r.region})</div>
                </div>

                <div class="result-card span-2 accent-pink">
                  <div class="result-card-icon pink"><i class="fas fa-building"></i></div>
                  <div class="result-card-label">ISP / Organisasi</div>
                  <div class="result-card-value" style="font-size:0.9rem;">${r.isp}</div>
                  <div class="result-card-sub">${r.org}</div>
                </div>

                <div class="result-card accent-green">
                  <div class="result-card-icon green"><i class="fas fa-clock"></i></div>
                  <div class="result-card-label">Timezone</div>
                  <div class="result-card-value" style="font-size:0.9rem;">${r.timezone}</div>
                  <div class="result-card-sub">ZIP: ${r.zip || '—'}</div>
                </div>

                <div class="result-card">
                  <div class="result-card-icon cyan"><i class="fas fa-server"></i></div>
                  <div class="result-card-label">AS Number</div>
                  <div class="result-card-value" style="font-size:0.82rem;font-family:'DM Mono',monospace;">${r.as || '—'}</div>
                </div>

                <div class="result-card span-2" style="display:flex;align-items:center;gap:12px;flex-wrap:wrap;">
                  <div>
                    <div class="result-card-label">Koordinat</div>
                    <div style="display:flex;gap:8px;margin-top:8px;flex-wrap:wrap;">
                      <div class="coord-badge"><i class="fas fa-arrows-up-down"></i> ${lat.toFixed(5)}</div>
                      <div class="coord-badge"><i class="fas fa-arrows-left-right"></i> ${lon.toFixed(5)}</div>
                    </div>
                  </div>
                </div>

              </div>
            </div>

            <div class="ip-map-wrap" id="ip-map-container">
              <div id="ipMap"></div>
            </div>

          </div>

          <div class="raw-section">
            <button class="raw-toggle" onclick="toggleRaw('ip-raw')">
              <i class="fas fa-code"></i> Lihat Raw JSON
            </button>
            <pre class="raw-json" id="ip-raw">${highlightJSON(data)}</pre>
          </div>

          <div class="response-meta">
            <div class="meta-item"><i class="fas fa-clock"></i> Response time: <span class="meta-val">${data.response_time || '—'}</span></div>
            <div class="meta-item"><i class="fas fa-circle-check"></i> Status: <span class="meta-val" style="color:var(--success)">Berhasil</span></div>
            <div class="meta-item"><i class="fas fa-user"></i> <span class="meta-val">${data.author || '—'}</span></div>
          </div>
        `;

        showResult('ip-result', html);

        // Init map
        setTimeout(() => {
          if (!isNaN(lat) && !isNaN(lon)) {
            ipMap = L.map('ipMap', { zoomControl: true, scrollWheelZoom: true }).setView([lat, lon], 10);
            L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
              attribution: '© OSM',
              maxZoom: 18,
            }).addTo(ipMap);

            const icon = L.divIcon({
              html: `<div style="width:14px;height:14px;background:var(--accent);border-radius:50%;border:3px solid rgba(124,111,255,0.3);box-shadow:0 0 12px rgba(124,111,255,0.6);"></div>`,
              className: '',
              iconSize: [14, 14],
              iconAnchor: [7, 7],
            });

            L.marker([lat, lon], { icon }).addTo(ipMap)
              .bindPopup(`<b>${r.city}, ${r.country}</b><br>${r.isp}<br><small>${lat}, ${lon}</small>`)
              .openPopup();
          }
        }, 200);

      } catch (e) {
        showResult('ip-result', errorHTML('Gagal Melacak Target', e.message || 'Terjadi kesalahan. Coba lagi.'));
      } finally {
        setLoading('ip-btn', false);
      }
    }

    // ---- HELPERS ----
    function errorHTML(title, msg) {
      return `
        <div class="error-state">
          <i class="fas fa-circle-exclamation"></i>
          <div>
            <div class="error-title">${title}</div>
            <div class="error-msg">${msg}</div>
          </div>
        </div>
      `;
    }

    function toggleRaw(id) {
      const el = document.getElementById(id);
      el.classList.toggle('visible');
      const btn = el.previousElementSibling;
      btn.innerHTML = el.classList.contains('visible')
        ? '<i class="fas fa-eye-slash"></i> Sembunyikan JSON'
        : '<i class="fas fa-code"></i> Lihat Raw JSON';
    }
