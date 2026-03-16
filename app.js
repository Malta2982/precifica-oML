const URL_SB = 'https://btvaccofypcehaqxaxme.supabase.co';
const KEY_SB = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJ0dmFjY29meXBjZWhhcXhheG1lIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM1MzU2OTksImV4cCI6MjA4OTExMTY5OX0.55tDhqLFw4_fobaolaDVVPPn3lIh2JTOv86_tyV4syc';

let sb = null, data = [], myUser = localStorage.getItem('maminfo_user');

function startEdit(id) {
    const item = data.find(r => r.id === id);
    if (!item) return;
    document.getElementById('editId').value = id;
    document.getElementById('editNegociado').value = item.valor_negociado || 0;
    const isMaster = (myUser === "Carla Ramos" || myUser === "Tatiana" || myUser === "UsermasterEvernex");
    const btnF = document.getElementById('btnFinalizar');
    if (btnF) btnF.style.display = isMaster ? "block" : "none";
    document.getElementById('editModal').classList.remove('hidden');
}

document.addEventListener('DOMContentLoaded', async () => {
    try {
        if (typeof supabase !== 'undefined') {
            sb = supabase.createClient(URL_SB, KEY_SB);
            const dot = document.getElementById('connDot');
            if (dot) dot.classList.add('connected');
        }
    } catch (e) { console.error("Erro Supabase:", e); }

    const bind = (id, func) => {
        const el = document.getElementById(id);
        if (el) el.onclick = func;
    };

    bind('btnEntrar', login);
    bind('syncBtn', reloadData);
    bind('btnLogout', logout);
    bind('btnSaveEdit', () => saveNegotiation(false));
    bind('btnFinalizar', () => saveNegotiation(true));
    bind('btnCancelEdit', () => document.getElementById('editModal').classList.add('hidden'));
    bind('btnBackupDB', exportToExcel);
    bind('btnClearDB', clearDB);
    bind('searchAllBtn', startSelectedSearch);
    bind('btnAddFornecedor', cadastrarFonte);

    const fileInp = document.getElementById('fileUpload');
    if (fileInp) {
        bind('btnImport', () => fileInp.click());
        fileInp.onchange = (e) => handleUpload(e.target.files[0]);
    }

    const selAll = document.getElementById('selectAll');
    if (selAll) {
        selAll.onclick = (e) => {
            document.querySelectorAll('.item-check').forEach(cb => cb.checked = e.target.checked);
        };
    }

    const filters = ['searchInput', 'filterCondicao', 'filterFabricante', 'filterTipo', 'filterProjeto'];
    filters.forEach(id => {
        const el = document.getElementById(id);
        if (el) el.oninput = renderTable;
    });

    const inSearchF = document.getElementById('searchFonte');
    if (inSearchF) inSearchF.oninput = atualizarListaFontes;

    if (myUser) showApp();
    
    const tabFerr = document.getElementById('btn-tab-ferramentas');
    const tabRobo = document.getElementById('btn-tab-robo');
    if (tabFerr) tabFerr.onclick = () => switchMasterTab('tab-ferramentas');
    if (tabRobo) tabRobo.onclick = () => switchMasterTab('tab-robo');
});

function login() {
    const input = document.getElementById('nameInput');
    if (!input || !input.value.trim()) return alert("Digite seu nome.");
    myUser = input.value.trim();
    localStorage.setItem('maminfo_user', myUser);
    showApp();
}

function logout() {
    localStorage.removeItem('maminfo_user');
    location.reload();
}

function showApp() {
    const loginSec = document.getElementById('loginSection');
    const appCont = document.getElementById('appContent');
    const mVis = document.getElementById('masterOnlyVisuals');
    const mPan = document.getElementById('masterPanel');
    if (loginSec) loginSec.classList.add('hidden');
    if (appCont) appCont.classList.remove('hidden');
    const isMaster = (myUser === "Carla Ramos" || myUser === "Tatiana" || myUser === "UsermasterEvernex");
    if (isMaster) {
        if (mVis) mVis.classList.remove('hidden');
        if (mPan) mPan.classList.remove('hidden');
        ['card-media', 'card-criticos', 'card-sla'].forEach(id => {
            const el = document.getElementById(id);
            if (el) el.classList.remove('hidden');
        });
        atualizarListaFontes();
    }
    reloadData();
}

async function cadastrarFonte() {
    const nome = document.getElementById('fornecedorNome').value;
    const url = document.getElementById('fornecedorUrl').value;
    if (!nome || !url) return alert("Preencha nome e URL");
    const { error } = await sb.from('fontes_busca').insert([{ nome, url_base: url, status: 'Ativo' }]);
    if (!error) {
        alert("Fonte cadastrada!");
        document.getElementById('fornecedorNome').value = '';
        document.getElementById('fornecedorUrl').value = '';
        atualizarListaFontes();
    }
}

