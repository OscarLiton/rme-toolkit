/* ==========================================================================
   RME TOOLKIT - ENGINE & STATE CONTROLLER (V3 - REALTIME SPREADSHEETS SYNC)
   ========================================================================== */

document.addEventListener("DOMContentLoaded", async () => {
    const transition = document.getElementById("transition");
    if (transition) {
        setTimeout(() => transition.classList.add("fade-out"), 50);
    }
    
    // Disparamos la carga paralela de bases de datos
    Promise.all([
        loadCadenas(),
        loadRecetas(),
        loadCBMData(),
        loadAsistenteSoldaduraData()
    ]).catch(err => console.error("Error en sincronización principal:", err));
});

document.addEventListener("click", (e) => {
    const link = e.target.closest("a");
    if (link && link.href && !link.href.includes("#") && link.origin === location.origin) {
        e.preventDefault();
        const transition = document.getElementById("transition");
        if (transition) {
            transition.classList.remove("fade-out");
            setTimeout(() => { window.location.href = link.href; }, 350);
        } else {
            window.location.href = link.href;
        }
    }
});

function toggleDrawer() {
    const wrapper = document.querySelector('.layout-main');
    if (wrapper) wrapper.classList.toggle('drawer-open');
}

function animateValue(id, start, end, duration, decimal = false) {
    const obj = document.getElementById(id);
    if (!obj) return;
    let startTimestamp = null;
    const step = (timestamp) => {
        if (!startTimestamp) startTimestamp = timestamp;
        const progress = Math.min((timestamp - startTimestamp) / duration, 1);
        const current = start + progress * (end - start);
        obj.textContent = decimal ? current.toFixed(2) : Math.floor(current);
        if (progress < 1) {
            window.requestAnimationFrame(step);
        }
    };
    window.requestAnimationFrame(step);
}

// === CONSTANTES DE CONEXIÓN CON GOOGLE SHEETS ===
const GS_CADENAS = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vSxP6CvEd7nJjKETcJbZADsqNhwcp9lroWUQ1OyLfCFqQfq0h25YJOkRqMWbRm0x_MYjU288JV2c4X3/pub?gid=0&single=true&output=csv';
const GS_RECETAS = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vSxP6CvEd7nJjKETcJbZADsqNhwcp9lroWUQ1OyLfCFqQfq0h25YJOkRqMWbRm0x_MYjU288JV2c4X3/pub?gid=1759976857&single=true&output=csv';
const GS_ASISTENTE_SOLDADURA = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vSxP6CvEd7nJjKETcJbZADsqNhwcp9lroWUQ1OyLfCFqQfq0h25YJOkRqMWbRm0x_MYjU288JV2c4X3/pub?gid=71524182&single=true&output=csv';
const GS_CBM = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vSxP6CvEd7nJjKETcJbZADsqNhwcp9lroWUQ1OyLfCFqQfq0h25YJOkRqMWbRm0x_MYjU288JV2c4X3/pub?gid=1496090841&single=true&output=csv';

function parseCSV(text) {
    const lines = text.trim().split(/\r?\n/);
    if (lines.length < 2) return [];
    const headers = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g,''));
    return lines.slice(1).map(line => {
        const cols = []; let cur = '', inQ = false;
        for (let i = 0; i < line.length; i++) {
            const ch = line[i];
            if (ch === '"') inQ = !inQ;
            else if (ch === ',' && !inQ) { cols.push(cur.trim()); cur = ''; }
            else cur += ch;
        }
        cols.push(cur.trim());
        const obj = {};
        headers.forEach((h, i) => { obj[h] = (cols[i] || '').replace(/^"|"$/g, '').trim(); });
        return obj;
    });
}

/* ── PREDICTIVO CBM MODULE CONTROLLER ── */
let cbmList = [];

async function loadCBMData() {
    const grid = document.getElementById('cbmGrid');
    if (!grid) return; 
    try {
        const res = await fetch(GS_CBM);
        const text = await res.text();
        cbmList = parseCSV(text);
        renderCBM(cbmList);
    } catch (e) {
        grid.innerHTML = `<div class="t-caption" style="grid-column:1/-1; padding:24px; text-align:center;">Error sincronizando CBM con Google Sheets</div>`;
    }
}

function renderCBM(data) {
    const grid = document.getElementById('cbmGrid');
    if (!grid) return;
    grid.innerHTML = '';
    
    if(data.length === 0) {
        grid.innerHTML = '<div class="t-caption" style="grid-column: 1/-1; padding: 40px; text-align: center;">No se han encontrado nomenclaturas con esa búsqueda.</div>';
        return;
    }

    grid.innerHTML = data.map(r => `
        <div class="cbm-card">
            <div class="cbm-header">
                <span class="cbm-new">${r.codigo_nuevo || 'N/A'}</span>
                <span class="cbm-old">Antiguo: ${r.codigo_antiguo || 'N/A'}</span>
            </div>
            <div class="cbm-desc">${r.descripcion || 'Sin descripción'}</div>
        </div>
    `).join('');
}

