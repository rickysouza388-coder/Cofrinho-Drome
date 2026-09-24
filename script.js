// ESTADO GLOBAL DA APLICAÇÃO
const state = {
  transactions: [],
  currentMonthKey: '', // Formato: YYYY-MM
  selectedCategory: '',
  rawCents: 0,
  selectedDateISO: '',
  streak: 0,
  lastLaunchDateStr: ''
};

const CATEGORIES = {
  'Entrada': { icon: '💰', color: 'green', type: 'in' },
  'Saída Drome': { icon: '🍔', color: 'yellow', type: 'out' },
  'Saída H/E/C': { icon: '🏠', color: 'blue', type: 'out' },
  'Contas': { icon: '📄', color: 'pink', type: 'out' },
  'Cofrinho': { icon: '🐪', color: 'orange', type: 'piggy' }
};

const MONTH_NAMES = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
];

// INICIALIZAÇÃO
document.addEventListener('DOMContentLoaded', () => {
  loadFromStorage();
  initDates();
  setupEventListeners();
  updateStreak();
  renderAll();
  
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('service-worker.js').catch(() => {});
  }
});

// DATAS
function initDates() {
  const today = new Date();
  state.currentMonthKey = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;
  setLaunchDate(today);
}

function setLaunchDate(dateObj) {
  state.selectedDateISO = dateObj.toISOString().split('T')[0];
  const [year, month, day] = state.selectedDateISO.split('-');
  
  const todayISO = new Date().toISOString().split('T')[0];
  let prefix = '';
  if (state.selectedDateISO === todayISO) {
    prefix = 'Hoje, ';
  }
  
  const formatted = `${prefix}${day}/${month}/${year}`;
  document.getElementById('datePickerBtn').textContent = formatted;
  document.getElementById('hiddenDateInput').value = state.selectedDateISO;
}

// ARMAZENAMENTO LOCAL
function saveToStorage() {
  localStorage.setItem('cofrinho_txs', JSON.stringify(state.transactions));
  localStorage.setItem('cofrinho_streak', state.streak.toString());
  localStorage.setItem('cofrinho_last_date', state.lastLaunchDateStr);
}

function loadFromStorage() {
  const savedTxs = localStorage.getItem('cofrinho_txs');
  if (savedTxs) state.transactions = JSON.parse(savedTxs);
  
  const savedStreak = localStorage.getItem('cofrinho_streak');
  if (savedStreak) state.streak = parseInt(savedStreak, 10);
  
  state.lastLaunchDateStr = localStorage.getItem('cofrinho_last_date') || '';
}

// EVENT LISTENERS
function setupEventListeners() {
  // Navegação
  document.querySelectorAll('.nav-item').forEach(btn => {
    btn.addEventListener('click', () => switchView(btn.dataset.target));
  });

  document.getElementById('fabBtn').addEventListener('click', () => switchView('view-categoria'));

  // Seletor Mês
  document.getElementById('prevMonthBtn').addEventListener('click', () => changeMonth(-1));
  document.getElementById('nextMonthBtn').addEventListener('click', () => changeMonth(1));

  // Seleção de Categoria
  document.querySelectorAll('.cat-tile').forEach(tile => {
    tile.addEventListener('click', () => {
      state.selectedCategory = tile.dataset.category;
      state.rawCents = 0;
      updateDisplayAmount();
      document.getElementById('inputDescription').value = '';
      switchView('view-teclado');
    });
  });

  // Data Picker
  const dateBtn = document.getElementById('datePickerBtn');
  const hiddenInput = document.getElementById('hiddenDateInput');
  dateBtn.addEventListener('click', () => hiddenInput.showPicker());
  hiddenInput.addEventListener('change', (e) => {
    if (e.target.value) {
      const parts = e.target.value.split('-');
      setLaunchDate(new Date(parts[0], parts[1] - 1, parts[2]));
    }
  });

  // Teclado Numérico
  document.querySelectorAll('.num-btn[data-val]').forEach(btn => {
    btn.addEventListener('click', () => {
      const val = btn.dataset.val;
      if (val === ',') return; // Tecla decimal implícita no modo caixa eletrônico
      if (state.rawCents.toString().length < 8) {
        state.rawCents = state.rawCents * 10 + parseInt(val, 10);
        updateDisplayAmount();
      }
    });
  });

  document.getElementById('btnBackspace').addEventListener('click', () => {
    state.rawCents = Math.floor(state.rawCents / 10);
    updateDisplayAmount();
  });

  // Salvar Lançamento
  document.getElementById('btnSaveTransaction').addEventListener('click', saveTransaction);

  // Filtros Histórico
  document.getElementById('searchHistory').addEventListener('input', renderHistory);
  document.getElementById('filterCategory').addEventListener('change', renderHistory);

  // Backup e Limpeza
  document.getElementById('btnExportJSON').addEventListener('click', exportData);
  document.getElementById('btnImportJSON').addEventListener('click', () => document.getElementById('importFileInput').click());
  document.getElementById('importFileInput').addEventListener('change', importData);
  document.getElementById('btnResetData').addEventListener('click', resetAllData);
}