async function atualizarListaFontes() {
    const container = document.getElementById('listaFontesMaster');
    const filtro = document.getElementById('searchFonte')?.value.toLowerCase() || "";
    if (!container) return;

    const { data: fontes } = await sb.from('fontes_busca').select('*').order('nome');
    if (!fontes || fontes.length === 0) {
        container.innerHTML = '<p style="font-size:11px; color:gray;">Nenhuma fonte cadastrada.</p>';
        return;
    }

    const filtradas = fontes.filter(f => f.nome.toLowerCase().includes(filtro));

    container.innerHTML = filtradas.map(f => {
        const isS = f.status === 'Inativo';
        return `
        <div style="display: flex; justify-content: space-between; align-items: center; background: ${isS ? '#f7fafc' : 'white'}; padding: 8px; border-radius: 6px; border: 1px solid #bee3f8; opacity: ${isS ? '0.6' : '1'};">
            <div style="overflow: hidden; flex: 1;">
                <b style="font-size: 11px;">${isS ? '⏸ ' : ''}${f.nome}</b>
                <small style="font-size: 9px; color: gray; display: block; white-space: nowrap; text-overflow: ellipsis; overflow: hidden; max-width: 180px;">${f.url_base}</small>
            </div>
            <div style="display: flex; gap: 5px;">
                <button class="btn-pausa" data-id="${f.id}" data-status="${f.status}" style="background: none; border: 1px solid #cbd5e0; cursor: pointer; border-radius: 4px; padding: 2px 5px;">${isS ? '▶️' : '⏸'}</button>
                <button class="btn-lixeira" data-id="${f.id}" style="background: none; border: none; color: red; cursor: pointer; font-size: 14px;">🗑</button>
            </div>
        </div>`;
    }).join('');

    // VÍNCULO DOS CLIQUES (DENTRO DA FUNÇÃO)
    document.querySelectorAll('.btn-pausa').forEach(btn => {
        btn.onclick = () => alternarStatusFonte(btn.dataset.id, btn.dataset.status);
    });
    document.querySelectorAll('.btn-lixeira').forEach(btn => {
        btn.onclick = () => excluirFonte(btn.dataset.id);
    });
}

async function alternarStatusFonte(id, statusAtual) {
    const novoStatus = statusAtual === 'Inativo' ? 'Ativo' : 'Inativo';
    await sb.from('fontes_busca').update({ status: novoStatus }).eq('id', id);
    atualizarListaFontes();
}

async function excluirFonte(id) {
    if (!confirm("Excluir esta fonte?")) return;
    await sb.from('fontes_busca').delete().eq('id', id);
    atualizarListaFontes();
}

async function reloadData() {
    if (!sb) return;
    const { data: res } = await sb.from('precificacoes').select('*').order('created_at', {ascending: false});
    if (res) {
        data = res;
        renderTable();
        updateStats();
        updateProjectDashboard();
        updateRanking();
    }
}

function updateProjectDashboard() {
    const container = document.getElementById('projectBarsContainer');
    if (!container) return;
    const projects = {};
    data.forEach(r => {
        const p = r.id_projeto || 'Sem Projeto';
        if (!projects[p]) projects[p] = { total: 0, concluido: 0 };
        projects[p].total++;
        if (parseFloat(r.valor_negociado) > 0) projects[p].concluido++;
    });
    container.innerHTML = Object.keys(projects).map(p => {
        const info = projects[p];
        const pct = Math.round((info.concluido / info.total) * 100) || 0;
        return `<div style="background: #f8fafc; padding: 10px; border-radius: 8px; margin-bottom:5px;">
            <div style="display: flex; justify-content: space-between; font-size: 12px;"><span>${p}</span> <b>${pct}%</b></div>
            <div style="width: 100%; background: #edf2f7; height: 6px; border-radius: 3px; overflow: hidden;"><div style="width: ${pct}%; background: #4299e1; height: 100%;"></div></div>
        </div>`;
    }).join('');
}