window.filterCBM = () => {
    const query = document.getElementById('searchInput')?.value.toLowerCase() || '';
    const filtered = cbmList.filter(item => 
        (item.codigo_nuevo || '').toLowerCase().includes(query) || 
        (item.codigo_antiguo || '').toLowerCase().includes(query) || 
        (item.descripcion || '').toLowerCase().includes(query)
    );
    renderCBM(filtered);
};

/* ── CADENAS MODULE CONTROLLER ── */
let chains = [];
let selectedChain = null;

async function loadCadenas() {
    const listEl = document.getElementById('chainListLeft');
    if (!listEl) return;
    try {
        const res = await fetch(GS_CADENAS);
        const text = await res.text();
        chains = parseCSV(text);
        listEl.innerHTML = chains.map((c, i) => `
            <div class="compact-row" onclick="selectChain(${i})">
                <div class="color-dot" style="--dot-color: var(--accent-cadenas)"></div>
                <div style="flex:1" class="t-heading">${c.nombre || 'Cadena'}</div>
                <div class="t-caption" style="font-size:11px;">${c.referencia || ''}</div>
            </div>
        `).join('');
    } catch (e) {
        listEl.innerHTML = `<div style="padding:16px;" class="t-caption">Error Syncing Sheets</div>`;
    }
}

function selectChain(index) {
    selectedChain = chains[index];
    document.querySelectorAll('.compact-row').forEach((r, i) => {
        r.classList.toggle('active', i === index);
        if(i === index) r.style.setProperty('--band-color', 'var(--accent-cadenas)');
    });
    
    const infoPanel = document.getElementById('chainParamsPanel');
    if (infoPanel) {
        infoPanel.style.display = 'block';
        infoPanel.style.animation = 'none';
        infoPanel.offsetHeight; 
        infoPanel.style.animation = 'cardEntry 0.3s cubic-bezier(0.16, 1, 0.3, 1)';
        
        document.getElementById('cp-nombre').textContent = selectedChain.nombre || 'Cadena';
        document.getElementById('cp-ref').textContent = selectedChain.referencia || 'Sin referencia';
        document.getElementById('cp-nom').textContent = `${parseFloat(selectedChain.nominal_mm || 0).toFixed(1)} mm`;
        document.getElementById('cp-warn').textContent = `${parseFloat(selectedChain.aviso_pct || 0).toFixed(1)} %`;
        document.getElementById('cp-crit').textContent = `${parseFloat(selectedChain.critico_pct || 0).toFixed(1)} %`;
    }

    const input = document.getElementById('measureInput');
    if (input && input.value) {
        calculateChain(parseFloat(input.value));
    } else {
        calculateChain(NaN);
    }

    if (window.innerWidth <= 900) { toggleDrawer(); }
}

function calculateChain(val) {
    const rc = document.getElementById('resultCard');
    if (!rc) return;
    
    const nominal = selectedChain ? (parseFloat(selectedChain.nominal_mm) || 381.2) : 0;
    const warnPct = selectedChain ? (parseFloat(selectedChain.aviso_pct) || 1.0) : 0;
    const critPct = selectedChain ? (parseFloat(selectedChain.critico_pct) || 1.5) : 0;

    if (!selectedChain || isNaN(val) || val <= 0) {
        rc.className = "result-block state-empty";
        document.getElementById('resultPct').textContent = "--";
        document.getElementById('statusTxt').textContent = selectedChain ? "Introduce la medición de 10 eslabones" : "Introduce los datos";
        
        if (selectedChain) {
            document.getElementById('statNominal').textContent = `${nominal.toFixed(1)} mm`;
            document.getElementById('statLimit').textContent = `${critPct.toFixed(2)}%`;
            document.getElementById('statDiff').textContent = `-- mm`;
        }
        return;
    }

    rc.className = "result-block state-loading";
    setTimeout(() => {
        const diff = val - nominal;
        const pct = (diff / nominal) * 100;

        let state = 'state-ok';
        let msg = 'Estado Óptimo';
        if (pct >= critPct) { state = 'state-crit'; msg = 'SUSTITUIR YA'; }
        else if (pct >= warnPct) { state = 'state-warn'; msg = 'Alerta: Elongación Intermedia'; }

        rc.className = `result-block ${state}`;
        document.getElementById('statusTxt').textContent = msg;
        document.getElementById('statNominal').textContent = `${nominal.toFixed(1)} mm`;
        document.getElementById('statDiff').textContent = `${diff >= 0 ? '+' : ''}${diff.toFixed(2)} mm`;
        document.getElementById('statLimit').textContent = `${critPct.toFixed(2)}%`;
        
        animateValue('resultPct', 0, pct, 200, true);
    }, 300);
}