// ATUALIZAR MOSTRADOR DE VALOR
function updateDisplayAmount() {
  const amount = state.rawCents / 100;
  document.getElementById('displayAmount').textContent = formatCurrency(amount);
}

function formatCurrency(val) {
  return val.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

// SALVAR NOVO LANÇAMENTO
function saveTransaction() {
  const amount = state.rawCents / 100;
  if (amount <= 0) {
    alert('Digite um valor maior que zero.');
    return;
  }

  const desc = document.getElementById('inputDescription').value.trim() || state.selectedCategory;

  const newTx = {
    id: Date.now().toString(),
    date: state.selectedDateISO,
    category: state.selectedCategory,
    description: desc,
    amount: amount
  };

  state.transactions.unshift(newTx);
  checkStreakIncrement(state.selectedDateISO);
  saveToStorage();
  renderAll();
  switchView('view-inicio');
}

// EXCLUIR LANÇAMENTO
function deleteTransaction(id) {
  if (confirm('Deseja realmente excluir este lançamento?')) {
    state.transactions = state.transactions.filter(t => t.id !== id);
    saveToStorage();
    renderAll();
  }
}

// GAMIFICAÇÃO / SEQUÊNCIA 🔥
function checkStreakIncrement(launchDateStr) {
  const todayStr = new Date().toISOString().split('T')[0];
  if (launchDateStr === todayStr && state.lastLaunchDateStr !== todayStr) {
    state.streak += 1;
    state.lastLaunchDateStr = todayStr;
  }
}

function updateStreak() {
  document.getElementById('streakDays').textContent = state.streak;
}

// CAMBIO DE TELA (SPA)
function switchView(viewId) {
  document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
  document.getElementById(viewId).classList.add('active');

  document.querySelectorAll('.nav-item').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.target === viewId);
  });
}

// NAVEGAÇÃO DE MÊS
function changeMonth(delta) {
  const [year, month] = state.currentMonthKey.split('-').map(Number);
  const d = new Date(year, month - 1 + delta, 1);
  state.currentMonthKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  renderAll();
}

// RENDERIZAÇÃO GERAL E CÁLCULOS
function renderAll() {
  updateMonthLabel();
  renderDashboardCards();
  renderRecentTransactions();
  renderHistory();
  renderCharts();
}

function updateMonthLabel() {
  const [year, month] = state.currentMonthKey.split('-').map(Number);
  document.getElementById('currentMonthLabel').textContent = `${MONTH_NAMES[month - 1]} de ${year}`;
  document.getElementById('cofrinhoAcumuladoTitle').textContent = `Cofrinho acumulado (desde ${MONTH_NAMES[month - 1].substring(0, 3)}/${year})`;
}

function renderDashboardCards() {
  const monthTxs = state.transactions.filter(t => t.date.startsWith(state.currentMonthKey));

  let totalEntrada = 0;
  let totalSaidaDrome = 0;
  let totalSaidaHEC = 0;
  let totalContas = 0;
  let totalCofrinhoMes = 0;

  monthTxs.forEach(t => {
    if (t.category === 'Entrada') totalEntrada += t.amount;
    if (t.category === 'Saída Drome') totalSaidaDrome += t.amount;
    if (t.category === 'Saída H/E/C') totalSaidaHEC += t.amount;
    if (t.category === 'Contas') totalContas += t.amount;
    if (t.category === 'Cofrinho') totalCofrinhoMes += t.amount;
  });

  const totalSaidasCommon = totalSaidaDrome + totalSaidaHEC + totalContas;
  const saldoMes = totalEntrada - totalSaidasCommon - totalCofrinhoMes;

  let cofrinhoTotalGlobal = 0;
  state.transactions.forEach(t => {
    if (t.category === 'Cofrinho') cofrinhoTotalGlobal += t.amount;
  });

  // Atualizar DOM Cards
  document.getElementById('cardSaldoMes').textContent = formatCurrency(saldoMes);
  document.getElementById('cardGuardadoMes').textContent = formatCurrency(totalCofrinhoMes);
  document.getElementById('cardCofrinhoAcumulado').textContent = formatCurrency(cofrinhoTotalGlobal);

  // Lista por Categoria
  document.getElementById('catValEntrada').textContent = formatCurrency(totalEntrada);
  document.getElementById('catValSaidaDrome').textContent = formatCurrency(totalSaidaDrome);
  document.getElementById('catValSaidaHEC').textContent = formatCurrency(totalSaidaHEC);
  document.getElementById('catValContas').textContent = formatCurrency(totalContas);
  document.getElementById('catValCofrinho').textContent = formatCurrency(totalCofrinhoMes);
}

function renderRecentTransactions() {
  const container = document.getElementById('recentList');
  const recent = state.transactions.slice(0, 5);

  if (recent.length === 0) {
    container.innerHTML = '<div class="empty-state">Seu controle começa aqui.<br>Faça o primeiro lançamento!</div>';
    return;
  }

  container.innerHTML = recent.map(t => createTxHTML(t)).join('');
}