function updateRanking() {
    const container = document.getElementById('rankingContainer');
    if (!container) return;
    const stats = {};
    data.forEach(r => {
        if (r.responsavel && parseFloat(r.valor_negociado) > 0) {
            const resp = r.responsavel;
            const saving = (parseFloat(r.valor_orcado || 0) - parseFloat(r.valor_negociado || 0));
            stats[resp] = (stats[resp] || 0) + saving;
        }
    });
    const sorted = Object.entries(stats).sort((a, b) => b[1] - a[1]).slice(0, 5);
    container.innerHTML = sorted.map((item, index) => {
        const medalhas = ['🥇', '🥈', '🥉', '👤', '👤'];
        return `<div style="display: flex; flex-direction: column; align-items: center; padding: 10px; background: #f8fafc; border-radius: 10px; ${item[0] === myUser ? 'border: 2px solid #4299e1;' : ''}">
            <span style="font-size: 20px;">${medalhas[index]}</span>
            <b style="font-size: 12px;">${item[0]}</b>
            <span style="color: #38a169; font-weight: bold; font-size: 11px;">R$ ${item[1].toLocaleString('pt-BR')}</span>
        </div>`;
    }).join('');
}

function renderTable() {
    const tbody = document.getElementById('tbody');
    if (!tbody) return;
    const q = document.getElementById('searchInput')?.value.toLowerCase() || "";
    const filtered = data.filter(r => (String(r.fabricante || '') + String(r.item_desc || '')).toLowerCase().includes(q));

    tbody.innerHTML = filtered.map(r => {
        const isF = r.status === 'Finalizado';
        const orcado = parseFloat(r.valor_orcado || 0);
        const mercado = parseFloat(r.preco_mercado_ref || 0);
        const negociado = parseFloat(r.valor_negociado || 0);
        
        // 1. CÁLCULO DE TENDÊNCIA (MERCADO VS ORÇADO)
        let tendenciaHtml = '—';
        if (orcado > 0 && mercado > 0) {
            const diff = ((mercado - orcado) / orcado) * 100;
            const cor = mercado > orcado ? '#e53e3e' : '#38a169';
            const seta = mercado > orcado ? '▲' : '▼';
            tendenciaHtml = `<span style="color: ${cor}; font-weight: bold; font-size: 11px;">${seta} ${Math.abs(diff).toFixed(1)}%</span>`;
        }

        // 2. DESTAQUE DE ECONOMIA (SAVING) NO NEGOCIADO
        // Se negociou abaixo do orçado, ganha um fundo verde suave para destacar o sucesso
        const temSaving = (negociado > 0 && negociado < orcado);
        const bgNegociado = temSaving ? '#f0fff4' : 'transparent';

        const btnH = isF 
            ? ( (myUser === "Carla Ramos" || myUser === "Tatiana") ? `<button class="action-edit" data-id="${r.id}">🔓 Master</button>` : '🔒 Trancado' )
            : `<button class="action-edit" data-id="${r.id}">Editar</button>`;

        return `<tr style="${isF ? 'background: #f0fff4' : ''}">
            <td><input type="checkbox" class="item-check" data-id="${r.id}"></td>
            <td>${r.id_projeto || ''}</td>
            <td><b>${r.fabricante || ''}</b></td>
            <td>${r.item_desc || ''}</td>
            <td style="text-align:center"><span class="tipo-tag" style="background: #ebf8ff; color: #2b6cb0; padding: 2px 8px; border-radius: 12px; font-size: 10px; font-weight: bold;">${r.tipo || 'N/A'}</span></td>
            <td>${r.condicao || '—'}</td> 
            <td style="text-align:center; color: #718096;">${r.sla || '0'}d</td>
            <td style="font-weight:bold;">R$ ${orcado.toFixed(2)}</td>
            <td style="color:#3182ce">R$ ${mercado.toFixed(2)}</td>
            <td style="text-align:center">${tendenciaHtml}</td>
            <td><small>${r.source || '—'}</small></td>
            <td style="text-align:center">${r.link ? `<a href="${r.link}" target="_blank" style="text-decoration:none; font-size:16px;">🎯</a>` : '—'}</td>
            <td style="color:#38a169; font-weight:bold; background: ${bgNegociado}; border-radius: 4px; padding: 4px;">R$ ${negociado.toFixed(2)}</td>
            <td>${btnH}</td>
        </tr>`;
    }).join('');
    
    // Reatribui os eventos de clique para os botões de editar
    document.querySelectorAll('.action-edit').forEach(btn => { 
        btn.onclick = () => startEdit(btn.getAttribute('data-id')); 
    });
}