/* ── CORREAS MODULE CONTROLLER ── */
window.calcTension = () => {
    const rc = document.getElementById('resultCard');
    if(!rc) return;
    
    const pNominal = parseFloat(document.getElementById('t-p')?.value);
    const cargaPct = parseFloat(document.getElementById('t-carga')?.value) || 100;
    const p = pNominal * (cargaPct / 100);
    const rpm = parseFloat(document.getElementById('t-rpm')?.value);
    const z1 = parseFloat(document.getElementById('t-z1')?.value);
    const z2 = parseFloat(document.getElementById('t-z2')?.value);
    const lon = parseFloat(document.getElementById('t-lon')?.value);
    const ancho = parseFloat(document.getElementById('t-ancho')?.value);
    const perf = document.getElementById('t-perfil')?.value;

    if (!pNominal || !rpm || !z1 || !z2 || !lon || !ancho || !perf) {
        rc.className = "result-block state-empty";
        document.getElementById('hzMain').textContent = "--";
        
        document.getElementById('r1-u').textContent = '--';
        document.getElementById('r1-n').textContent = '--';
        document.getElementById('r2-u').textContent = '--';
        document.getElementById('r2-n').textContent = '--';
        
        document.getElementById('statusTxt').textContent = "Introduce los datos";
        return;
    }

    rc.className = "result-block state-loading";
    setTimeout(() => {
        const perfiles = { '3M':{paso:3,peso:.0024}, '5M':{paso:5,peso:.0038}, '8M':{paso:8,peso:.006}, '14M':{paso:14,peso:.010}, 'T5':{paso:5,peso:.0022}, 'T10':{paso:10,peso:.0045} };
        const {paso, peso} = perfiles[perf];
        const d1 = (z1*paso)/Math.PI;
        const d2 = (z2*paso)/Math.PI;
        const v = (z1*paso*rpm)/(60*1000); 
        const tmp = lon - (Math.PI/2)*(d1+d2);
        const rad = Math.pow(tmp,2) - 2*Math.pow(d1-d2,2);

        if (rad < 0) {
            rc.className = "result-block state-crit";
            document.getElementById('statusTxt').textContent = "ERROR CONFIGURACIÓN";
            return;
        }

        const C = 0.25*(tmp+Math.sqrt(rad)); 
        const Ls = Math.sqrt(Math.pow(C,2)-Math.pow((d1-d2)/2,2))/1000; 
        const m = ancho*peso;
        
        const Te1 = (p*1.0*1000)/v;
        const hzIdeal = Math.sqrt((Te1*.75)/(4*m*Math.pow(Ls,2)));

        const torque = (pNominal * 9550) / rpm;

        rc.className = "result-block state-ok";
        document.getElementById('statusTxt').textContent = `Frecuencias e Ingeniería Calculadas`;
        
        const calcHz = (factor, cond) => Math.sqrt(((p*factor*1000)/v)*cond/(4*m*Math.pow(Ls,2))).toFixed(1);
        
        document.getElementById('r1-u').textContent = `${calcHz(1.0, 0.7)} Hz`;
        document.getElementById('r1-n').textContent = `${calcHz(1.0, 0.85)} Hz`;
        document.getElementById('r2-u').textContent = `${calcHz(1.5, 0.7)} Hz`;
        document.getElementById('r2-n').textContent = `${calcHz(1.5, 0.85)} Hz`;

        const statusPanel = document.getElementById('statusTxt');
        if (statusPanel) {
            statusPanel.innerHTML = `Frecuencias Calculadas <br>
            <span style="font-size:11px; font-family:var(--font-mono); color:var(--text-muted);">
                Ejes (C): <strong>${C.toFixed(1)} mm</strong> | Par Motor: <strong>${torque.toFixed(2)} Nm</strong>
            </span>`;
        }

        animateValue('hzMain', 0, hzIdeal, 200, false);
    }, 300);
};

window.resetCorreas = () => {
    ['t-p','t-rpm','t-z1','t-z2','t-perfil','t-lon','t-ancho'].forEach(id => {
        const el = document.getElementById(id);
        if(el) el.value = '';
    });
    const carga = document.getElementById('t-carga');
    if(carga) carga.value = '100';
    window.calcTension();
};

/* ── RECETAS MODULE CONTROLLER ── */
let recetas = [];
let currentFilteredRecetas = []; 