function renderHistory() {
  const container = document.getElementById('fullHistoryList');
  const search = document.getElementById('searchHistory').value.toLowerCase();
  const catFilter = document.getElementById('filterCategory').value;

  const filtered = state.transactions.filter(t => {
    const matchesSearch = t.description.toLowerCase().includes(search);
    const matchesCat = catFilter === 'ALL' || t.category === catFilter;
    return matchesSearch && matchesCat;
  });

  if (filtered.length === 0) {
    container.innerHTML = '<div class="empty-state">Nenhum lançamento encontrado.</div>';
    return;
  }

  container.innerHTML = filtered.map(t => createTxHTML(t, true)).join('');
}

function createTxHTML(t, showDelete = false) {
  const cat = CATEGORIES[t.category] || { icon: '📝', color: 'green' };
  const [year, month, day] = t.date.split('-');
  const formattedDate = `${day}/${month}/${year}`;
  const sign = t.category === 'Entrada' ? '+' : '−';

  return `
    <div class="tx-item">
      <div class="tx-left">
        <span class="tx-icon">${cat.icon}</span>
        <div>
          <div class="tx-desc">${t.description}</div>
          <div class="tx-meta">${t.category} • ${formattedDate}</div>
        </div>
      </div>
      <div style="display: flex; align-items: center;">
        <div class="tx-amount ${cat.color}">${sign} ${formatCurrency(t.amount)}</div>
        ${showDelete ? `<button class="btn-del" onclick="deleteTransaction('${t.id}')">🗑️</button>` : ''}
      </div>
    </div>
  `;
}

// GRÁFICOS EM CSS/HTML
function renderCharts() {
  const cofrinhoChartContainer = document.getElementById('chartCofrinho');
  const monthlyChartContainer = document.getElementById('chartMonthly');

  // Agrupar por Mês
  const monthsMap = {};
  state.transactions.forEach(t => {
    const monthKey = t.date.substring(0, 7);
    if (!monthsMap[monthKey]) monthsMap[monthKey] = { cofrinho: 0, entrada: 0, saida: 0 };
    if (t.category === 'Cofrinho') monthsMap[monthKey].cofrinho += t.amount;
    if (t.category === 'Entrada') monthsMap[monthKey].entrada += t.amount;
    if (['Saída Drome', 'Saída H/E/C', 'Contas'].includes(t.category)) monthsMap[monthKey].saida += t.amount;
  });

  const keys = Object.keys(monthsMap).sort().slice(-6); // Últimos 6 meses

  if (keys.length === 0) {
    cofrinhoChartContainer.innerHTML = '<div class="empty-state">Sem dados para gráficos.</div>';
    monthlyChartContainer.innerHTML = '<div class="empty-state">Sem dados para gráficos.</div>';
    return;
  }

  // Render Baú do Cofrinho
  let maxCofrinho = Math.max(...keys.map(k => monthsMap[k].cofrinho), 10);
  cofrinhoChartContainer.innerHTML = keys.map(k => {
    const val = monthsMap[k].cofrinho;
    const heightPct = Math.max((val / maxCofrinho) * 100, 5);
    const [y, m] = k.split('-');
    return `
      <div class="chart-bar-group">
        <div class="chart-bar" style="height: ${heightPct}%;"></div>
        <span class="chart-label">${m}/${y.substring(2)}</span>
      </div>
    `;
  }).join('');

  // Render Entradas x Saídas
  let maxMonthly = Math.max(...keys.map(k => Math.max(monthsMap[k].entrada, monthsMap[k].saida)), 10);
  monthlyChartContainer.innerHTML = keys.map(k => {
    const ent = monthsMap[k].entrada;
    const heightPct = Math.max((ent / maxMonthly) * 100, 5);
    const [y, m] = k.split('-');
    return `
      <div class="chart-bar-group">
        <div class="chart-bar" style="height: ${heightPct}%; background-color: var(--color-green);"></div>
        <span class="chart-label">${m}/${y.substring(2)}</span>
      </div>
    `;
  }).join('');
}

// BACKUP E RESTAURAÇÃO
function exportData() {
  const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(state.transactions));
  const downloadAnchor = document.createElement('a');
  downloadAnchor.setAttribute("href", dataStr);
  downloadAnchor.setAttribute("download", `cofrinho_backup_${new Date().toISOString().split('T')[0]}.json`);
  document.body.appendChild(downloadAnchor);
  downloadAnchor.click();
  downloadAnchor.remove();
}

function importData(e) {
  const file = e.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = function(evt) {
    try {
      const imported = JSON.parse(evt.target.result);
      if (Array.isArray(imported)) {
        state.transactions = imported;
        saveToStorage();
        renderAll();
        alert('Dados importados com sucesso!');
      }
    } catch (err) {
      alert('Arquivo JSON inválido.');
    }
  };
  reader.readAsText(file);
}

function resetAllData() {
  if (confirm('ATENÇÃO: Deseja apagar permanentemente todos os registros do seu Cofrinho?')) {
    localStorage.clear();
    state.transactions = [];
    state.streak = 0;
    state.lastLaunchDateStr = '';
    renderAll();
    updateStreak();
    alert('Todos os dados foram apagados.');
  }
}