async function startSelectedSearch() {
    const selectedCbs = document.querySelectorAll('.item-check:checked');
    const ids = Array.from(selectedCbs).map(cb => cb.dataset.id);
    if (ids.length === 0) return alert("Selecione os itens para a busca!");

    // Busca fontes ativas do banco
    const { data: fontes } = await sb.from('fontes_busca').select('nome, url_base, status').eq('status', 'Ativo');
    const fontesAtivas = fontes || [];

    const btn = document.getElementById('searchAllBtn');
    if (btn) { btn.disabled = true; btn.textContent = '⏳ Buscando...'; }

    let encontrados = 0, erros = 0;

    for (let i = 0; i < ids.length; i++) {
        const id   = ids[i];
        const item = data.find(r => r.id === id);
        if (!item) continue;

        if (btn) btn.textContent = `⏳ ${i + 1}/${ids.length} — ${item.fabricante} ${item.item_desc}`;

        try {
            const { data: response, error } = await sb.functions.invoke('ml-search', {
                body: {
                    query:  `${item.fabricante} ${item.item_desc}`,
                    fontes: fontesAtivas
                }
            });

            if (error) throw error;

            if (response && response.result) {
                // Melhor preço automático encontrado
                await sb.from('precificacoes').update({
                    preco_mercado_ref: parseFloat(response.result.total.toFixed(2)),
                    link:              response.result.link,
                    condicao:          response.result.condition,
                    source:            response.result.fonte,
                    updated_at:        new Date().toISOString()
                }).eq('id', id);
                encontrados++;
            } else if (response && response.manuais && response.manuais.length > 0) {
                // Sem preço automático — salva link de busca manual
                await sb.from('precificacoes').update({
                    link:       response.manuais[0].link,
                    source:     response.manuais[0].fonte + ' (manual)',
                    updated_at: new Date().toISOString()
                }).eq('id', id);
            }
        } catch (err) {
            console.error("Erro no robô:", err);
            erros++;
            // Plano B: link direto ML
            const q = encodeURIComponent(`${item.fabricante} ${item.item_desc}`);
            await sb.from('precificacoes').update({
                link:   `https://lista.mercadolivre.com.br/${q}_OrderId_PRICE_NoIndex_True`,
                source: 'Busca Manual'
            }).eq('id', id);
        }

        // Pequeno delay para não sobrecarregar
        await new Promise(r => setTimeout(r, 400));
    }

    if (btn) { btn.disabled = false; btn.textContent = '▶ BUSCAR SELECIONADOS'; }
    alert(`✅ Varredura concluída!\n\n` +
          `• Preços encontrados: ${encontrados}\n` +
          `• Erros: ${erros}\n` +
          `• Links manuais: ${ids.length - encontrados - erros}`);
    reloadData();
}

async function saveNegotiation(isF = false) {
    const id = document.getElementById('editId').value;
    const val = parseFloat(document.getElementById('editNegociado').value || 0);
    const uD = { valor_negociado: val, responsavel: myUser };
    if (isF) uD.status = 'Finalizado';
    await sb.from('precificacoes').update(uD).eq('id', id);
    document.getElementById('editModal').classList.add('hidden');
    reloadData();
}

function updateStats() {
    let s = 0;
    data.forEach(r => { s += (parseFloat(r.valor_orcado || 0) - parseFloat(r.valor_negociado || 0)); });
    const el = document.getElementById('s-economy');
    if(el) el.textContent = "R$ " + s.toLocaleString('pt-BR');
}

function switchMasterTab(tabId) {
    document.querySelectorAll('.master-tab-content').forEach(c => c.style.display = 'none');
    document.querySelectorAll('.master-tab-btn').forEach(b => { 
        b.style.color = '#64748b'; b.style.borderBottom = 'none'; b.classList.remove('active-tab'); 
    });
    const c = document.getElementById(tabId);
    if (c) c.style.display = 'block';
    const b = document.getElementById('btn-' + tabId);
    if (b) { b.style.color = '#2b6cb0'; b.style.borderBottom = '3px solid #2b6cb0'; b.classList.add('active-tab'); }
}

async function clearDB() { if (confirm("Limpar?")) await sb.from('precificacoes').delete().neq('id_projeto', 'null'); reloadData(); }

async function exportToExcel() { 
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Backup");
    XLSX.writeFile(wb, "Maminfo_Backup.xlsx");
}

async function handleUpload(file) {
    if (!file) return;
    const r = new FileReader();
    r.onload = async (e) => {
        const wb = XLSX.read(new Uint8Array(e.target.result), {type:'array'});
        const rows = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]]);
        for (let row of rows) {
            await sb.from('precificacoes').upsert({
                id_projeto: String(row.ID_PROJETO), fabricante: row.FABRICANTE, item_desc: row.PRODUTO,
                valor_orcado: parseFloat(row.VALOR_ORCADO || 0), status: 'Pendente'
            });
        }
        reloadData();
    };
    r.readAsArrayBuffer(file);
}