async function loadRecetas() {
    const listEl = document.getElementById('recipeListLeft');
    if (!listEl) return;
    try {
        const res = await fetch(GS_RECETAS);
        const text = await res.text();
        const rows = parseCSV(text);
        
        recetas = rows.map((row, index) => {
            const apnStr  = row['apns']  || '';
            const binStr  = row['bins']  || '';
            return {
                id:                 'rec_' + index,
                banda:              row['banda']              || '',
                alias:              row['alias']              || row['banda'] || '',
                aporte:             (row['aporte']||'NO').toUpperCase(),
                presion:            row['presion']            || '',
                tiempo:             row['tiempo']             || '',
                temp_arr:           row['temp_arr']           || '',
                temp_abj:           row['temp_abj']           || '',
                temp_cool:          row['temp_cool']          || '',
                perdida_troquel:    row['perdida_troquel']    || '',
                pre_calentamiento:  (row['pre_calentamiento']||'NO').toUpperCase(),
                temp_pre:           row['temp_pre']           || '',
                tiempo_pre:         row['tiempo_pre']         || '',
                montaje:            row['montaje']            || '',
                parts_raw:          row['parts_raw']          || 'NO APLICA',
                bin_aporte_raw:     row['bin_aporte_raw']     || 'NO APLICA',
                apns:               apnStr  ? apnStr.split('|').map(s=>s.trim())  : ['—'],
                bins:               binStr  ? binStr.split('|').map(s=>s.trim())  : ['—'],
                comentarios:        row['comentarios']        || '',
                color:              row['color']              || 'var(--amz)'
            };
        }).filter(r => r.banda);

        currentFilteredRecetas = recetas;
        initSelectRecetas();
        mostrarResultados(currentFilteredRecetas);
    } catch (e) {
        listEl.innerHTML = `<div style="padding:16px;" class="t-caption">Error Syncing Recipes</div>`;
    }
}

function initSelectRecetas() {
    const sel = document.getElementById('sel-banda');
    if(!sel) return;
    const uniqueBands = [...new Set(recetas.map(r => r.banda))];
    uniqueBands.forEach(b => {
        const opt = document.createElement('option');
        opt.value = b; opt.textContent = b;
        sel.appendChild(opt);
    });
}

window.resetCampos = () => {
    document.getElementById('sel-banda').value = "";
    document.getElementById('sel-aporte').value = "";
    document.getElementById('input-apn').value = "";
    currentFilteredRecetas = recetas;
    mostrarResultados(currentFilteredRecetas);
};

window.filtrarRecetas = () => {
    const banda = document.getElementById('sel-banda').value.toLowerCase();
    const aporte = document.getElementById('sel-aporte').value.toLowerCase();
    const apn = document.getElementById('input-apn').value.toLowerCase();

    currentFilteredRecetas = recetas.filter(r => {
        return (!banda || r.banda.toLowerCase().includes(banda)) &&
               (!aporte || r.aporte.toLowerCase() === aporte) &&
               (!apn || 
                r.apns.some(a => a.toLowerCase().includes(apn)) || 
                (r.parts_raw && r.parts_raw !== 'NO APLICA' && r.parts_raw.toLowerCase().includes(apn)) ||
                r.alias.toLowerCase().includes(apn) ||
                r.banda.toLowerCase().includes(apn));
    });
    mostrarResultados(currentFilteredRecetas);
};

function mostrarResultados(arr) {
    const listEl = document.getElementById('recipeListLeft');
    if (!listEl) return;
    
    if (!arr.length) {
        listEl.innerHTML = '<div style="padding:32px; text-align:center;" class="t-caption">No hay coincidencias en la Base de Datos</div>';
        return;
    }

    const grupos = {};
    arr.forEach(r => {
        if (!grupos[r.banda]) grupos[r.banda] = [];
        grupos[r.banda].push(r);
    });

    listEl.innerHTML = Object.keys(grupos).map((banda) => {
        const grupo = grupos[banda];
        const r = grupo[0]; 
        
        let tags = '';
        if (grupo.some(g => g.aporte === 'SI')) {
            tags += '<span style="background:rgba(63,185,80,.1); color:var(--ok); border:1px solid rgba(63,185,80,.3); padding:2px 5px; border-radius:4px;">C/A</span>';
        }
        if (grupo.some(g => g.aporte === 'NO')) {
            tags += '<span style="background:rgba(248,81,73,.1); color:var(--crit); border:1px solid rgba(248,81,73,.3); padding:2px 5px; border-radius:4px; margin-left:4px;">S/A</span>';
        }
        
        return `
            <div class="compact-row" onclick="selectRecipe('${banda}')" data-id="${banda}">
                <div class="color-dot" style="--dot-color: ${r.color}"></div>
                <div style="flex:1; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;" class="t-heading">${r.alias}</div>
                <div class="t-micro" style="display:flex; align-items:center;">
                    ${tags}
                </div>
            </div>
        `;
    }).join('');
}

function parseParts(pr, br){
    if(!pr || pr === 'NO APLICA') return [];
    if(pr.includes('|')){
        const segs = pr.split('||'); 
        const bins = br.split('||');
        return segs.map((seg, i) => { 
            const [num, ...desc] = seg.split('|'); 
            return { num: num.trim(), desc: desc.join(' ').trim(), bin: (bins[i]||'').trim() }; 
        });
    }
    return [{ num: pr.trim(), desc: '', bin: br.trim() }];
}

function generarMontajeHtml(montaje){
    if (!montaje) return '<div class="t-caption" style="text-align:center; padding:16px;">Ver especificaciones del manual de prensa.</div>';
    const steps = montaje.split('->').map(s=>s.trim()).filter(Boolean);
    return steps.map((step, i) => {
        const isFirst = i === 0;
        const isLast = i === steps.length - 1;
        const isSpec = /film|tpu|mould|embossing|chapa|pad|foil|scrim/i.test(step);
        
        const bg = isFirst||isLast ? 'rgba(63,185,80,0.08)' : isSpec ? 'rgba(96,165,250,0.08)' : 'var(--bg)';
        const border = isFirst||isLast ? 'var(--ok)' : isSpec ? 'var(--accent-correas)' : 'var(--border)';
        const color = isFirst||isLast ? 'var(--ok)' : isSpec ? 'var(--accent-correas)' : 'var(--text-main)';
        
        return `
        <div style="display:flex; flex-direction:column; align-items:center;">
            <div style="background:${bg}; border:1px solid ${border}; border-radius:6px; padding:12px 16px; text-align:center; font-family:var(--font-mono); font-size:13px; color:${color}; font-weight:${isFirst||isLast?700:400}; width:100%; box-shadow:0 4px 12px rgba(0,0,0,0.15);">
                ${step}
            </div>
            ${i < steps.length - 1 ? '<div style="color:var(--border2); font-size:14px; line-height:1; margin:6px 0;">▼</div>' : ''}
        </div>`;
    }).join('');
}

window.selectRecipe = (bandaId) => {
    const recetasGrupo = currentFilteredRecetas.filter(rec => rec.banda === bandaId);
    if (!recetasGrupo.length) return;

    document.querySelectorAll('.compact-row').forEach(row => {
        const isActive = row.getAttribute('data-id') === bandaId;
        row.classList.toggle('active', isActive);
        if (isActive) row.style.setProperty('--band-color', recetasGrupo[0].color);
    });
    
    const out = document.getElementById('recetas-output');
    if (!out) return;

    const htmlStack = recetasGrupo.map(r => {
        const col = r.color;
        const tNum = parseInt(r.temp_arr) || 0;
        const tc = tNum >= 185 ? 'var(--crit)' : tNum >= 180 ? 'var(--warn)' : 'var(--accent-correas)';

        const preHtml = r.pre_calentamiento === 'SI' ? `
            <div class="result-block" style="background:rgba(251,146,60,.08); border-color:rgba(251,146,60,.3); margin-top:16px; padding:16px;">
                <div class="t-micro" style="color:#fb923c; margin-bottom:12px;">⚡ PRE-CALENTAMIENTO REQUERIDO</div>
                <div class="grid-2">
                    <div style="background:var(--bg); border-radius:6px; padding:12px; text-align:center; border:1px solid var(--border);">
                        <div class="t-micro" style="margin-bottom:4px;">TEMPERATURA</div>
                        <div class="t-heading" style="font-size:24px; color:#fb923c;">${r.temp_pre}<span style="font-size:14px; color:var(--text-disabled);">°C</span></div>
                    </div>
                    <div style="background:var(--bg); border-radius:6px; padding:12px; text-align:center; border:1px solid var(--border);">
                        <div class="t-micro" style="margin-bottom:4px;">TIEMPO</div>
                        <div class="t-heading" style="font-size:20px; color:#fb923c;">${r.tiempo_pre}</div>
                    </div>
                </div>
            </div>` : '';

        const partsData = parseParts(r.parts_raw, r.bin_aporte_raw);
        const partsHtml = partsData.length ? partsData.map(p => `
            <div style="display:flex; align-items:center; justify-content:space-between; padding:10px 0; border-bottom:1px dashed var(--border);">
                <div style="display:flex; flex-direction:column; gap:2px;">
                    <span class="t-heading" style="font-family:var(--font-mono); font-size:14px; color:var(--text-main);">${p.num}</span>
                    ${p.desc ? `<span class="t-caption" style="font-size:11px;">${p.desc}</span>` : ''}
                </div>
                <span style="font-family:var(--font-mono); font-size:11px; font-weight:700; background:rgba(96,165,250,.1); border:1px solid rgba(96,165,250,.2); color:var(--accent-correas); padding:4px 8px; border-radius:4px;">${p.bin}</span>
            </div>`).join('') : '<div class="t-caption" style="padding:8px 0;">NO APLICA</div>';

        const apnHtml = r.apns.map((apn, i) => `
            <div style="display:flex; align-items:center; justify-content:space-between; padding:10px 0; border-bottom:1px dashed var(--border);">
                <div style="display:flex; align-items:center; gap:8px;">
                    <span class="t-micro">APN</span>
                    <span class="t-heading" style="font-family:var(--font-mono); font-size:15px;">${apn}</span>
                </div>
                <span style="font-family:var(--font-mono); font-size:11px; font-weight:700; background:rgba(63,185,80,.08); border:1px solid rgba(63,185,80,.2); color:var(--ok); padding:4px 8px; border-radius:4px;">${r.bins[i] || '—'}</span>
            </div>`).join('');

        const comentHtml = r.comentarios ? `
            <div class="result-block section-gap" style="background:rgba(255,153,0,.04); border-color:rgba(255,153,0,.2); padding:24px;">
                <div class="t-micro" style="color:var(--amz); margin-bottom:12px;">💬 PROCEDIMIENTO / NOTAS</div>
                <div class="t-body" style="white-space:pre-line; line-height:1.6; font-size:14px;">${r.comentarios}</div>
            </div>` : '';

        return `
            <div style="border-left: 4px solid ${col}; padding-left: 24px; animation: cardEntry 0.4s cubic-bezier(0.16, 1, 0.3, 1);">
                <div style="display:flex; align-items:flex-start; justify-content:space-between; flex-wrap:wrap; gap:16px; margin-bottom:32px;">
                    <div>
                        <div class="t-display" style="font-size:clamp(28px,4vw,42px); color:${col}; line-height:1; margin-bottom:8px;">${r.alias}</div>
                        <div class="t-caption" style="letter-spacing:1px; color:var(--text-disabled);">${r.banda}</div>
                        <div class="t-micro" style="margin-top:6px;">AMAZON RME · RMU1 · WELDING RECIPE</div>
                    </div>
                    <div style="display:flex; flex-wrap:wrap; gap:8px; align-items:center;">
                        ${r.aporte === 'SI' 
                            ? '<span style="background:rgba(63,185,80,.1);border:1px solid rgba(63,185,80,.3);color:var(--ok);font-size:10px;font-weight:700;padding:6px 12px;border-radius:6px;letter-spacing:1px;">✓ CON APORTE</span>' 
                            : '<span style="background:rgba(248,81,73,.1);border:1px solid rgba(248,81,73,.3);color:var(--crit);font-size:10px;font-weight:700;padding:6px 12px;border-radius:6px;letter-spacing:1px;">✗ SIN APORTE</span>'}
                        <span style="background:rgba(96,165,250,.1);border:1px solid rgba(96,165,250,.3);color:var(--accent-correas);font-size:11px;font-weight:700;padding:6px 12px;border-radius:6px;font-family:var(--font-mono);">${r.presion} BAR</span>
                        <span style="background:rgba(255,153,0,.1);border:1px solid rgba(255,153,0,.3);color:var(--amz);font-size:11px;font-weight:700;padding:6px 12px;border-radius:6px;font-family:var(--font-mono);">${r.tiempo}</span>
                        <button onclick="window.print()" class="btn-back" style="background:var(--card2); border:1px solid var(--border); padding:6px 14px; margin-left:8px;">⎙ Impr.</button>
                    </div>
                </div>

                <div style="display:grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap:16px; margin-bottom:16px;">
                    <div class="result-block" style="padding:24px; background:var(--card2);">
                        <div class="t-micro" style="margin-bottom:16px;">🌡 TEMPERATURA & CICLO</div>
                        <div style="display:grid; grid-template-columns: 1fr 1fr; gap:12px;">
                            <div style="background:var(--bg); border-radius:8px; padding:16px 12px; text-align:center; box-shadow:inset 0 2px 10px rgba(0,0,0,0.2); border:1px solid var(--border);">
                                <div class="t-micro" style="margin-bottom:8px;">ARRIBA</div>
                                <div class="t-heading" style="font-family:var(--font-mono); font-size:28px; color:${tc}; line-height:1;">${r.temp_arr}<span style="font-size:14px; color:var(--text-disabled);">°C</span></div>
                            </div>
                            <div style="background:var(--bg); border-radius:8px; padding:16px 12px; text-align:center; box-shadow:inset 0 2px 10px rgba(0,0,0,0.2); border:1px solid var(--border);">
                                <div class="t-micro" style="margin-bottom:8px;">ABAJO</div>
                                <div class="t-heading" style="font-family:var(--font-mono); font-size:28px; color:${tc}; line-height:1;">${r.temp_abj}<span style="font-size:14px; color:var(--text-disabled);">°C</span></div>
                            </div>
                        </div>
                        <div style="display:flex; justify-content:space-between; align-items:center; background:var(--bg); border-radius:8px; padding:14px 16px; margin-top:12px; border:1px solid var(--border);">
                            <span class="t-caption" style="font-size:12px;">Temp. Cool (bajo presión)</span>
                            <span class="t-heading" style="font-family:var(--font-mono); font-size:18px; color:var(--amz);">${r.temp_cool}°C</span>
                        </div>
                        ${preHtml}
                    </div>

                    <div style="display:flex; flex-direction:column; gap:16px;">
                        <div class="result-block" style="padding:24px; background:var(--card2); flex:1; display:flex; flex-direction:column; align-items:center; justify-content:center;">
                            <div class="t-micro" style="align-self:flex-start; margin-bottom:12px;">📐 PÉRDIDA POR TROQUEL</div>
                            <div class="val-main" style="color:#fbbf24; font-size:64px; text-shadow:0 0 20px rgba(251,191,36,0.2);">${r.perdida_troquel}</div>
                            <div class="t-caption" style="margin-top:8px;">mm exactos a restar</div>
                        </div>
                        <div class="result-block" style="padding:24px; background:var(--card2); flex:1; max-height:220px; overflow-y:auto;">
                            <div class="t-micro" style="margin-bottom:12px;">🔢 APN / BIN DE REFERENCIA</div>
                            ${apnHtml}
                        </div>
                    </div>
                </div>

                <div style="display:grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap:16px;">
                    <div class="result-block" style="padding:24px; background:var(--card2);">
                        <div class="t-micro" style="margin-bottom:20px;">⚙ ORDEN DE MONTAJE (PRENSA)</div>
                        ${generarMontajeHtml(r.montaje)}
                    </div>
                    <div class="result-block" style="padding:24px; background:var(--card2);">
                        <div class="t-micro" style="margin-bottom:16px;">🧩 PARTS APORTE + BIN DE ALMACÉN</div>
                        ${partsHtml}
                    </div>
                </div>

                ${comentHtml}
            </div>
        `;
    }).join('<div style="height:1px; background:var(--border); margin:40px 0; border-radius:1px;"></div>');

    out.innerHTML = htmlStack + `
        <footer style="margin-top: 48px; padding-top: 16px; border-top: 1px solid var(--border); text-align: center;">
          <div class="t-micro">Amazon RME · RMU1 · © 2026 Óscar Litón Nevado. Todos los derechos reservados.</div>
        </footer>
    `;

    if (window.innerWidth <= 900) { toggleDrawer(); }
};

/* ── ROLLOS MODULE CONTROLLER ── */
window.calcRollos = () => {
    const rc = document.getElementById('resultCard');
    if(!rc) return;
    
    const D = parseFloat(document.getElementById('r-dext')?.value);
    const d = parseFloat(document.getElementById('r-dint')?.value);
    const e = parseFloat(document.getElementById('r-esp')?.value);
    
    const factorElement = document.getElementById('r-factor');
    const Kc = factorElement ? parseFloat(factorElement.value) : 1.0;

    if (isNaN(D) || isNaN(d) || isNaN(e) || e <= 0 || D <= d) {
        rc.className = "result-block state-empty";
        document.getElementById('r-resultado').textContent = "--";
        document.getElementById('r-error').textContent = "Introduce los datos";
        return;
    }

    rc.className = "result-block state-loading";
    setTimeout(() => {
        let area = Math.PI * (Math.pow(D/2, 2) - Math.pow(d/2, 2));
        area = area * Kc; 
        
        const L = area / e / 1000; 

        rc.className = "result-block state-ok";
        document.getElementById('r-error').textContent = Kc < 1.0 ? `Cálculo con corrección del ${( (1-Kc)*100 ).toFixed(0)}% por holgura` : "Cálculo Geométrico Exitoso";
        document.getElementById('r-area').textContent = `${area.toFixed(1)} mm²`;
        document.getElementById('r-ratio').textContent = (D/d).toFixed(2);
        
        animateValue('r-resultado', 0, L, 200, true);
        drawRollosSVG(D, d);
    }, 300);
};

function drawRollosSVG(D, d) {
    const svg = document.getElementById('r-svg');
    if (!svg) return;
    const maxR = 40;
    const outerR = maxR;
    const innerR = (d / D) * maxR;
    svg.innerHTML = `
        <circle cx="50" cy="50" r="${outerR}" fill="none" stroke="var(--accent-rollos)" stroke-width="2" opacity="0.8"/>
        <circle cx="50" cy="50" r="${innerR}" fill="none" stroke="var(--border2)" stroke-width="1.5"/>
        <text x="50" y="53" text-anchor="middle" font-size="6" fill="var(--text-disabled)" font-family="var(--font-mono)">NÚCLEO</text>
    `;
}

window.resetRollos = () => {
    ['r-dext','r-dint','r-esp'].forEach(id => { const el = document.getElementById(id); if(el) el.value=''; });
    window.calcRollos();
};

/* ── ASISTENTE DE SOLDADURA DINÁMICO ── */
let PHASES_DB = {}; 
let TIPS_CONTENT_DB = ""; 

async function loadAsistenteSoldaduraData() {
    try {
        const res = await fetch(GS_ASISTENTE_SOLDADURA);
        const text = await res.text();
        const rows = parseCSV(text);
        
        PHASES_DB = {
            conv: [], sdi_gen: [], sdi_amm: [], sdi_for: [],
            arp: [], c900: [], aero: [], ndx: [], punm: []
        };

        rows.forEach(row => {
            const mod = row['modulo'];
            if (!PHASES_DB[mod]) PHASES_DB[mod] = [];

            let pasosHtml = "";
            if (row['pasos_lista']) {
                const pasos = row['pasos_lista'].split(';').map(p => p.trim()).filter(Boolean);
                pasosHtml = `<ol class="step-list">` + pasos.map(p => `<li>${p}</li>`).join('') + `</ol>`;
            }

            let alertaHtml = "";
            if (row['alert_type'] && row['alert_text']) {
                alertaHtml = `
                    <div class="alert-box alert-${row['alert_type']}">
                        <strong>${row['alert_title'] || 'AVISO TÉCNICO'}</strong>
                        ${row['alert_text']}
                    </div>`;
            }

            let tablaHtml = "";
            if (row['tabla_datos']) {
                const lineasTabla = row['tabla_datos'].split('\n').map(l => l.trim()).filter(Boolean);
                if (lineasTabla.length > 0) {
                    const cabecera = lineasTabla[0].split('|').map(c => `<th>${c.trim()}</th>`).join('');
                    const cuerpo = lineasTabla.slice(1).map(l => {
                        const celdas = l.split('|').map(c => `<td>${c.trim()}</td>`).join('');
                        return `<tr>${celdas}</tr>`;
                    }).join('');
                    
                    tablaHtml = `<table class="info-table"><thead><tr>${cabecera}</tr></thead><tbody>${cuerpo}</tbody></table>`;
                }
            }

            PHASES_DB[mod].push({
                id: row['fase_id'],
                label: row['label'],
                color: row['color'] || 'var(--amz)',
                content: `
                    <div class="content-card">
                        <div class="content-card-header">
                            <span class="phase-badge">${row['badge'] || 'MANUAL'}</span>
                            <h3>${row['titulo'] || 'Especificación Técnica'}</h3>
                        </div>
                        <div class="content-card-body">
                            ${alertaHtml}
                            ${pasosHtml}
                            ${tablaHtml}
                        </div>
                    </div>`
            });
        });

        buildTipsPlantaDB(rows);

    } catch (e) {
        console.error("Error crítico sincronizando el Asistente Técnico:", e);
    }
}

function buildTipsPlantaDB(rows) {
    let html = "";
    const modulosUnicos = [...new Set(rows.map(r => r.modulo))];
    
    const aliasModulos = {
        conv: "Bandas Convencionales", sdi_gen: "SDI Sorter General", 
        sdi_amm: "SDI Ammeraal", sdi_for: "SDI Forbo", arp: "Sistemas ARP / LR", 
        c900: "Cortadora Serie 900", aero: "Prensa Novitool Aero", 
        ndx: "NDX PUN M™", punm: "Pun M™ Perforadora"
    };

    modulosUnicos.forEach(m => {
        const alertasCriticas = rows.filter(r => r.modulo === m && (r.alert_type === 'danger' || r.alert_type === 'warning'));
        if (alertasCriticas.length > 0) {
            html += `
                <div class="content-card" style="margin-bottom:14px">
                    <div class="content-card-header">
                        <span class="phase-badge" style="background:rgba(255,153,0,0.08); color:var(--amz); border-color:rgba(255,153,0,0.2)">CRÍTICO</span>
                        <h3>${aliasModulos[m] || m.toUpperCase()}</h3>
                    </div>
                    <div class="content-card-body">
                        <ul style="margin-left:14px;">
                            ${alertasCriticas.map(a => `<li><strong>${a.alert_title}:</strong> ${a.alert_text}</li>`).join('')}
                        </ul>
                    </div>
                </div>`;
        }
    });
    TIPS_CONTENT_DB = html || "<div class='t-caption' style='text-align:center; padding:24px;'>No existen alertas de seguridad registradas en la nube.</div>";
}