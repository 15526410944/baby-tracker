/**
 * 宝宝成长记 - 主应用逻辑
 */

const App = {
    currentDate: Utils.todayStr(),  // 日常记录当前查看日期
    modalCallback: null,             // 模态框确认回调
    deferredPrompt: null,            // PWA安装事件

    init() {
        this.bindEvents();
        this.checkBabyInfo();
        this.renderDashboard();
        this.renderAll();
        this.registerSW();
        this.showInstallPrompt();
    },

    // ===== 事件绑定 =====
    bindEvents() {
        // 侧边栏导航 - 只绑定菜单里的 nav-btn
        document.querySelectorAll('.sidebar-menu .nav-btn').forEach(btn => {
            btn.addEventListener('click', () => this.switchPage(btn.dataset.page));
        });

        // 侧边栏设置按钮
        const sidebarSettings = document.getElementById('sidebarSettings');
        if (sidebarSettings) {
            sidebarSettings.addEventListener('click', () => this.showSettings());
        }

        // 头像点击上传
        const fileInput = document.getElementById('avatarFileInput');
        const handleAvatarClick = () => {
            if (fileInput) fileInput.click();
        };
        const dashAvatar = document.getElementById('dashAvatar');
        if (dashAvatar) dashAvatar.addEventListener('click', handleAvatarClick);
        const babyAvatar = document.getElementById('babyAvatar');
        if (babyAvatar) babyAvatar.addEventListener('click', handleAvatarClick);
        const sidebarAvatar = document.getElementById('sidebarAvatar');
        if (sidebarAvatar) sidebarAvatar.addEventListener('click', handleAvatarClick);

        // 文件选择处理
        if (fileInput) {
            fileInput.addEventListener('change', (e) => {
                const file = e.target.files[0];
                if (!file) return;
                if (file.size > 2 * 1024 * 1024) {
                    this.toast('图片不能超过2MB哦');
                    return;
                }
                const reader = new FileReader();
                reader.onload = (ev) => {
                    const db = Storage.load();
                    db.baby.avatar = ev.target.result;
                    Storage.save(db);
                    this.renderBabyInfo();
                    this.toast('头像更新成功');
                };
                reader.readAsDataURL(file);
            });
        }

        // 概览卡片跳转 - 新样式
        document.querySelectorAll('.dash-stat').forEach(stat => {
            stat.addEventListener('click', () => {
                const nav = stat.dataset.nav;
                this.switchPage('daily');
                setTimeout(() => this.switchDailyTab(nav), 100);
            });
        });

        // 快捷操作
        document.querySelectorAll('.dash-quick-btn').forEach(btn => {
            btn.addEventListener('click', () => this.handleQuickAction(btn.dataset.action));
        });

        // 清空今日时间线
        document.getElementById('clearTodayTimeline').addEventListener('click', () => this.clearTodayTimeline());

        // 全局搜索
        const searchInput = document.getElementById('globalSearch');
        if (searchInput) {
            let searchTimer = null;
            searchInput.addEventListener('input', (e) => {
                clearTimeout(searchTimer);
                const query = e.target.value.trim();
                const resultsEl = document.getElementById('searchResults');
                if (query.length < 2) {
                    if (resultsEl) resultsEl.style.display = 'none';
                    return;
                }
                searchTimer = setTimeout(() => {
                    const results = this.searchRecords(query);
                    if (results.length === 0) {
                        resultsEl.innerHTML = '<div class="search-result-item"><span class="search-result-icon">🔍</span><div class="search-result-info"><div class="search-result-title">未找到相关记录</div></div></div>';
                    } else {
                        resultsEl.innerHTML = results.map(r => `
                            <div class="search-result-item" onclick="App.goToSearchResult('${r.type}')">
                                <span class="search-result-icon">${r.icon}</span>
                                <div class="search-result-info">
                                    <div class="search-result-title">${this.escape(r.title)}</div>
                                    <div class="search-result-date">${Utils.formatDateFull(r.date)}</div>
                                </div>
                            </div>
                        `).join('');
                    }
                    resultsEl.style.display = 'block';
                }, 300);
            });
            // 点击外部隐藏搜索结果
            document.addEventListener('click', (e) => {
                if (!e.target.closest('.dash-search-bar')) {
                    const resultsEl = document.getElementById('searchResults');
                    if (resultsEl) resultsEl.style.display = 'none';
                }
            });
        }

        // 宝宝信息 - 点击仪表盘头像区域
        const dashAvatarSection = document.querySelector('.dash-avatar-section');
        if (dashAvatarSection) {
            dashAvatarSection.addEventListener('click', (e) => {
                if (e.target !== document.getElementById('dashAvatar')) {
                    this.showBabyInfoForm();
                }
            });
        }

        // 健康档案tab切换
        document.querySelectorAll('.health-tab').forEach(tab => {
            tab.addEventListener('click', () => this.switchHealthTab(tab.dataset.tab));
        });

        // 日常记录tab切换
        document.querySelectorAll('.daily-tab').forEach(tab => {
            tab.addEventListener('click', () => this.switchDailyTab(tab.dataset.dtab));
        });

        // 早教tab切换
        document.querySelectorAll('.early-nav-btn').forEach(tab => {
            tab.addEventListener('click', () => this.switchEarlyTab(tab.dataset.etab));
        });

        // 推送tab切换
        document.querySelectorAll('.push-tab').forEach(tab => {
            tab.addEventListener('click', () => this.switchPushTab(tab.dataset.ptab));
        });

        // 日期切换
        document.getElementById('prevDay').addEventListener('click', () => this.changeDay(-1));
        document.getElementById('nextDay').addEventListener('click', () => this.changeDay(1));

        // 健康记录添加按钮
        document.querySelectorAll('[data-add]').forEach(btn => {
            btn.addEventListener('click', () => this.showAddForm(btn.dataset.add));
        });

        // 日常记录添加按钮
        document.querySelectorAll('[data-dadd]').forEach(btn => {
            btn.addEventListener('click', () => this.showDailyAddForm(btn.dataset.dadd));
        });

        // 早教记录添加按钮
        document.querySelectorAll('[data-eadd]').forEach(btn => {
            btn.addEventListener('click', () => this.showEarlyAddForm(btn.dataset.eadd));
        });

        // 模态框
        document.getElementById('modalClose').addEventListener('click', () => this.closeModal());
        document.getElementById('modalCancel').addEventListener('click', () => this.closeModal());
        document.getElementById('modalOverlay').addEventListener('click', (e) => {
            if (e.target.id === 'modalOverlay') this.closeModal();
        });
        document.getElementById('modalConfirm').addEventListener('click', () => this.confirmModal());

        // PWA安装
        window.addEventListener('beforeinstallprompt', (e) => {
            e.preventDefault();
            this.deferredPrompt = e;
            this.showInstallBanner();
        });

        // 今日待办复选框
        document.querySelectorAll('.dash-todo-item input[type="checkbox"]').forEach(cb => {
            cb.addEventListener('change', () => this.updateTodoCount());
        });
    },

    // ===== 页面切换 =====
    switchPage(pageName) {
        document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
        document.getElementById(`page-${pageName}`).classList.add('active');
        document.querySelectorAll('.sidebar-menu .nav-btn').forEach(b => b.classList.remove('active'));
        document.querySelector(`.sidebar-menu .nav-btn[data-page="${pageName}"]`).classList.add('active');
        document.querySelector('.app-main').scrollTop = 0;

        // 渲染对应页面
        if (pageName === 'dashboard') this.renderDashboard();
        if (pageName === 'health') this.renderHealth();
        if (pageName === 'daily') this.renderDaily();
        if (pageName === 'early') this.renderEarly();
        if (pageName === 'shopping') this.renderShopping();
        if (pageName === 'growth') this.renderGrowth();
        if (pageName === 'diary') this.renderDiary();
        if (pageName === 'dailyPush') this.renderDailyPush();
    },

    // ===== 检查宝宝信息 =====
    checkBabyInfo() {
        const db = Storage.load();
        if (!db.baby.name || !db.baby.birthDate) {
            this.showBabyInfoForm(true);
        }
    },

    // ===== 渲染所有页面 =====
    renderAll() {
        this.renderBabyInfo();
    },

    // ===== 渲染宝宝信息 =====
    renderBabyInfo() {
        const db = Storage.load();
        const avatar = db.baby.avatar || '👶';
        const isPhoto = avatar.startsWith('data:image/');

        // 仪表盘中央头像
        const dashAvatar = document.getElementById('dashAvatar');
        if (dashAvatar) {
            if (isPhoto) {
                dashAvatar.textContent = '';
                dashAvatar.style.backgroundImage = `url(${avatar})`;
                dashAvatar.style.backgroundSize = 'cover';
                dashAvatar.style.backgroundPosition = 'center';
            } else {
                dashAvatar.style.backgroundImage = '';
                dashAvatar.textContent = avatar;
            }
        }

        // 顶部头像 (保留兼容)
        const babyAvatar = document.getElementById('babyAvatar');
        if (babyAvatar) {
            if (isPhoto) {
                babyAvatar.textContent = '';
                babyAvatar.style.backgroundImage = `url(${avatar})`;
                babyAvatar.style.backgroundSize = 'cover';
                babyAvatar.style.backgroundPosition = 'center';
            } else {
                babyAvatar.style.backgroundImage = '';
                babyAvatar.textContent = avatar;
            }
        }

        // 侧边栏头像
        const sidebarAvatar = document.getElementById('sidebarAvatar');
        if (sidebarAvatar) {
            if (isPhoto) {
                sidebarAvatar.textContent = '';
                sidebarAvatar.style.backgroundImage = `url(${avatar})`;
                sidebarAvatar.style.backgroundSize = 'cover';
                sidebarAvatar.style.backgroundPosition = 'center';
            } else {
                sidebarAvatar.style.backgroundImage = '';
                sidebarAvatar.textContent = avatar;
            }
        }

        // 仪表盘名字和年龄
        const dashBabyName = document.getElementById('dashBabyName');
        const dashBabyAge = document.getElementById('dashBabyAge');
        if (db.baby.name) {
            if (dashBabyName) dashBabyName.textContent = db.baby.name;
            document.getElementById('babyName') && (document.getElementById('babyName').textContent = db.baby.name);
            const sidebarName = document.getElementById('sidebarName');
            if (sidebarName) sidebarName.textContent = db.baby.name + '成长工作台 ❤️';
        }
        if (db.baby.birthDate) {
            const age = Utils.calcAge(db.baby.birthDate);
            if (dashBabyAge) dashBabyAge.textContent = age;
            document.getElementById('babyAge') && (document.getElementById('babyAge').textContent = age);
        }
    },

    // ===== 首页仪表盘 =====
    renderDashboard() {
        document.getElementById('greeting').textContent = Utils.getGreeting() + ' 👋';

        // 本周数据
        this.renderWeekData();

        // 每日推送精选
        this.renderDashPush();

        // 疫苗提醒
        this.renderVaccineReminder();

        // 今日时间线
        this.renderTimeline();
    },

    // 本周数据统计
    renderWeekData() {
        const db = Storage.load();
        const today = new Date();
        const weekStart = new Date(today);
        weekStart.setDate(today.getDate() - today.getDay());
        const weekStartStr = Utils.dateStr(weekStart);

        // 本周户外时长
        let outdoorMins = 0;
        (db.outdoor || []).forEach(o => {
            if (o.date >= weekStartStr && o.duration) outdoorMins += parseInt(o.duration) || 0;
        });
        document.getElementById('weekOutdoor').textContent =
            outdoorMins >= 60 ? `${(outdoorMins/60).toFixed(1)}h` : `${outdoorMins}min`;

        // 本周绘本数
        let storyCount = 0;
        (db.story || []).forEach(s => {
            if (s.date >= weekStartStr) storyCount++;
        });
        document.getElementById('weekStory').textContent = `${storyCount}本`;

        // 本月购物花费
        const monthStr = `${today.getFullYear()}-${String(today.getMonth()+1).padStart(2,'0')}`;
        let monthTotal = 0;
        (db.shopping || []).forEach(s => {
            if (s.date && s.date.startsWith(monthStr) && s.price) {
                monthTotal += parseFloat(s.price) || 0;
            }
        });
        document.getElementById('monthShopping').textContent = `¥${monthTotal}`;
    },

    // 首页推送精选
    renderDashPush() {
        const db = Storage.load();
        const ageBadge = document.getElementById('dashPushAge');
        const pushList = document.getElementById('dashPushList');

        if (!db.baby.birthDate) {
            pushList.innerHTML = '<div class="dash-push-item"><span class="dash-push-dot"></span><div class="dash-push-text">请先设置宝宝信息</div></div>';
            return;
        }

        const months = Math.floor((new Date() - new Date(db.baby.birthDate)) / (1000*60*60*24*30.44));
        const ageText = months > 0 ? `${months}个月` : '新生儿';
        if (ageBadge) ageBadge.textContent = `安安 · ${ageText}`;

        if (typeof PushData === 'undefined') {
            pushList.innerHTML = '<div class="dash-push-item"><span class="dash-push-dot"></span><div class="dash-push-text">推送内容加载中...</div></div>';
            return;
        }

        const pushes = PushData.getByMonth(months);
        const items = [];
        const keys = Object.keys(pushes);
        // 从每个分类取第一条
        keys.forEach(k => {
            if (pushes[k] && pushes[k].length > 0) {
                items.push({ cat: k, ...pushes[k][0] });
            }
        });

        if (items.length === 0) {
            pushList.innerHTML = '<div class="dash-push-item"><span class="dash-push-dot"></span><div class="dash-push-text">暂无推送</div></div>';
            return;
        }

        // 随机取3条
        const selected = items.sort(() => Math.random() - 0.5).slice(0, 3);
        const catIcons = { feeding: '🍽️', education: '🧩', development: '📈', sleep: '💤', health: '🩺', care: '👶' };

        pushList.innerHTML = selected.map(item => `
            <div class="dash-push-item">
                <span class="dash-push-dot"></span>
                <div class="dash-push-text">
                    ${item.title}
                    <span class="dash-push-tag">${catIcons[item.cat] || ''}</span>
                </div>
            </div>
        `).join('');
    },

    // 更新待办计数 (保留兼容)
    updateTodoCount() {
        const todoChecks = document.querySelectorAll('.dash-todo-item input[type="checkbox"]');
        let done = 0;
        todoChecks.forEach(cb => { if (cb.checked) done++; });
        const countEl = document.getElementById('todoCount');
        if (countEl) countEl.textContent = `${done}/${todoChecks.length}`;
    },

    // 疫苗提醒
    renderVaccineReminder() {
        const db = Storage.load();
        if (!db.baby.birthDate) return;
        if (typeof VaccineSchedule === 'undefined') return;
        
        const reminders = VaccineSchedule.getReminders(db.baby.birthDate, db.vaccine || []);
        const card = document.getElementById('dashVaccineCard');
        const list = document.getElementById('dashVaccineList');
        
        if (!card || !list) return;
        
        if (reminders.length === 0) {
            card.style.display = 'none';
            return;
        }
        
        card.style.display = 'block';
        list.innerHTML = reminders.map(v => `
            <div class="dash-vaccine-item">
                <span class="dash-vaccine-dot" style="background:#E85D75"></span>
                <div class="dash-vaccine-text">
                    <strong>${v.name}</strong> 第${v.dose}剂
                    <span class="dash-push-tag">${v.desc}</span>
                </div>
            </div>
        `).join('');
    },

    renderTimeline() {
        const db = Storage.load();
        const today = Utils.todayStr();
        const allRecords = [];

        // 收集今日所有记录
        ['feeding', 'sleep', 'diaper', 'bath'].forEach(type => {
            const records = Storage.getByDate(type, today);
            records.forEach(r => {
                allRecords.push({ ...r, _type: type });
            });
        });

        // 按时间排序
        allRecords.sort((a, b) => (b.time || '').localeCompare(a.time || ''));

        const container = document.getElementById('todayTimeline');
        if (allRecords.length === 0) {
            container.innerHTML = '<div class="empty-state">还没有记录，点击上方按钮开始吧</div>';
            return;
        }

        const typeMap = {
            feeding: { icon: '🍼', label: '喂奶' },
            sleep: { icon: '😴', label: '睡眠' },
            diaper: { icon: '🧷', label: '尿布' },
            bath: { icon: '🛁', label: '洗澡' }
        };

        container.innerHTML = allRecords.map(r => {
            const info = typeMap[r._type];
            let detail = '';
            if (r._type === 'feeding') {
                detail = `${r.feedType || ''} ${r.amount || ''}${r.unit || ''}`;
            } else if (r._type === 'sleep') {
                detail = `${r.duration || 0}分钟`;
            } else if (r._type === 'diaper') {
                detail = r.diaperType || '';
            } else if (r._type === 'bath') {
                detail = r.duration ? `${r.duration}分钟` : '';
            }

            return `
                <div class="timeline-item">
                    <div class="timeline-time">${r.time || ''}</div>
                    <div class="timeline-content">
                        <span class="timeline-icon">${info.icon}</span>
                        <strong>${info.label}</strong>
                        ${detail ? ' · ' + detail : ''}
                        ${r.note ? '<br><small style="color:#999">' + r.note + '</small>' : ''}
                    </div>
                </div>
            `;
        }).join('');
    },

    clearTodayTimeline() {
        if (!confirm('确定清空今日所有日常记录吗？（健康档案不受影响）')) return;
        const today = Utils.todayStr();
        const db = Storage.load();
        ['feeding', 'sleep', 'diaper', 'bath'].forEach(type => {
            db[type] = db[type].filter(r => r.date !== today);
        });
        Storage.save(db);
        this.renderDashboard();
        this.toast('已清空今日记录');
    },

    // ===== 快捷操作 =====
    handleQuickAction(action) {
        const handlers = {
            'quick-feed': () => this.showDailyAddForm('feeding'),
            'quick-sleep': () => this.showDailyAddForm('sleep'),
            'quick-diaper': () => this.showDailyAddForm('diaper'),
            'quick-bath': () => this.showDailyAddForm('bath'),
            'quick-diary': () => this.showAddForm('diary')
        };
        if (handlers[action]) handlers[action]();
    },

    // ===== 健康档案 =====
    switchHealthTab(tab) {
        document.querySelectorAll('.health-tab').forEach(t => t.classList.remove('active'));
        document.querySelectorAll('.health-content').forEach(c => c.classList.remove('active'));
        document.querySelector(`.health-tab[data-tab="${tab}"]`).classList.add('active');
        document.getElementById(`tab-${tab}`).classList.add('active');
    },

    renderHealth() {
        this.renderMedical();
        this.renderVaccine();
        this.renderCheckup();
        this.renderMedication();
    },

    renderMedical() {
        const records = Storage.getAll('medical');
        const container = document.getElementById('medicalList');
        if (records.length === 0) {
            container.innerHTML = '<div class="empty-state">暂无就医记录</div>';
            return;
        }
        container.innerHTML = records.map(r => `
            <div class="record-card" data-type="medical">
                <div class="record-card-header">
                    <div class="record-title">${this.escape(r.hospital || '就医')} - ${this.escape(r.department || '')}</div>
                    <div class="record-date">${Utils.formatDateFull(r.date)}</div>
                </div>
                <div class="record-detail">
                    <strong>症状：</strong>${this.escape(r.symptom || '未记录')}<br>
                    <strong>诊断：</strong>${this.escape(r.diagnosis || '未记录')}<br>
                    ${r.prescription ? '<strong>处方：</strong>' + this.escape(r.prescription) + '<br>' : ''}
                    ${r.note ? '<strong>备注：</strong>' + this.escape(r.note) : ''}
                </div>
                <div class="record-tags">
                    ${r.doctor ? `<span class="record-tag">医生: ${this.escape(r.doctor)}</span>` : ''}
                </div>
                <div class="record-actions">
                    <button class="record-edit" onclick="App.editRecord('medical','${r.id}')">✏️</button>
                    <button class="record-delete" onclick="App.deleteRecord('medical','${r.id}')">🗑</button>
                </div>
            </div>
        `).join('');
    },

    renderVaccine() {
        const records = Storage.getAll('vaccine');
        const container = document.getElementById('vaccineList');
        if (records.length === 0) {
            container.innerHTML = '<div class="empty-state">暂无疫苗记录</div>';
            return;
        }
        container.innerHTML = records.map(r => `
            <div class="record-card" data-type="vaccine">
                <div class="record-card-header">
                    <div class="record-title">💉 ${this.escape(r.vaccineName || '疫苗')}</div>
                    <div class="record-date">${Utils.formatDateFull(r.date)}</div>
                </div>
                <div class="record-detail">
                    ${r.dose ? '<strong>剂次：</strong>' + this.escape(r.dose) + '<br>' : ''}
                    ${r.location ? '<strong>接种地点：</strong>' + this.escape(r.location) + '<br>' : ''}
                    ${r.batchNo ? '<strong>批号：</strong>' + this.escape(r.batchNo) + '<br>' : ''}
                    ${r.reaction ? '<strong>反应：</strong>' + this.escape(r.reaction) : ''}
                </div>
                <div class="record-actions">
                    <button class="record-edit" onclick="App.editRecord('vaccine','${r.id}')">✏️</button>
                    <button class="record-delete" onclick="App.deleteRecord('vaccine','${r.id}')">🗑</button>
                </div>
            </div>
        `).join('');
    },

    renderCheckup() {
        const records = Storage.getAll('checkup');
        const container = document.getElementById('checkupList');
        if (records.length === 0) {
            container.innerHTML = '<div class="empty-state">暂无儿保体检记录</div>';
            return;
        }
        container.innerHTML = records.map(r => `
            <div class="record-card" data-type="checkup">
                <div class="record-card-header">
                    <div class="record-title">📋 ${this.escape(r.age || '')} 儿保体检</div>
                    <div class="record-date">${Utils.formatDateFull(r.date)}</div>
                </div>
                <div class="record-detail">
                    ${r.height ? '<strong>身高：</strong>' + r.height + 'cm<br>' : ''}
                    ${r.weight ? '<strong>体重：</strong>' + r.weight + 'kg<br>' : ''}
                    ${r.headCircumference ? '<strong>头围：</strong>' + r.headCircumference + 'cm<br>' : ''}
                    ${r.result ? '<strong>结果：</strong>' + this.escape(r.result) + '<br>' : ''}
                    ${r.advice ? '<strong>建议：</strong>' + this.escape(r.advice) : ''}
                </div>
                <div class="record-actions">
                    <button class="record-edit" onclick="App.editRecord('checkup','${r.id}')">✏️</button>
                    <button class="record-delete" onclick="App.deleteRecord('checkup','${r.id}')">🗑</button>
                </div>
            </div>
        `).join('');
    },

    renderMedication() {
        const records = Storage.getAll('medication');
        const container = document.getElementById('medicationList');
        if (records.length === 0) {
            container.innerHTML = '<div class="empty-state">暂无用药记录</div>';
            return;
        }
        container.innerHTML = records.map(r => `
            <div class="record-card" data-type="medication">
                <div class="record-card-header">
                    <div class="record-title">💊 ${this.escape(r.medicineName || '用药')}</div>
                    <div class="record-date">${Utils.formatDateFull(r.date)}</div>
                </div>
                <div class="record-detail">
                    ${r.dosage ? '<strong>用量：</strong>' + this.escape(r.dosage) + '<br>' : ''}
                    ${r.frequency ? '<strong>频次：</strong>' + this.escape(r.frequency) + '<br>' : ''}
                    ${r.reason ? '<strong>原因：</strong>' + this.escape(r.reason) + '<br>' : ''}
                    ${r.note ? '<strong>备注：</strong>' + this.escape(r.note) : ''}
                </div>
                <div class="record-actions">
                    <button class="record-edit" onclick="App.editRecord('medication','${r.id}')">✏️</button>
                    <button class="record-delete" onclick="App.deleteRecord('medication','${r.id}')">🗑</button>
                </div>
            </div>
        `).join('');
    },

    // ===== 日常记录 =====
    switchDailyTab(tab) {
        document.querySelectorAll('.daily-tab').forEach(t => t.classList.remove('active'));
        document.querySelectorAll('.daily-content').forEach(c => c.classList.remove('active'));
        document.querySelector(`.daily-tab[data-dtab="${tab}"]`).classList.add('active');
        document.getElementById(`dtab-${tab}`).classList.add('active');
    },

    changeDay(delta) {
        this.currentDate = Utils.addDays(this.currentDate, delta);
        this.renderDaily();
    },

    renderDaily() {
        document.getElementById('dailyDate').textContent = Utils.formatDate(this.currentDate);
        this.renderFeeding();
        this.renderSleep();
        this.renderDiaper();
        this.renderBath();
    },

    renderFeeding() {
        const records = Storage.getByDate('feeding', this.currentDate);
        const container = document.getElementById('feedingList');
        if (records.length === 0) {
            container.innerHTML = '<div class="empty-state">暂无喂养记录</div>';
            return;
        }
        const feedTypeMap = { breast: '🤱 母乳', formula: '🍼 配方奶', solid: '🥣 辅食', water: '💧 喝水', snack: '🍪 零食' };
        container.innerHTML = records.map(r => `
            <div class="record-card" data-type="feeding">
                <div class="record-card-header">
                    <div class="record-title">${feedTypeMap[r.feedType] || r.feedType || '喂养'}</div>
                    <div class="record-date">${r.time || ''}</div>
                </div>
                <div class="record-detail">
                    ${r.amount ? '<strong>量：</strong>' + r.amount + (r.unit || 'ml') + '<br>' : ''}
                    ${r.duration ? '<strong>时长：</strong>' + r.duration + '分钟<br>' : ''}
                    ${r.foodName ? '<strong>食物：</strong>' + this.escape(r.foodName) + '<br>' : ''}
                    ${r.note ? '<strong>备注：</strong>' + this.escape(r.note) : ''}
                </div>
                <div class="record-actions">
                    <button class="record-edit" onclick="App.editRecord('feeding','${r.id}')">✏️</button>
                    <button class="record-delete" onclick="App.deleteRecord('feeding','${r.id}')">🗑</button>
                </div>
            </div>
        `).join('');
    },

    renderSleep() {
        const records = Storage.getByDate('sleep', this.currentDate);
        const container = document.getElementById('sleepList');
        if (records.length === 0) {
            container.innerHTML = '<div class="empty-state">暂无睡眠记录</div>';
            return;
        }
        const sleepTypeMap = { night: '🌙 夜间睡眠', nap: '☀️ 白天小睡' };
        let totalMins = 0;
        records.forEach(r => totalMins += parseInt(r.duration) || 0);
        container.innerHTML = `
            <div class="growth-stat-card" style="margin-bottom:12px">
                <div class="growth-stat-label">本日总睡眠</div>
                <div class="growth-stat-value">${(totalMins/60).toFixed(1)}<span class="growth-stat-unit"> 小时</span></div>
            </div>
        ` + records.map(r => `
            <div class="record-card" data-type="sleep">
                <div class="record-card-header">
                    <div class="record-title">${sleepTypeMap[r.sleepType] || '睡眠'}</div>
                    <div class="record-date">${r.time || ''}</div>
                </div>
                <div class="record-detail">
                    <strong>时长：</strong>${r.duration || 0}分钟<br>
                    ${r.quality ? '<strong>质量：</strong>' + this.escape(r.quality) + '<br>' : ''}
                    ${r.note ? '<strong>备注：</strong>' + this.escape(r.note) : ''}
                </div>
                <div class="record-actions">
                    <button class="record-edit" onclick="App.editRecord('sleep','${r.id}')">✏️</button>
                    <button class="record-delete" onclick="App.deleteRecord('sleep','${r.id}')">🗑</button>
                </div>
            </div>
        `).join('');
    },

    renderOutdoor() {
        const records = Storage.getByDate('outdoor', this.currentDate);
        const container = document.getElementById('outdoorList');
        if (records.length === 0) {
            container.innerHTML = '<div class="empty-state">暂无户外活动记录</div>';
            return;
        }
        let totalMins = 0;
        records.forEach(r => totalMins += parseInt(r.duration) || 0);
        const goal = Storage.load().settings.outdoorGoal;
        container.innerHTML = `
            <div class="growth-stat-card" style="margin-bottom:12px">
                <div class="growth-stat-label">今日户外总时长 (目标${goal}min)</div>
                <div class="growth-stat-value">${totalMins}<span class="growth-stat-unit"> 分钟</span></div>
            </div>
        ` + records.map(r => `
            <div class="record-card" data-type="outdoor">
                <div class="record-card-header">
                    <div class="record-title">🌳 ${this.escape(r.activity || '户外活动')}</div>
                    <div class="record-date">${r.time || ''}</div>
                </div>
                <div class="record-detail">
                    <strong>时长：</strong>${r.duration || 0}分钟<br>
                    ${r.location ? '<strong>地点：</strong>' + this.escape(r.location) + '<br>' : ''}
                    ${r.weather ? '<strong>天气：</strong>' + this.escape(r.weather) + '<br>' : ''}
                    ${r.note ? '<strong>备注：</strong>' + this.escape(r.note) : ''}
                </div>
                <div class="record-actions">
                    <button class="record-edit" onclick="App.editRecord('outdoor','${r.id}')">✏️</button>
                    <button class="record-delete" onclick="App.deleteRecord('outdoor','${r.id}')">🗑</button>
                </div>
            </div>
        `).join('');
    },

    renderStory() {
        const records = Storage.getByDate('story', this.currentDate);
        const container = document.getElementById('storyList');
        if (records.length === 0) {
            container.innerHTML = '<div class="empty-state">暂无故事时间记录</div>';
            return;
        }
        container.innerHTML = records.map(r => `
            <div class="record-card" data-type="story">
                <div class="record-card-header">
                    <div class="record-title">📖 ${this.escape(r.bookName || '故事时间')}</div>
                    <div class="record-date">${r.time || ''}</div>
                </div>
                <div class="record-detail">
                    ${r.duration ? '<strong>时长：</strong>' + r.duration + '分钟<br>' : ''}
                    ${r.content ? '<strong>内容：</strong>' + this.escape(r.content) + '<br>' : ''}
                    ${r.reaction ? '<strong>宝宝反应：</strong>' + this.escape(r.reaction) + '<br>' : ''}
                    ${r.note ? '<strong>备注：</strong>' + this.escape(r.note) : ''}
                </div>
                <div class="record-actions">
                    <button class="record-edit" onclick="App.editRecord('story','${r.id}')">✏️</button>
                    <button class="record-delete" onclick="App.deleteRecord('story','${r.id}')">🗑</button>
                </div>
            </div>
        `).join('');
    },

    renderDiaper() {
        const records = Storage.getByDate('diaper', this.currentDate);
        const container = document.getElementById('diaperList');
        if (records.length === 0) {
            container.innerHTML = '<div class="empty-state">暂无尿布记录</div>';
            return;
        }
        const typeMap = { wet: '💧 湿', dirty: '💩 脏', both: '💧💩 都有', dry: '✅ 干爽' };
        container.innerHTML = records.map(r => `
            <div class="record-card" data-type="diaper">
                <div class="record-card-header">
                    <div class="record-title">${typeMap[r.diaperType] || '尿布'}</div>
                    <div class="record-date">${r.time || ''}</div>
                </div>
                <div class="record-detail">
                    ${r.note ? '<strong>备注：</strong>' + this.escape(r.note) : ''}
                </div>
                <div class="record-actions">
                    <button class="record-edit" onclick="App.editRecord('diaper','${r.id}')">✏️</button>
                    <button class="record-delete" onclick="App.deleteRecord('diaper','${r.id}')">🗑</button>
                </div>
            </div>
        `).join('');
    },

    renderBath() {
        const records = Storage.getByDate('bath', this.currentDate);
        const container = document.getElementById('bathList');
        if (records.length === 0) {
            container.innerHTML = '<div class="empty-state">暂无洗澡记录</div>';
            return;
        }
        container.innerHTML = records.map(r => `
            <div class="record-card" data-type="bath">
                <div class="record-card-header">
                    <div class="record-title">🛁 洗澡</div>
                    <div class="record-date">${r.time || ''}</div>
                </div>
                <div class="record-detail">
                    ${r.duration ? '<strong>时长：</strong>' + r.duration + '分钟<br>' : ''}
                    ${r.note ? '<strong>备注：</strong>' + this.escape(r.note) : ''}
                </div>
                <div class="record-actions">
                    <button class="record-edit" onclick="App.editRecord('bath','${r.id}')">✏️</button>
                    <button class="record-delete" onclick="App.deleteRecord('bath','${r.id}')">🗑</button>
                </div>
            </div>
        `).join('');
    },

    // ===== 早教启蒙 =====
    switchEarlyTab(tab) {
        document.querySelectorAll('.early-nav-btn').forEach(t => t.classList.remove('active'));
        document.querySelectorAll('.early-content').forEach(c => c.classList.remove('active'));
        const tabBtn = document.querySelector(`.early-nav-btn[data-etab="${tab}"]`);
        if (tabBtn) tabBtn.classList.add('active');
        const content = document.getElementById(`etab-${tab}`);
        if (content) content.classList.add('active');
    },

    renderEarly() {
        this.currentDate = Utils.todayStr();
        this.renderEarlyOutdoor();
        this.renderEarlyExercise();
        this.renderEarlyStory();
        this.renderMusic();
        this.renderCustomEarly();
    },

    showEarlyAddForm(type) {
        const forms = {
            outdoor: () => this.formOutdoor(),
            exercise: () => this.formExercise(),
            story: () => this.formStory(),
            music: () => this.formMusic(),
            customEarly: () => this.formCustomEarly()
        };
        if (forms[type]) forms[type]();
    },

    renderEarlyOutdoor() {
        const records = Storage.getByDate('outdoor', Utils.todayStr());
        const container = document.getElementById('earlyOutdoorList');
        if (records.length === 0) {
            container.innerHTML = '<div class="empty-state">暂无户外活动记录</div>';
            return;
        }
        let totalMins = 0;
        records.forEach(r => totalMins += parseInt(r.duration) || 0);
        const goal = Storage.load().settings.outdoorGoal;
        container.innerHTML = `
            <div class="growth-stat-card" style="margin-bottom:12px">
                <div class="growth-stat-label">今日户外总时长 (目标${goal}min)</div>
                <div class="growth-stat-value">${totalMins}<span class="growth-stat-unit"> 分钟</span></div>
            </div>
        ` + records.map(r => `
            <div class="record-card" data-type="outdoor">
                <div class="record-card-header">
                    <div class="record-title">🌳 ${this.escape(r.activity || '户外活动')}</div>
                    <div class="record-date">${r.time || ''}</div>
                </div>
                <div class="record-detail">
                    <strong>时长：</strong>${r.duration || 0}分钟<br>
                    ${r.location ? '<strong>地点：</strong>' + this.escape(r.location) + '<br>' : ''}
                    ${r.weather ? '<strong>天气：</strong>' + this.escape(r.weather) + '<br>' : ''}
                    ${r.note ? '<strong>备注：</strong>' + this.escape(r.note) : ''}
                </div>
                <div class="record-actions">
                    <button class="record-edit" onclick="App.editRecord('outdoor','${r.id}')">✏️</button>
                    <button class="record-delete" onclick="App.deleteRecord('outdoor','${r.id}')">🗑</button>
                </div>
            </div>
        `).join('');
    },

    renderEarlyExercise() {
        const records = Storage.getByDate('exercise', Utils.todayStr());
        const container = document.getElementById('earlyExerciseList');
        if (records.length === 0) {
            container.innerHTML = '<div class="empty-state">暂无运动记录</div>';
            return;
        }
        container.innerHTML = records.map(r => `
            <div class="record-card" data-type="exercise">
                <div class="record-card-header">
                    <div class="record-title">🤸 ${this.escape(r.exerciseType || '运动')}</div>
                    <div class="record-date">${r.time || ''}</div>
                </div>
                <div class="record-detail">
                    ${r.duration ? '<strong>时长：</strong>' + r.duration + '分钟<br>' : ''}
                    ${r.note ? '<strong>备注：</strong>' + this.escape(r.note) : ''}
                </div>
                <div class="record-actions">
                    <button class="record-edit" onclick="App.editRecord('exercise','${r.id}')">✏️</button>
                    <button class="record-delete" onclick="App.deleteRecord('exercise','${r.id}')">🗑</button>
                </div>
            </div>
        `).join('');
    },

    renderEarlyStory() {
        const records = Storage.getByDate('story', Utils.todayStr());
        const container = document.getElementById('earlyStoryList');
        if (records.length === 0) {
            container.innerHTML = '<div class="empty-state">暂无绘本记录</div>';
            return;
        }
        container.innerHTML = records.map(r => `
            <div class="record-card" data-type="story">
                <div class="record-card-header">
                    <div class="record-title">📖 ${this.escape(r.bookName || '绘本')}</div>
                    <div class="record-date">${r.time || ''}</div>
                </div>
                <div class="record-detail">
                    ${r.duration ? '<strong>时长：</strong>' + r.duration + '分钟<br>' : ''}
                    ${r.content ? '<strong>内容：</strong>' + this.escape(r.content) + '<br>' : ''}
                    ${r.reaction ? '<strong>反应：</strong>' + this.escape(r.reaction) + '<br>' : ''}
                    ${r.note ? '<strong>备注：</strong>' + this.escape(r.note) : ''}
                </div>
                <div class="record-actions">
                    <button class="record-edit" onclick="App.editRecord('story','${r.id}')">✏️</button>
                    <button class="record-delete" onclick="App.deleteRecord('story','${r.id}')">🗑</button>
                </div>
            </div>
        `).join('');
    },

    renderMusic() {
        const records = Storage.getAll('music').sort((a, b) => new Date(b.date) - new Date(a.date));
        const container = document.getElementById('musicList');
        if (records.length === 0) {
            container.innerHTML = '<div class="empty-state">暂无音乐记录</div>';
            return;
        }
        container.innerHTML = records.map(r => `
            <div class="record-card" data-type="music">
                <div class="record-card-header">
                    <div class="record-title">🎵 ${this.escape(r.songName || '音乐')}</div>
                    <div class="record-date">${Utils.formatDateFull(r.date)} ${r.time || ''}</div>
                </div>
                <div class="record-detail">
                    ${r.duration ? '<strong>时长：</strong>' + r.duration + '分钟<br>' : ''}
                    ${r.reaction ? '<strong>宝宝反应：</strong>' + this.escape(r.reaction) + '<br>' : ''}
                    ${r.note ? '<strong>备注：</strong>' + this.escape(r.note) : ''}
                </div>
                <div class="record-actions">
                    <button class="record-edit" onclick="App.editRecord('music','${r.id}')">✏️</button>
                    <button class="record-delete" onclick="App.deleteRecord('music','${r.id}')">🗑</button>
                </div>
            </div>
        `).join('');
    },

    renderCustomEarly() {
        const records = Storage.getAll('customEarly').sort((a, b) => new Date(b.date) - new Date(a.date));
        const container = document.getElementById('customEarlyList');
        if (records.length === 0) {
            container.innerHTML = '<div class="empty-state">点击上方按钮添加自定义早教记录</div>';
            return;
        }
        container.innerHTML = records.map(r => `
            <div class="record-card" data-type="customEarly">
                <div class="record-card-header">
                    <div class="record-title">✨ ${this.escape(r.title || '早教活动')}</div>
                    <div class="record-date">${Utils.formatDateFull(r.date)} ${r.time || ''}</div>
                </div>
                <div class="record-detail">
                    ${r.content ? '<strong>内容：</strong>' + this.escape(r.content) + '<br>' : ''}
                    ${r.duration ? '<strong>时长：</strong>' + r.duration + '分钟<br>' : ''}
                    ${r.note ? '<strong>备注：</strong>' + this.escape(r.note) : ''}
                </div>
                <div class="record-actions">
                    <button class="record-edit" onclick="App.editRecord('customEarly','${r.id}')">✏️</button>
                    <button class="record-delete" onclick="App.deleteRecord('customEarly','${r.id}')">🗑</button>
                </div>
            </div>
        `).join('');
    },

    formMusic() {
        const body = `
            <div class="form-row">
                <div class="form-group">
                    <label class="form-label">日期</label>
                    <input type="date" class="form-input" id="musicDate" value="${Utils.todayStr()}">
                </div>
                <div class="form-group">
                    <label class="form-label">时间</label>
                    <input type="time" class="form-input" id="musicTime" value="${Utils.nowTime()}">
                </div>
            </div>
            <div class="form-group">
                <label class="form-label">歌曲/音乐名称</label>
                <input type="text" class="form-input" id="musicSongName" placeholder="如：小星星、两只老虎">
            </div>
            <div class="form-group">
                <label class="form-label">时长（分钟）</label>
                <div class="form-counter">
                    <button class="counter-btn" onclick="App.counter('musicDuration',-5)">−</button>
                    <input type="number" class="counter-value" id="musicDuration" value="15" style="text-align:center;border:none;font-size:20px;font-weight:700;width:80px">
                    <button class="counter-btn" onclick="App.counter('musicDuration',5)">+</button>
                </div>
            </div>
            <div class="form-group">
                <label class="form-label">宝宝反应</label>
                <div class="form-chips" id="musicReactionChips" data-multi="true">
                    <div class="form-chip" data-value="很喜欢">😍 很喜欢</div>
                    <div class="form-chip" data-value="跟着哼">🎤 跟着哼</div>
                    <div class="form-chip" data-value="手舞足蹈">💃 手舞足蹈</div>
                    <div class="form-chip" data-value="安静听">😌 安静听</div>
                    <div class="form-chip" data-value="没反应">😶 没反应</div>
                </div>
            </div>
            <div class="form-group">
                <label class="form-label">备注</label>
                <textarea class="form-textarea" id="musicNote" placeholder="如：宝宝特别喜欢这首歌"></textarea>
            </div>
        `;

        this.showModal('记录音乐', body, () => {
            Storage.add('music', {
                date: document.getElementById('musicDate').value,
                time: document.getElementById('musicTime').value,
                songName: this.val('musicSongName'),
                duration: this.val('musicDuration'),
                reaction: this.getMultiChipValues('musicReactionChips'),
                note: this.val('musicNote')
            });
            this.renderEarly();
            this.toast('音乐记录已添加');
        });
        this.bindChips('musicReactionChips');
    },

    formCustomEarly() {
        const body = `
            <div class="form-row">
                <div class="form-group">
                    <label class="form-label">日期</label>
                    <input type="date" class="form-input" id="ceDate" value="${Utils.todayStr()}">
                </div>
                <div class="form-group">
                    <label class="form-label">时间</label>
                    <input type="time" class="form-input" id="ceTime" value="${Utils.nowTime()}">
                </div>
            </div>
            <div class="form-group">
                <label class="form-label">活动标题</label>
                <input type="text" class="form-input" id="ceTitle" placeholder="如：感统训练、积木搭建">
            </div>
            <div class="form-group">
                <label class="form-label">活动内容</label>
                <textarea class="form-textarea" id="ceContent" placeholder="描述具体做了什么"></textarea>
            </div>
            <div class="form-group">
                <label class="form-label">时长（分钟）</label>
                <div class="form-counter">
                    <button class="counter-btn" onclick="App.counter('ceDuration',-5)">−</button>
                    <input type="number" class="counter-value" id="ceDuration" value="15" style="text-align:center;border:none;font-size:20px;font-weight:700;width:80px">
                    <button class="counter-btn" onclick="App.counter('ceDuration',5)">+</button>
                </div>
            </div>
            <div class="form-group">
                <label class="form-label">备注</label>
                <textarea class="form-textarea" id="ceNote" placeholder="宝宝的表现、进步等"></textarea>
            </div>
        `;

        this.showModal('添加早教活动', body, () => {
            Storage.add('customEarly', {
                date: document.getElementById('ceDate').value,
                time: document.getElementById('ceTime').value,
                title: this.val('ceTitle'),
                content: this.val('ceContent'),
                duration: this.val('ceDuration'),
                note: this.val('ceNote')
            });
            this.renderEarly();
            this.toast('早教记录已添加');
        });
    },

    // ===== 购物清单 =====
    renderShopping() {
        const records = Storage.getAll('shopping').sort((a, b) => new Date(b.date) - new Date(a.date));
        const container = document.getElementById('shoppingList');
        const summary = document.getElementById('shoppingSummary');

        if (records.length === 0) {
            summary.innerHTML = '';
            container.innerHTML = '<div class="empty-state">暂无购物记录，点击上方按钮开始记录吧</div>';
            return;
        }

        // 按月分组
        const groups = {};
        records.forEach(r => {
            const month = r.date ? r.date.substring(0, 7) : '未知';
            if (!groups[month]) groups[month] = { records: [], total: 0 };
            groups[month].records.push(r);
            groups[month].total += parseFloat(r.price) || 0;
        });

        // 总览
        const totalAll = Object.values(groups).reduce((sum, g) => sum + g.total, 0);
        summary.innerHTML = `
            <div class="shopping-total-card">
                <div class="shopping-total-label">📊 累计消费</div>
                <div class="shopping-total-value">¥${totalAll.toFixed(2)}</div>
                <div class="shopping-total-desc">共 ${records.length} 件物品</div>
            </div>
        `;

        container.innerHTML = Object.entries(groups).map(([month, group]) => {
            const [y, m] = month.split('-');
            return `
                <div class="shopping-month-card">
                    <div class="shopping-month-header">
                        <div class="shopping-month-title">📅 ${y}年${parseInt(m)}月</div>
                        <div class="shopping-month-total">¥${group.total.toFixed(2)}</div>
                    </div>
                    <div class="shopping-month-items">
                        ${group.records.map(r => `
                            <div class="record-card" data-type="shopping">
                                <div class="record-card-header">
                                    <div class="record-title">🛍️ ${this.escape(r.item || '物品')}</div>
                                    <div class="record-date">${Utils.formatDateFull(r.date)}</div>
                                </div>
                                <div class="record-detail">
                                    ${r.category ? '<strong>分类：</strong>' + this.escape(r.category) + '<br>' : ''}
                                    <strong>价格：</strong>¥${parseFloat(r.price || 0).toFixed(2)}<br>
                                    ${r.rating ? '<strong>评分：</strong>' + '⭐'.repeat(parseInt(r.rating)) + '<br>' : ''}
                                    ${r.store ? '<strong>渠道：</strong>' + this.escape(r.store) + '<br>' : ''}
                                    ${r.note ? '<strong>感受：</strong>' + this.escape(r.note) : ''}
                                </div>
                                <div class="record-actions">
                                    <button class="record-edit" onclick="App.editShopping('${r.id}')">✏️</button>
                                    <button class="record-delete" onclick="App.deleteRecord('shopping','${r.id}')">🗑</button>
                                </div>
                            </div>
                        `).join('')}
                    </div>
                </div>
            `;
        }).join('');
    },

    formShopping(editId = null) {
        let editData = {};
        if (editId) {
            const db = Storage.load();
            editData = (db.shopping || []).find(r => r.id === editId) || {};
        }
        const body = `
            <div class="form-row">
                <div class="form-group">
                    <label class="form-label">购买日期 <span class="required">*</span></label>
                    <input type="date" class="form-input" id="shopDate" value="${editData.date || Utils.todayStr()}">
                </div>
                <div class="form-group">
                    <label class="form-label">价格(元)</label>
                    <input type="number" class="form-input" id="shopPrice" value="${editData.price || ''}" placeholder="0.00" step="0.01">
                </div>
            </div>
            <div class="form-group">
                <label class="form-label">物品名称 <span class="required">*</span></label>
                <input type="text" class="form-input" id="shopItem" value="${this.escape(editData.item || '')}" placeholder="如：婴儿推车、学步鞋">
            </div>
            <div class="form-group">
                <label class="form-label">分类</label>
                <div class="form-chips" id="shopCatChips" data-multi="true">
                    <div class="form-chip ${(editData.category || '').includes('衣物') ? 'active' : ''}" data-value="衣物">👗 衣物</div>
                    <div class="form-chip ${(editData.category || '').includes('喂养') ? 'active' : ''}" data-value="喂养">🍼 喂养</div>
                    <div class="form-chip ${(editData.category || '').includes('尿布') ? 'active' : ''}" data-value="尿布">🧷 尿布</div>
                    <div class="form-chip ${(editData.category || '').includes('玩具') ? 'active' : ''}" data-value="玩具">🧸 玩具</div>
                    <div class="form-chip ${(editData.category || '').includes('洗护') ? 'active' : ''}" data-value="洗护">🛁 洗护</div>
                    <div class="form-chip ${(editData.category || '').includes('出行') ? 'active' : ''}" data-value="出行">🚗 出行</div>
                    <div class="form-chip ${(editData.category || '').includes('其他') ? 'active' : ''}" data-value="其他">📦 其他</div>
                </div>
            </div>
            <div class="form-group">
                <label class="form-label">好用程度</label>
                <div class="form-chips" id="shopRatingChips">
                    <div class="form-chip ${parseInt(editData.rating) === 1 ? 'active' : ''}" data-value="1">⭐</div>
                    <div class="form-chip ${parseInt(editData.rating) === 2 ? 'active' : ''}" data-value="2">⭐⭐</div>
                    <div class="form-chip ${parseInt(editData.rating) === 3 ? 'active' : ''}" data-value="3">⭐⭐⭐</div>
                    <div class="form-chip ${parseInt(editData.rating) === 4 ? 'active' : ''}" data-value="4">⭐⭐⭐⭐</div>
                    <div class="form-chip ${parseInt(editData.rating) === 5 ? 'active' : ''}" data-value="5">⭐⭐⭐⭐⭐</div>
                </div>
            </div>
            <div class="form-group">
                <label class="form-label">购买渠道</label>
                <input type="text" class="form-input" id="shopStore" value="${this.escape(editData.store || '')}" placeholder="如：淘宝、京东、母婴店">
            </div>
            <div class="form-group">
                <label class="form-label">使用感受</label>
                <textarea class="form-textarea" id="shopNote" placeholder="好不好用？有什么心得？">${this.escape(editData.note || '')}</textarea>
            </div>
        `;

        this.showModal(editId ? '编辑购物记录' : '添加购物记录', body, () => {
            const date = document.getElementById('shopDate').value;
            const item = this.val('shopItem');
            if (!date) { this.toast('请选择日期'); return false; }
            if (!item) { this.toast('请输入物品名称'); return false; }
            const data = {
                date,
                item,
                category: this.getMultiChipValues('shopCatChips'),
                price: this.val('shopPrice') || '0',
                rating: document.querySelector('#shopRatingChips .active')?.dataset.value || '',
                store: this.val('shopStore'),
                note: this.val('shopNote')
            };
            if (editId) {
                Storage.update('shopping', editId, data);
                this.toast('购物记录已更新');
            } else {
                Storage.add('shopping', data);
                this.toast('购物记录已添加');
            }
            this.renderShopping();
        });
        this.bindChips('shopCatChips');
        this.bindChips('shopRatingChips');
    },

    editShopping(id) {
        this.formShopping(id);
    },

    renderExercise() {
        const records = Storage.getByDate('exercise', this.currentDate);
        const container = document.getElementById('exerciseList');
        if (records.length === 0) {
            container.innerHTML = '<div class="empty-state">暂无运动记录</div>';
            return;
        }
        container.innerHTML = records.map(r => `
            <div class="record-card" data-type="exercise">
                <div class="record-card-header">
                    <div class="record-title">🤸 ${this.escape(r.exerciseType || '运动')}</div>
                    <div class="record-date">${r.time || ''}</div>
                </div>
                <div class="record-detail">
                    ${r.duration ? '<strong>时长：</strong>' + r.duration + '分钟<br>' : ''}
                    ${r.note ? '<strong>备注：</strong>' + this.escape(r.note) : ''}
                </div>
                <div class="record-actions">
                    <button class="record-edit" onclick="App.editRecord('exercise','${r.id}')">✏️</button>
                    <button class="record-delete" onclick="App.deleteRecord('exercise','${r.id}')">🗑</button>
                </div>
            </div>
        `).join('');
    },

    // ===== 成长发育 =====
    renderGrowth() {
        this.renderGrowthStats();
        this.renderGrowthList();
        this.renderMilestone();
        this.renderMotor();
    },

    renderGrowthStats() {
        const records = Storage.getAll('growth').sort((a, b) => new Date(b.date) - new Date(a.date));
        const container = document.getElementById('growthStats');
        const latest = records[0];

        if (!latest) {
            container.innerHTML = '<div class="empty-state" style="grid-column:1/-1">暂无身高体重数据，点击上方按钮添加</div>';
            return;
        }

        container.innerHTML = `
            <div class="growth-stat-card">
                <div class="growth-stat-label">身高</div>
                <div class="growth-stat-value">${latest.height || '-'}<span class="growth-stat-unit">cm</span></div>
            </div>
            <div class="growth-stat-card">
                <div class="growth-stat-label">体重</div>
                <div class="growth-stat-value">${latest.weight || '-'}<span class="growth-stat-unit">kg</span></div>
            </div>
            <div class="growth-stat-card">
                <div class="growth-stat-label">头围</div>
                <div class="growth-stat-value">${latest.headCircumference || '-'}<span class="growth-stat-unit">cm</span></div>
            </div>
        `;

        // 绘制图表
        this.drawGrowthChart(records.reverse());
    },

    drawGrowthChart(records) {
        const canvas = document.getElementById('growthChart');
        if (!canvas) return;
        
        const db = Storage.load();
        const gender = db.baby.gender || 'girl';
        const whoData = (typeof WhoGrowth !== 'undefined') ? (WhoGrowth[gender] || WhoGrowth.girl) : null;
        
        let chartType = canvas.dataset.chartType || 'height';
        const container = canvas.parentElement;
        let toggleBar = container.querySelector('.chart-toggle');
        if (!toggleBar) {
            toggleBar = document.createElement('div');
            toggleBar.className = 'chart-toggle';
            toggleBar.innerHTML = '<button class="chart-toggle-btn '+(chartType==='height'?'active':'')+'" data-type="height">📏 身高</button><button class="chart-toggle-btn '+(chartType==='weight'?'active':'')+'" data-type="weight">⚖️ 体重</button>';
            container.insertBefore(toggleBar, canvas);
            toggleBar.querySelectorAll('button').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    canvas.dataset.chartType = e.target.dataset.type;
                    this.drawGrowthChart(records);
                });
            });
        } else {
            toggleBar.querySelectorAll('button').forEach(btn => {
                btn.classList.toggle('active', btn.dataset.type === chartType);
            });
        }

        const dpr = window.devicePixelRatio || 1;
        const W = canvas.parentElement.clientWidth - 16;
        const H = 300;
        canvas.style.width = W + 'px';
        canvas.style.height = H + 'px';
        canvas.width = W * dpr;
        canvas.height = H * dpr;
        const ctx = canvas.getContext('2d');
        ctx.scale(dpr, dpr);
        ctx.clearRect(0, 0, W, H);

        if (records.length < 1) {
            ctx.fillStyle = '#999';
            ctx.font = '14px sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText('记录身高体重后显示生长曲线', W/2, H/2);
            return;
        }

        const margin = { top: 20, right: 20, bottom: 40, left: 50 };
        const pw = W - margin.left - margin.right;
        const ph = H - margin.top - margin.bottom;

        const birthDate = db.baby.birthDate;
        const points = records
            .filter(r => r.date && r[chartType])
            .map(r => ({
                month: parseFloat(((new Date(r.date) - new Date(birthDate)) / (1000*60*60*24*30.44)).toFixed(1)),
                value: parseFloat(r[chartType])
            }))
            .filter(p => p.month >= 0 && p.value > 0)
            .sort((a, b) => a.month - b.month);

        if (points.length === 0) {
            ctx.fillStyle = '#999';
            ctx.font = '14px sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText('暂无有效数据', W/2, H/2);
            return;
        }

        // WHO 标准曲线数据点
        let whoPoints = [];
        let whoMonths = [];
        if (whoData) {
            whoMonths = Object.keys(whoData).map(Number).sort((a,b)=>a-b);
            whoPoints = whoMonths.map(m => ({
                month: m,
                p3: whoData[m][chartType].p3,
                p50: whoData[m][chartType].p50,
                p97: whoData[m][chartType].p97
            }));
        }

        // 计算范围
        let allVals = points.map(p => p.value);
        if (whoPoints.length > 0) {
            allVals = allVals.concat(whoPoints.flatMap(p => [p.p3, p.p50, p.p97]));
        }
        const maxVal = Math.ceil(Math.max(...allVals) * 1.1);
        const minVal = Math.floor(Math.min(...allVals) * 0.9);
        const maxMonth = Math.max(...points.map(p=>p.month), ...(whoMonths.length>0?whoMonths:[0])) + 2;

        const xScale = (m) => margin.left + (m / maxMonth) * pw;
        const yScale = (v) => margin.top + ph - ((v - minVal) / (maxVal - minVal)) * ph;

        // 绘制 WHO 标准曲线
        if (whoPoints.length > 0) {
            const drawWhoLine = (key, color, dash) => {
                ctx.beginPath();
                ctx.strokeStyle = color;
                ctx.lineWidth = 1.2;
                ctx.setLineDash(dash);
                whoPoints.forEach((p, i) => {
                    const x = xScale(p.month);
                    const y = yScale(p[key]);
                    if (i === 0) ctx.moveTo(x, y);
                    else ctx.lineTo(x, y);
                });
                ctx.stroke();
                ctx.setLineDash([]);
            };
            drawWhoLine('p97', 'rgba(200,100,100,0.5)', [4,4]);
            drawWhoLine('p50', 'rgba(100,150,100,0.6)', [2,2]);
            drawWhoLine('p3', 'rgba(100,100,200,0.5)', [4,4]);
        }

        // 绘制宝宝数据
        ctx.beginPath();
        ctx.strokeStyle = '#E85D75';
        ctx.lineWidth = 2.5;
        ctx.setLineDash([]);
        points.forEach((p, i) => {
            const x = xScale(p.month);
            const y = yScale(p.value);
            if (i === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
        });
        ctx.stroke();

        // 数据点
        points.forEach(p => {
            const x = xScale(p.month);
            const y = yScale(p.value);
            ctx.beginPath();
            ctx.fillStyle = '#E85D75';
            ctx.arc(x, y, 4, 0, Math.PI*2);
            ctx.fill();
            ctx.fillStyle = '#fff';
            ctx.arc(x, y, 2, 0, Math.PI*2);
            ctx.fill();
        });

        // 坐标轴
        ctx.strokeStyle = '#ddd';
        ctx.lineWidth = 0.5;
        ctx.setLineDash([]);
        ctx.beginPath();
        ctx.moveTo(margin.left, margin.top);
        ctx.lineTo(margin.left, margin.top + ph);
        ctx.lineTo(margin.left + pw, margin.top + ph);
        ctx.stroke();

        // Y轴刻度
        ctx.fillStyle = '#999';
        ctx.font = '10px sans-serif';
        ctx.textAlign = 'right';
        for (let i = 0; i <= 4; i++) {
            const val = minVal + (maxVal - minVal) * i / 4;
            const y = yScale(val);
            ctx.fillText(val.toFixed(1), margin.left - 5, y + 3);
        }

        // X轴刻度（月份）
        ctx.textAlign = 'center';
        const step = maxMonth > 24 ? 6 : maxMonth > 12 ? 3 : 2;
        for (let m = 0; m <= maxMonth; m += step) {
            const x = xScale(m);
            ctx.fillText(m + '月', x, margin.top + ph + 18);
        }

        // 图例
        const legendY = margin.top - 2;
        const legends = [
            { color: '#E85D75', text: '安安', dash: [] },
            { color: 'rgba(200,100,100,0.5)', text: 'P97', dash: [4,4] },
            { color: 'rgba(100,150,100,0.6)', text: 'P50', dash: [2,2] },
            { color: 'rgba(100,100,200,0.5)', text: 'P3', dash: [4,4] }
        ];
        let lx = margin.left;
        legends.forEach(l => {
            ctx.beginPath();
            ctx.strokeStyle = l.color;
            ctx.lineWidth = 1.5;
            ctx.setLineDash(l.dash);
            ctx.moveTo(lx, legendY);
            ctx.lineTo(lx + 15, legendY);
            ctx.stroke();
            ctx.setLineDash([]);
            ctx.fillStyle = '#666';
            ctx.font = '10px sans-serif';
            ctx.textAlign = 'left';
            ctx.fillText(l.text, lx + 18, legendY + 4);
            lx += 55;
        });

        // 标题
        ctx.fillStyle = '#666';
        ctx.font = 'bold 11px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(chartType === 'height' ? '身高生长曲线 (cm)' : '体重生长曲线 (kg)', W/2, margin.top + ph + 35);
    },

    renderGrowthList() {
        const records = Storage.getAll('growth').sort((a, b) => new Date(b.date) - new Date(a.date));
        const container = document.getElementById('growthList');
        if (records.length === 0) {
            container.innerHTML = '<div class="empty-state">暂无记录</div>';
            return;
        }
        container.innerHTML = records.map(r => `
            <div class="record-card">
                <div class="record-card-header">
                    <div class="record-title">${Utils.formatDateFull(r.date)}</div>
                </div>
                <div class="record-detail">
                    ${r.height ? '<strong>身高：</strong>' + r.height + 'cm<br>' : ''}
                    ${r.weight ? '<strong>体重：</strong>' + r.weight + 'kg<br>' : ''}
                    ${r.headCircumference ? '<strong>头围：</strong>' + r.headCircumference + 'cm<br>' : ''}
                    ${r.note ? '<strong>备注：</strong>' + this.escape(r.note) : ''}
                </div>
                <div class="record-actions">
                    <button class="record-edit" onclick="App.editRecord('growth','${r.id}')">✏️</button>
                    <button class="record-delete" onclick="App.deleteRecord('growth','${r.id}')">🗑</button>
                </div>
            </div>
        `).join('');
    },

    renderMilestone() {
        const records = Storage.getAll('milestone').sort((a, b) => new Date(b.date) - new Date(a.date));
        const container = document.getElementById('milestoneList');
        if (records.length === 0) {
            container.innerHTML = '<div class="empty-state">记录宝宝第一次翻身、坐、爬、走等里程碑</div>';
            return;
        }
        const iconMap = {
            smile: '😊', laugh: '😄', rollover: '🤸', sit: '🪑', crawl: '👶',
            stand: '🧍', walk: '🚶', talk: '🗣️', teeth: '🦷', other: '⭐'
        };
        container.innerHTML = records.map(r => `
            <div class="milestone-card">
                <div class="milestone-icon">${iconMap[r.milestoneType] || '⭐'}</div>
                <div class="milestone-info">
                    <div class="milestone-title">${this.escape(r.title || '里程碑')}</div>
                    <div class="milestone-date">${Utils.formatDateFull(r.date)} · ${Utils.calcAgeAt(Storage.load().baby.birthDate, r.date)}</div>
                    ${r.note ? '<div class="milestone-note">' + this.escape(r.note) + '</div>' : ''}
                </div>
                <div class="record-actions">
                    <button class="record-edit" onclick="App.editRecord('milestone','${r.id}')">✏️</button>
                    <button class="record-delete" onclick="App.deleteRecord('milestone','${r.id}')">🗑</button>
                </div>
            </div>
        `).join('');
    },

    renderMotor() {
        const records = Storage.getAll('motor').sort((a, b) => new Date(b.date) - new Date(a.date));
        const container = document.getElementById('motorList');
        if (records.length === 0) {
            container.innerHTML = '<div class="empty-state">记录宝宝运动发展，如抬头、抓握、翻身等</div>';
            return;
        }
        container.innerHTML = records.map(r => `
            <div class="record-card">
                <div class="record-card-header">
                    <div class="record-title">🏃 ${this.escape(r.skill || '运动发展')}</div>
                    <div class="record-date">${Utils.formatDateFull(r.date)}</div>
                </div>
                <div class="record-detail">
                    ${r.level ? '<strong>掌握程度：</strong>' + this.escape(r.level) + '<br>' : ''}
                    ${r.note ? '<strong>备注：</strong>' + this.escape(r.note) : ''}
                </div>
                <div class="record-actions">
                    <button class="record-edit" onclick="App.editRecord('motor','${r.id}')">✏️</button>
                    <button class="record-delete" onclick="App.deleteRecord('motor','${r.id}')">🗑</button>
                </div>
            </div>
        `).join('');
    },

    // ===== 日记 =====
    renderDiary() {
        const records = Storage.getAll('diary').sort((a, b) => new Date(b.date) - new Date(a.date));
        const container = document.getElementById('diaryList');
        if (records.length === 0) {
            container.innerHTML = '<div class="empty-state">记录宝宝每天的小故事</div>';
            return;
        }
        const moodMap = { happy: '😊', excited: '🤩', calm: '😌', sad: '😢', cry: '😭', sick: '🤒' };
        container.innerHTML = records.map(r => `
            <div class="diary-card">
                <div class="diary-header">
                    <div class="diary-date">${Utils.formatDateFull(r.date)} ${r.time || ''}</div>
                    <div class="diary-mood">${moodMap[r.mood] || '📝'}</div>
                </div>
                <div class="diary-content">${this.escape(r.content || '')}</div>
                ${r.images && r.images.length > 0 ? `
                    <div class="diary-images" style="display:grid;grid-template-columns:repeat(3,1fr);gap:6px;margin-top:10px">
                        ${r.images.map(img => `<div class="diary-image" style="aspect-ratio:1;border-radius:8px;overflow:hidden;cursor:pointer" onclick="App.viewDiaryImage('${img.replace(/'/g, "\\'")}')}"><img src="${img}" style="width:100%;height:100%;object-fit:cover"></div>`).join('')}
                    </div>
                ` : ''}
                <div class="record-actions">
                    <button class="record-edit" onclick="App.editRecord('diary','${r.id}')">✏️</button>
                    <button class="record-delete" onclick="App.deleteRecord('diary','${r.id}')">🗑</button>
                </div>
            </div>
        `).join('');
    },

    // ===== 删除记录 =====
    deleteRecord(type, id) {
        if (!confirm('确定删除这条记录吗？')) return;
        Storage.delete(type, id);
        this.renderAll();
        // 刷新当前页面
        const activePage = document.querySelector('.page.active').id.replace('page-', '');
        this.switchPage(activePage);
        this.toast('已删除');
    },

    editRecord(type, id) {
        if (type === 'shopping') { this.editShopping(id); return; }
        const db = Storage.load();
        const record = (db[type] || []).find(r => r.id === id);
        if (!record) return;

        // 构建通用编辑表单
        let fields = '';
        for (const [key, value] of Object.entries(record)) {
            if (['id', 'createdAt'].includes(key)) continue;
            const label = this.getFieldLabel(key);
            if (!label) continue;

            if (key === 'note' || key === 'reaction' || key === 'symptom' || key === 'diagnosis' || key === 'prescription' ||
                key === 'result' || key === 'advice' || key === 'content' || key === 'description' || key === 'reaction') {
                fields += `<div class="form-group"><label class="form-label">${label}</label><textarea class="form-textarea" id="edit_${key}">${this.escape(value || '')}</textarea></div>`;
            } else if (key === 'date') {
                fields += `<div class="form-group"><label class="form-label">${label} <span class="required">*</span></label><input type="date" class="form-input" id="edit_${key}" value="${value || ''}"></div>`;
            } else {
                fields += `<div class="form-group"><label class="form-label">${label}</label><input type="text" class="form-input" id="edit_${key}" value="${this.escape(value || '')}"></div>`;
            }
        }

        this.showModal('编辑记录', fields, () => {
            const updates = {};
            for (const [key] of Object.entries(record)) {
                if (['id', 'createdAt'].includes(key)) continue;
                const el = document.getElementById('edit_' + key);
                if (el) updates[key] = el.value;
            }
            Storage.update(type, id, updates);
            this.renderAll();
            const activePage = document.querySelector('.page.active').id.replace('page-', '');
            this.switchPage(activePage);
            this.toast('记录已更新');
        });
    },

    getFieldLabel(key) {
        const labels = {
            date: '日期', time: '时间', startTime: '开始时间', endTime: '结束时间',
            duration: '时长', type: '类型', amount: '数量', unit: '单位',
            vaccineName: '疫苗名称', dose: '剂次', location: '地点', batchNo: '批号',
            reaction: '接种反应', cost: '费用', doctor: '医生', hospital: '医院',
            department: '科室', symptom: '症状', diagnosis: '诊断', prescription: '处方',
            note: '备注', age: '月龄', height: '身高(cm)', weight: '体重(kg)',
            headCircumference: '头围(cm)', fontanelle: '前囟门(cm)', result: '结果',
            advice: '建议', drugName: '药品名称', dosage: '剂量', frequency: '频率',
            food: '食物', method: '方式', content: '内容', title: '标题',
            milestone: '里程碑', skill: '技能', description: '描述', date: '日期',
            item: '物品名称', price: '价格', rating: '评分', store: '购买渠道',
            songName: '歌曲名称', category: '分类', medicineName: '药品名称',
            exerciseType: '运动类型', activity: '活动类型', sleepType: '睡眠类型',
            feedType: '喂养类型', bookName: '书名', diaperType: '尿布状态',
            quality: '睡眠质量', mood: '心情', weather: '天气'
        };
        return labels[key] || key;
    },

    // ===== 模态框 =====
    showModal(title, bodyHTML, callback) {
        document.getElementById('modalTitle').textContent = title;
        document.getElementById('modalBody').innerHTML = bodyHTML;
        document.getElementById('modalOverlay').classList.add('active');
        this.modalCallback = callback;
    },

    closeModal() {
        document.getElementById('modalOverlay').classList.remove('active');
        this.modalCallback = null;
    },

    confirmModal() {
        if (this.modalCallback) {
            const result = this.modalCallback();
            if (result !== false) this.closeModal();
        }
    },

    // ===== 宝宝信息表单 =====
    showBabyInfoForm(isFirst = false) {
        const db = Storage.load();
        const body = `
            <div class="form-group">
                <label class="form-label">宝宝昵称 <span class="required">*</span></label>
                <input type="text" class="form-input" id="babyNameInput" value="${this.escape(db.baby.name)}" placeholder="宝宝小名">
            </div>
            <div class="form-group">
                <label class="form-label">出生日期 <span class="required">*</span></label>
                <input type="date" class="form-input" id="babyBirthInput" value="${db.baby.birthDate}">
            </div>
            <div class="form-group">
                <label class="form-label">性别</label>
                <div class="form-chips" id="genderChips">
                    <div class="form-chip ${db.baby.gender === 'male' ? 'active' : ''}" data-value="male">👦 男宝</div>
                    <div class="form-chip ${db.baby.gender === 'female' ? 'active' : ''}" data-value="female">👧 女宝</div>
                </div>
            </div>
            <div class="form-group">
                <label class="form-label">头像</label>
                <div style="display:flex;align-items:center;gap:12px">
                    <div id="avatarPreview" style="width:56px;height:56px;border-radius:50%;background-size:cover;background-position:center;display:flex;align-items:center;justify-content:center;font-size:28px;border:2px solid #eee;overflow:hidden">${db.baby.avatar && db.baby.avatar.startsWith('data:image/') ? `<img src="${db.baby.avatar}" style="width:100%;height:100%;object-fit:cover">` : (db.baby.avatar || '👶')}</div>
                    <button type="button" class="btn btn-outline" id="uploadAvatarBtn" style="padding:8px 16px;font-size:13px">📷 从相册选择</button>
                </div>
                <input type="file" id="avatarFileInput2" accept="image/*" style="display:none">
            </div>
            <div class="form-group">
                <label class="form-label">或选择表情</label>
                <div class="form-chips" id="avatarChips">
                    ${['👶','🧒','👧','👦','😇','🥰','🌟','🐰'].map(a =>
                        `<div class="form-chip ${db.baby.avatar === a ? 'active' : ''}" data-value="${a}" style="font-size:20px">${a}</div>`
                    ).join('')}
                </div>
            </div>
        `;

        this.showModal(isFirst ? '设置宝宝信息' : '修改宝宝信息', body, () => {
            const name = document.getElementById('babyNameInput').value.trim();
            const birthDate = document.getElementById('babyBirthInput').value;
            if (!name) { this.toast('请输入宝宝昵称'); return false; }
            if (!birthDate) { this.toast('请选择出生日期'); return false; }

            const gender = document.querySelector('#genderChips .active')?.dataset.value || '';
            // 优先取上传的照片，否则取选中的表情
            let avatar = window._avatarDataUrl || '';
            if (!avatar) {
                avatar = document.querySelector('#avatarChips .active')?.dataset.value || '👶';
            }

            Storage.updateBaby({ name, birthDate, gender, avatar });
            this.renderBabyInfo();
            this.renderDashboard();
            this.toast('保存成功');
            window._avatarDataUrl = null;
        });

        // 上传按钮事件
        setTimeout(() => {
            const uploadBtn = document.getElementById('uploadAvatarBtn');
            const fileInput2 = document.getElementById('avatarFileInput2');
            const preview = document.getElementById('avatarPreview');
            if (uploadBtn && fileInput2) {
                uploadBtn.addEventListener('click', () => fileInput2.click());
                fileInput2.addEventListener('change', (e) => {
                    const file = e.target.files[0];
                    if (!file) return;
                    if (file.size > 2 * 1024 * 1024) { this.toast('图片不能超过2MB'); return; }
                    const reader = new FileReader();
                    reader.onload = (ev) => {
                        window._avatarDataUrl = ev.target.result;
                        preview.innerHTML = `<img src="${ev.target.result}" style="width:100%;height:100%;object-fit:cover">`;
                        // 清除表情选中
                        document.querySelectorAll('#avatarChips .active').forEach(c => c.classList.remove('active'));
                    };
                    reader.readAsDataURL(file);
                });
            }
        }, 100);

        // 绑定chip选择
        this.bindChips('genderChips');
        this.bindChips('avatarChips');
    },

    // ===== 设置 =====
    showSettings() {
        const db = Storage.load();
        const body = `
            <div class="settings-section">
                <div class="settings-section-title">宝宝头像</div>
                <div style="display:flex;align-items:center;gap:12px;margin-bottom:8px">
                    <div id="settingsAvatarPreview" style="width:60px;height:60px;border-radius:50%;background:#f0f0f0;display:flex;align-items:center;justify-content:center;font-size:30px;overflow:hidden;border:2px solid #eee">${db.baby.avatar && db.baby.avatar.startsWith('data:image/') ? `<img src="${db.baby.avatar}" style="width:100%;height:100%;object-fit:cover">` : (db.baby.avatar || '👶')}</div>
                    <button type="button" class="btn btn-outline" id="settingsAvatarUpload" style="padding:8px 16px;font-size:13px">📷 选择照片</button>
                    <input type="file" id="settingsAvatarInput" accept="image/*" style="display:none">
                </div>
            </div>
            <div class="settings-section">
                <div class="settings-section-title">作息目标</div>
                <div class="form-group">
                    <label class="form-label">每日故事时间</label>
                    <input type="time" class="form-input" id="storyTimeInput" value="${db.settings.storyTime}">
                </div>
                <div class="form-group">
                    <label class="form-label">每日户外目标（分钟）</label>
                    <input type="number" class="form-input" id="outdoorGoalInput" value="${db.settings.outdoorGoal}" min="0" max="600">
                </div>
                <div class="form-group">
                    <label class="form-label">每日睡眠目标（小时）</label>
                    <input type="number" class="form-input" id="sleepGoalInput" value="${db.settings.sleepGoal}" min="0" max="24" step="0.5">
                </div>
            </div>
            <div class="settings-section">
                <div class="settings-section-title">数据管理</div>
                ${this.checkBackupReminder() ? '<div class="backup-reminder">⚠️ 已超过7天未备份数据，建议及时导出备份</div>' : ''}
                <button class="add-btn" onclick="App.exportData()" style="background:#B5EAD7;color:#333">📤 导出数据</button>
                <button class="add-btn" onclick="App.exportReport()" style="background:#FFD6E0;color:#333">📋 生成成长报告</button>
                <button class="add-btn" onclick="App.importData()" style="background:#C7CEEA;color:#333">📥 导入数据</button>
                <button class="danger-btn" onclick="App.clearAllData()">🗑 清空所有数据</button>
            </div>
            <div class="settings-section" style="text-align:center;margin-top:20px">
                <div style="color:var(--text-lighter);font-size:12px">
                    宝宝成长记 v1.0<br>用心记录每一刻成长 ❤️
                </div>
            </div>
        `;

        this.showModal('设置', body, () => {
            // 检查是否有新上传的头像
            if (window._avatarDataUrl) {
                const db = Storage.load();
                db.baby.avatar = window._avatarDataUrl;
                Storage.save(db);
                this.renderBabyInfo();
                window._avatarDataUrl = null;
            }
            const storyTime = document.getElementById('storyTimeInput').value;
            const outdoorGoal = parseInt(document.getElementById('outdoorGoalInput').value) || 120;
            const sleepGoal = parseFloat(document.getElementById('sleepGoalInput').value) || 14;
            Storage.updateSettings({ storyTime, outdoorGoal, sleepGoal });
            this.toast('设置已保存');
        });

        // 设置弹窗里的头像上传
        setTimeout(() => {
            const settingsUpload = document.getElementById('settingsAvatarUpload');
            const settingsInput = document.getElementById('settingsAvatarInput');
            const settingsPreview = document.getElementById('settingsAvatarPreview');
            if (settingsUpload && settingsInput) {
                settingsUpload.addEventListener('click', () => settingsInput.click());
                settingsInput.addEventListener('change', (e) => {
                    const file = e.target.files[0];
                    if (!file) return;
                    if (file.size > 2 * 1024 * 1024) { this.toast('图片不能超过2MB'); return; }
                    const reader = new FileReader();
                    reader.onload = (ev) => {
                        window._avatarDataUrl = ev.target.result;
                        if (settingsPreview) {
                            settingsPreview.innerHTML = `<img src="${ev.target.result}" style="width:100%;height:100%;object-fit:cover;border-radius:50%">`;
                        }
                    };
                    reader.readAsDataURL(file);
                });
            }
        }, 100);
    },

    exportData() {
        const data = Storage.export();
        const blob = new Blob([data], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `baby-tracker-${Utils.todayStr()}.json`;
        a.click();
        URL.revokeObjectURL(url);
        this.updateBackupDate();
        this.toast('数据已导出');
    },

    importData() {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.json';
        input.onchange = (e) => {
            const file = e.target.files[0];
            if (!file) return;
            const reader = new FileReader();
            reader.onload = (ev) => {
                try {
                    Storage.import(ev.target.result);
                    this.renderAll();
                    this.renderDashboard();
                    this.closeModal();
                    this.toast('数据导入成功');
                } catch (err) {
                    this.toast('导入失败：文件格式错误');
                }
            };
            reader.readAsText(file);
        };
        input.click();
    },

    clearAllData() {
        if (!confirm('⚠️ 确定清空所有数据吗？此操作不可恢复！')) return;
        if (!confirm('再次确认：所有记录将被永久删除！')) return;
        Storage.clear();
        location.reload();
    },

    // ===== 添加表单 =====
    showAddForm(type) {
        const forms = {
            medical: () => this.formMedical(),
            vaccine: () => this.formVaccine(),
            checkup: () => this.formCheckup(),
            medication: () => this.formMedication(),
            growth: () => this.formGrowth(),
            milestone: () => this.formMilestone(),
            motor: () => this.formMotor(),
            diary: () => this.formDiary(),
            shopping: () => this.formShopping()
        };
        if (forms[type]) forms[type]();
    },

    showDailyAddForm(type) {
        const forms = {
            feeding: () => this.formFeeding(),
            sleep: () => this.formSleep(),
            diaper: () => this.formDiaper(),
            bath: () => this.formBath()
        };
        if (forms[type]) forms[type]();
    },

    formMedical() {
        const body = `
            <div class="form-row">
                <div class="form-group">
                    <label class="form-label">就诊日期 <span class="required">*</span></label>
                    <input type="date" class="form-input" id="medDate" value="${Utils.todayStr()}">
                </div>
                <div class="form-group">
                    <label class="form-label">医院</label>
                    <input type="text" class="form-input" id="medHospital" placeholder="医院名称">
                </div>
            </div>
            <div class="form-group">
                <label class="form-label">科室</label>
                <input type="text" class="form-input" id="medDept" placeholder="如：儿科、皮肤科">
            </div>
            <div class="form-group">
                <label class="form-label">症状</label>
                <textarea class="form-textarea" id="medSymptom" placeholder="宝宝有什么症状"></textarea>
            </div>
            <div class="form-group">
                <label class="form-label">诊断结果</label>
                <textarea class="form-textarea" id="medDiagnosis" placeholder="医生诊断"></textarea>
            </div>
            <div class="form-group">
                <label class="form-label">处方/检查</label>
                <textarea class="form-textarea" id="medPrescription" placeholder="用药或检查项目"></textarea>
            </div>
            <div class="form-row">
                <div class="form-group">
                    <label class="form-label">医生</label>
                    <input type="text" class="form-input" id="medDoctor" placeholder="医生姓名">
                </div>
                <div class="form-group">
                    <label class="form-label">费用</label>
                    <input type="number" class="form-input" id="medCost" placeholder="元">
                </div>
            </div>
            <div class="form-group">
                <label class="form-label">备注</label>
                <textarea class="form-textarea" id="medNote" placeholder="其他需要记录的"></textarea>
            </div>
        `;

        this.showModal('就医记录', body, () => {
            const date = document.getElementById('medDate').value;
            if (!date) { this.toast('请选择日期'); return false; }
            Storage.add('medical', {
                date,
                hospital: this.val('medHospital'),
                department: this.val('medDept'),
                symptom: this.val('medSymptom'),
                diagnosis: this.val('medDiagnosis'),
                prescription: this.val('medPrescription'),
                doctor: this.val('medDoctor'),
                cost: this.val('medCost'),
                note: this.val('medNote')
            });
            this.renderHealth();
            this.toast('就医记录已添加');
        });
    },

    formVaccine() {
        const commonVaccines = ['乙肝疫苗','卡介苗','脊灰疫苗','百白破','麻腮风','甲肝疫苗','流脑疫苗','乙脑疫苗','水痘疫苗','流感疫苗','HPV疫苗','轮状病毒疫苗','肺炎疫苗','手足口疫苗'];
        const body = `
            <div class="form-row">
                <div class="form-group">
                    <label class="form-label">接种日期 <span class="required">*</span></label>
                    <input type="date" class="form-input" id="vacDate" value="${Utils.todayStr()}">
                </div>
                <div class="form-group">
                    <label class="form-label">剂次</label>
                    <input type="text" class="form-input" id="vacDose" placeholder="如：第1剂">
                </div>
            </div>
            <div class="form-group">
                <label class="form-label">疫苗名称 <span class="required">*</span></label>
                <div class="form-chips" id="vacChips">
                    ${commonVaccines.map(v => `<div class="form-chip" data-value="${v}">${v}</div>`).join('')}
                </div>
                <input type="text" class="form-input" id="vacName" style="margin-top:8px" placeholder="或手动输入疫苗名称">
            </div>
            <div class="form-group">
                <label class="form-label">接种地点</label>
                <input type="text" class="form-input" id="vacLocation" placeholder="接种点">
            </div>
            <div class="form-row">
                <div class="form-group">
                    <label class="form-label">批号</label>
                    <input type="text" class="form-input" id="vacBatch" placeholder="疫苗批号">
                </div>
                <div class="form-group">
                    <label class="form-label">费用</label>
                    <input type="number" class="form-input" id="vacCost" placeholder="元">
                </div>
            </div>
            <div class="form-group">
                <label class="form-label">接种后反应</label>
                <textarea class="form-textarea" id="vacReaction" placeholder="如：无反应、轻微发热等"></textarea>
            </div>
        `;

        this.showModal('疫苗记录', body, () => {
            const date = document.getElementById('vacDate').value;
            const chipVal = document.querySelector('#vacChips .active')?.dataset.value;
            const name = this.val('vacName') || chipVal;
            if (!date) { this.toast('请选择日期'); return false; }
            if (!name) { this.toast('请输入或选择疫苗名称'); return false; }
            Storage.add('vaccine', {
                date,
                vaccineName: name,
                dose: this.val('vacDose'),
                location: this.val('vacLocation'),
                batchNo: this.val('vacBatch'),
                cost: this.val('vacCost'),
                reaction: this.val('vacReaction')
            });
            this.renderHealth();
            this.toast('疫苗记录已添加');
        });

        this.bindChips('vacChips', (val) => {
            document.getElementById('vacName').value = val;
        });
    },

    formCheckup() {
        const body = `
            <div class="form-row">
                <div class="form-group">
                    <label class="form-label">体检日期 <span class="required">*</span></label>
                    <input type="date" class="form-input" id="chkDate" value="${Utils.todayStr()}">
                </div>
                <div class="form-group">
                    <label class="form-label">月龄</label>
                    <input type="text" class="form-input" id="chkAge" placeholder="如：6个月">
                </div>
            </div>
            <div class="form-row">
                <div class="form-group">
                    <label class="form-label">身高(cm)</label>
                    <input type="number" class="form-input" id="chkHeight" placeholder="0.0" step="0.1">
                </div>
                <div class="form-group">
                    <label class="form-label">体重(kg)</label>
                    <input type="number" class="form-input" id="chkWeight" placeholder="0.0" step="0.1">
                </div>
            </div>
            <div class="form-row">
                <div class="form-group">
                    <label class="form-label">头围(cm)</label>
                    <input type="number" class="form-input" id="chkHead" placeholder="0.0" step="0.1">
                </div>
                <div class="form-group">
                    <label class="form-label">前囟门(cm)</label>
                    <input type="number" class="form-input" id="chkFontanelle" placeholder="0.0" step="0.1">
                </div>
            </div>
            <div class="form-group">
                <label class="form-label">体检结果</label>
                <textarea class="form-textarea" id="chkResult" placeholder="医生检查结果"></textarea>
            </div>
            <div class="form-group">
                <label class="form-label">医生建议</label>
                <textarea class="form-textarea" id="chkAdvice" placeholder="育儿建议"></textarea>
            </div>
        `;

        this.showModal('儿保体检', body, () => {
            const date = document.getElementById('chkDate').value;
            if (!date) { this.toast('请选择日期'); return false; }
            const height = this.val('chkHeight');
            const weight = this.val('chkWeight');
            const headCircumference = this.val('chkHead');
            Storage.add('checkup', {
                date,
                age: this.val('chkAge'),
                height, weight, headCircumference,
                fontanelle: this.val('chkFontanelle'),
                result: this.val('chkResult'),
                advice: this.val('chkAdvice')
            });
            // 同时添加到成长数据
            if (height || weight) {
                Storage.add('growth', { date, height, weight, headCircumference, note: '儿保体检记录' });
            }
            this.renderGrowth();
            this.renderHealth();
            this.toast('体检记录已添加');
        });
    },

    formMedication() {
        const body = `
            <div class="form-row">
                <div class="form-group">
                    <label class="form-label">用药日期 <span class="required">*</span></label>
                    <input type="date" class="form-input" id="med2Date" value="${Utils.todayStr()}">
                </div>
                <div class="form-group">
                    <label class="form-label">药品名称 <span class="required">*</span></label>
                    <input type="text" class="form-input" id="med2Name" placeholder="药品名称">
                </div>
            </div>
            <div class="form-row">
                <div class="form-group">
                    <label class="form-label">用量</label>
                    <input type="text" class="form-input" id="med2Dosage" placeholder="如：2ml/次">
                </div>
                <div class="form-group">
                    <label class="form-label">频次</label>
                    <input type="text" class="form-input" id="med2Freq" placeholder="如：每日3次">
                </div>
            </div>
            <div class="form-group">
                <label class="form-label">用药原因</label>
                <input type="text" class="form-input" id="med2Reason" placeholder="如：感冒发热">
            </div>
            <div class="form-group">
                <label class="form-label">备注</label>
                <textarea class="form-textarea" id="med2Note" placeholder="用药注意事项等"></textarea>
            </div>
        `;

        this.showModal('用药记录', body, () => {
            const date = document.getElementById('med2Date').value;
            const name = this.val('med2Name');
            if (!date) { this.toast('请选择日期'); return false; }
            if (!name) { this.toast('请输入药品名称'); return false; }
            Storage.add('medication', {
                date,
                medicineName: name,
                dosage: this.val('med2Dosage'),
                frequency: this.val('med2Freq'),
                reason: this.val('med2Reason'),
                note: this.val('med2Note')
            });
            this.renderHealth();
            this.toast('用药记录已添加');
        });
    },

    formFeeding() {
        const body = `
            <div class="form-row">
                <div class="form-group">
                    <label class="form-label">日期</label>
                    <input type="date" class="form-input" id="feedDate" value="${this.currentDate}">
                </div>
                <div class="form-group">
                    <label class="form-label">时间</label>
                    <input type="time" class="form-input" id="feedTime" value="${Utils.nowTime()}">
                </div>
            </div>
            <div class="form-group">
                <label class="form-label">喂养类型</label>
                <div class="form-chips" id="feedTypeChips">
                    <div class="form-chip active" data-value="breast">🤱 母乳</div>
                    <div class="form-chip" data-value="formula">🍼 配方奶</div>
                    <div class="form-chip" data-value="solid">🥣 辅食</div>
                    <div class="form-chip" data-value="water">💧 喝水</div>
                    <div class="form-chip" data-value="snack">🍪 零食</div>
                </div>
            </div>
            <div class="form-group" id="amountGroup">
                <label class="form-label">量</label>
                <div class="form-row">
                    <input type="number" class="form-input" id="feedAmount" placeholder="0" step="0.1">
                    <select class="form-input" id="feedUnit" style="max-width:80px">
                        <option value="ml">ml</option>
                        <option value="g">g</option>
                        <option value="粒">粒</option>
                        <option value="份">份</option>
                    </select>
                </div>
            </div>
            <div class="form-group" id="durationGroup" style="display:none">
                <label class="form-label">喂养时长（分钟）</label>
                <input type="number" class="form-input" id="feedDuration" placeholder="0">
            </div>
            <div class="form-group" id="foodNameGroup" style="display:none">
                <label class="form-label">食物名称</label>
                <input type="text" class="form-input" id="feedFoodName" placeholder="如：胡萝卜泥、米粉">
            </div>
            <div class="form-group">
                <label class="form-label">备注</label>
                <textarea class="form-textarea" id="feedNote" placeholder="如：吃得很香、不太想吃等"></textarea>
            </div>
        `;

        this.showModal('记录喂养', body, () => {
            const date = document.getElementById('feedDate').value;
            const time = document.getElementById('feedTime').value;
            const feedType = document.querySelector('#feedTypeChips .active')?.dataset.value;
            Storage.add('feeding', {
                date, time, feedType,
                amount: this.val('feedAmount'),
                unit: document.getElementById('feedUnit').value,
                duration: this.val('feedDuration'),
                foodName: this.val('feedFoodName'),
                note: this.val('feedNote')
            });
            this.renderDaily();
            this.renderDashboard();
            this.toast('喂养记录已添加');
        });

        this.bindChips('feedTypeChips', (val) => {
            document.getElementById('amountGroup').style.display = (val === 'breast') ? 'none' : 'block';
            document.getElementById('durationGroup').style.display = (val === 'breast') ? 'block' : 'none';
            document.getElementById('foodNameGroup').style.display = (val === 'solid' || val === 'snack') ? 'block' : 'none';
        });
    },

    formSleep() {
        const body = `
            <div class="form-row">
                <div class="form-group">
                    <label class="form-label">日期</label>
                    <input type="date" class="form-input" id="sleepDate" value="${this.currentDate}">
                </div>
                <div class="form-group">
                    <label class="form-label">开始时间</label>
                    <input type="time" class="form-input" id="sleepTime" value="${Utils.nowTime()}">
                </div>
            </div>
            <div class="form-group">
                <label class="form-label">睡眠类型</label>
                <div class="form-chips" id="sleepTypeChips">
                    <div class="form-chip active" data-value="night">🌙 夜间睡眠</div>
                    <div class="form-chip" data-value="nap">☀️ 白天小睡</div>
                </div>
            </div>
            <div class="form-group">
                <label class="form-label">睡眠时长（分钟）</label>
                <div class="form-counter">
                    <button class="counter-btn" onclick="App.counter('sleepDuration',-15)">−</button>
                    <input type="number" class="counter-value" id="sleepDuration" value="60" style="text-align:center;border:none;font-size:20px;font-weight:700;width:80px">
                    <button class="counter-btn" onclick="App.counter('sleepDuration',15)">+</button>
                </div>
            </div>
            <div class="form-group">
                <label class="form-label">睡眠质量</label>
                <div class="form-chips" id="sleepQualityChips" data-multi="true">
                    <div class="form-chip" data-value="很好">😊 很好</div>
                    <div class="form-chip active" data-value="一般">😐 一般</div>
                    <div class="form-chip" data-value="不安">😰 不安</div>
                    <div class="form-chip" data-value="易醒">😢 易醒</div>
                </div>
            </div>
            <div class="form-group">
                <label class="form-label">备注</label>
                <textarea class="form-textarea" id="sleepNote" placeholder="如：入睡快、需要安抚等"></textarea>
            </div>
        `;

        this.showModal('记录睡眠', body, () => {
            Storage.add('sleep', {
                date: document.getElementById('sleepDate').value,
                time: document.getElementById('sleepTime').value,
                sleepType: document.querySelector('#sleepTypeChips .active')?.dataset.value,
                duration: this.val('sleepDuration'),
                quality: this.getMultiChipValues('sleepQualityChips'),
                note: this.val('sleepNote')
            });
            this.renderDaily();
            this.renderDashboard();
            this.toast('睡眠记录已添加');
        });

        this.bindChips('sleepTypeChips');
        this.bindChips('sleepQualityChips');
    },

    formOutdoor() {
        const body = `
            <div class="form-row">
                <div class="form-group">
                    <label class="form-label">日期</label>
                    <input type="date" class="form-input" id="outDate" value="${this.currentDate}">
                </div>
                <div class="form-group">
                    <label class="form-label">时间</label>
                    <input type="time" class="form-input" id="outTime" value="${Utils.nowTime()}">
                </div>
            </div>
            <div class="form-group">
                <label class="form-label">活动类型</label>
                <div class="form-chips" id="outActivityChips" data-multi="true">
                    <div class="form-chip active" data-value="散步">🚶 散步</div>
                    <div class="form-chip" data-value="晒太阳">☀️ 晒太阳</div>
                    <div class="form-chip" data-value="公园">🌳 公园</div>
                    <div class="form-chip" data-value="游乐场">🎡 游乐场</div>
                    <div class="form-chip" data-value="玩耍">⚽ 玩耍</div>
                </div>
            </div>
            <div class="form-group">
                <label class="form-label">活动时长（分钟）</label>
                <div class="form-counter">
                    <button class="counter-btn" onclick="App.counter('outDuration',-15)">−</button>
                    <input type="number" class="counter-value" id="outDuration" value="30" style="text-align:center;border:none;font-size:20px;font-weight:700;width:80px">
                    <button class="counter-btn" onclick="App.counter('outDuration',15)">+</button>
                </div>
            </div>
            <div class="form-row">
                <div class="form-group">
                    <label class="form-label">地点</label>
                    <input type="text" class="form-input" id="outLocation" placeholder="如：小区花园">
                </div>
                <div class="form-group">
                    <label class="form-label">天气</label>
                    <select class="form-input" id="outWeather">
                        <option value="">选择天气</option>
                        <option value="☀️ 晴">☀️ 晴</option>
                        <option value="⛅ 多云">⛅ 多云</option>
                        <option value="☁️ 阴">☁️ 阴</option>
                        <option value="🌧️ 雨">🌧️ 雨</option>
                        <option value="❄️ 雪">❄️ 雪</option>
                    </select>
                </div>
            </div>
            <div class="form-group">
                <label class="form-label">备注</label>
                <textarea class="form-textarea" id="outNote" placeholder="如：玩得很开心"></textarea>
            </div>
        `;

        this.showModal('记录户外活动', body, () => {
            Storage.add('outdoor', {
                date: document.getElementById('outDate').value,
                time: document.getElementById('outTime').value,
                activity: this.getMultiChipValues('outActivityChips'),
                duration: this.val('outDuration'),
                location: this.val('outLocation'),
                weather: document.getElementById('outWeather').value,
                note: this.val('outNote')
            });
            this.renderEarly();
            this.renderDashboard();
            this.toast('户外活动已记录');
        });

        this.bindChips('outActivityChips');
    },

    formStory() {
        const settings = Storage.load().settings;
        const body = `
            <div class="form-row">
                <div class="form-group">
                    <label class="form-label">日期</label>
                    <input type="date" class="form-input" id="storyDate" value="${this.currentDate}">
                </div>
                <div class="form-group">
                    <label class="form-label">时间</label>
                    <input type="time" class="form-input" id="storyTime" value="${settings.storyTime}">
                </div>
            </div>
            <div class="form-group">
                <label class="form-label">书名/故事名</label>
                <input type="text" class="form-input" id="storyName" placeholder="如：好饿的毛毛虫">
            </div>
            <div class="form-group">
                <label class="form-label">阅读时长（分钟）</label>
                <div class="form-counter">
                    <button class="counter-btn" onclick="App.counter('storyDuration',-5)">−</button>
                    <input type="number" class="counter-value" id="storyDuration" value="15" style="text-align:center;border:none;font-size:20px;font-weight:700;width:80px">
                    <button class="counter-btn" onclick="App.counter('storyDuration',5)">+</button>
                </div>
            </div>
            <div class="form-group">
                <label class="form-label">故事内容</label>
                <textarea class="form-textarea" id="storyContent" placeholder="讲了什么故事"></textarea>
            </div>
            <div class="form-group">
                <label class="form-label">宝宝反应</label>
                <div class="form-chips" id="storyReactionChips" data-multi="true">
                    <div class="form-chip active" data-value="很喜欢">🥰 很喜欢</div>
                    <div class="form-chip" data-value="一般">😐 一般</div>
                    <div class="form-chip" data-value="不感兴趣">😐 不感兴趣</div>
                    <div class="form-chip" data-value="听睡着">💤 听睡着</div>
                </div>
            </div>
            <div class="form-group">
                <label class="form-label">备注</label>
                <textarea class="form-textarea" id="storyNote" placeholder="其他记录"></textarea>
            </div>
        `;

        this.showModal('记录故事时间', body, () => {
            Storage.add('story', {
                date: document.getElementById('storyDate').value,
                time: document.getElementById('storyTime').value,
                bookName: this.val('storyName'),
                duration: this.val('storyDuration'),
                content: this.val('storyContent'),
                reaction: this.getMultiChipValues('storyReactionChips'),
                note: this.val('storyNote')
            });
            this.renderEarly();
            this.renderDashboard();
            this.toast('故事时间已记录');
        });

        this.bindChips('storyReactionChips');
    },

    formDiaper() {
        const body = `
            <div class="form-row">
                <div class="form-group">
                    <label class="form-label">日期</label>
                    <input type="date" class="form-input" id="diaDate" value="${this.currentDate}">
                </div>
                <div class="form-group">
                    <label class="form-label">时间</label>
                    <input type="time" class="form-input" id="diaTime" value="${Utils.nowTime()}">
                </div>
            </div>
            <div class="form-group">
                <label class="form-label">尿布状态</label>
                <div class="form-chips" id="diaTypeChips" data-multi="true">
                    <div class="form-chip active" data-value="wet">💧 湿</div>
                    <div class="form-chip" data-value="dirty">💩 脏</div>
                    <div class="form-chip" data-value="both">💧💩 都有</div>
                    <div class="form-chip" data-value="dry">✅ 干爽</div>
                </div>
            </div>
            <div class="form-group">
                <label class="form-label">备注</label>
                <textarea class="form-textarea" id="diaNote" placeholder="如：便便颜色、状态等"></textarea>
            </div>
        `;

        this.showModal('记录尿布', body, () => {
            Storage.add('diaper', {
                date: document.getElementById('diaDate').value,
                time: document.getElementById('diaTime').value,
                diaperType: document.querySelector('#diaTypeChips .active')?.dataset.value,
                note: this.val('diaNote')
            });
            this.renderDaily();
            this.renderDashboard();
            this.toast('尿布记录已添加');
        });

        this.bindChips('diaTypeChips');
    },

    formBath() {
        const body = `
            <div class="form-row">
                <div class="form-group">
                    <label class="form-label">日期</label>
                    <input type="date" class="form-input" id="bathDate" value="${this.currentDate}">
                </div>
                <div class="form-group">
                    <label class="form-label">时间</label>
                    <input type="time" class="form-input" id="bathTime" value="${Utils.nowTime()}">
                </div>
            </div>
            <div class="form-group">
                <label class="form-label">洗澡时长（分钟）</label>
                <div class="form-counter">
                    <button class="counter-btn" onclick="App.counter('bathDuration',-5)">−</button>
                    <input type="number" class="counter-value" id="bathDuration" value="10" style="text-align:center;border:none;font-size:20px;font-weight:700;width:80px">
                    <button class="counter-btn" onclick="App.counter('bathDuration',5)">+</button>
                </div>
            </div>
            <div class="form-group">
                <label class="form-label">备注</label>
                <textarea class="form-textarea" id="bathNote" placeholder="如：水温、宝宝状态等"></textarea>
            </div>
        `;

        this.showModal('记录洗澡', body, () => {
            Storage.add('bath', {
                date: document.getElementById('bathDate').value,
                time: document.getElementById('bathTime').value,
                duration: this.val('bathDuration'),
                note: this.val('bathNote')
            });
            this.renderDaily();
            this.renderDashboard();
            this.toast('洗澡记录已添加');
        });
    },

    formExercise() {
        const body = `
            <div class="form-row">
                <div class="form-group">
                    <label class="form-label">日期</label>
                    <input type="date" class="form-input" id="exDate" value="${this.currentDate}">
                </div>
                <div class="form-group">
                    <label class="form-label">时间</label>
                    <input type="time" class="form-input" id="exTime" value="${Utils.nowTime()}">
                </div>
            </div>
            <div class="form-group">
                <label class="form-label">运动项目</label>
                <div class="form-chips" id="exTypeChips" data-multi="true">
                    <div class="form-chip active" data-value="趴卧">👶 趴卧练习</div>
                    <div class="form-chip" data-value="翻身">🤸 翻身练习</div>
                    <div class="form-chip" data-value="爬行">👣 爬行</div>
                    <div class="form-chip" data-value="被动操">💪 被动操</div>
                    <div class="form-chip" data-value="游泳">🏊 游泳</div>
                    <div class="form-chip" data-value="抓握">✋ 抓握练习</div>
                </div>
            </div>
            <div class="form-row">
                <div class="form-group">
                    <label class="form-label">时长（分钟）</label>
                    <div class="form-counter">
                        <button class="counter-btn" onclick="App.counter('exDuration',-5)">−</button>
                        <input type="number" class="counter-value" id="exDuration" value="10" style="text-align:center;border:none;font-size:20px;font-weight:700;width:80px">
                        <button class="counter-btn" onclick="App.counter('exDuration',5)">+</button>
                    </div>
                </div>
            </div>
            <div class="form-group">
                <label class="form-label">备注</label>
                <textarea class="form-textarea" id="exNote" placeholder="如：宝宝状态、进步情况等"></textarea>
            </div>
        `;

        this.showModal('记录运动', body, () => {
            Storage.add('exercise', {
                date: document.getElementById('exDate').value,
                time: document.getElementById('exTime').value,
                exerciseType: this.getMultiChipValues('exTypeChips'),
                duration: this.val('exDuration'),
                note: this.val('exNote')
            });
            this.renderEarly();
            this.renderDashboard();
            this.toast('运动记录已添加');
        });
        this.bindChips('exTypeChips');
    },

    formGrowth() {
        const body = `
            <div class="form-group">
                <label class="form-label">测量日期 <span class="required">*</span></label>
                <input type="date" class="form-input" id="groDate" value="${Utils.todayStr()}">
            </div>
            <div class="form-row">
                <div class="form-group">
                    <label class="form-label">身高(cm)</label>
                    <input type="number" class="form-input" id="groHeight" placeholder="0.0" step="0.1">
                </div>
                <div class="form-group">
                    <label class="form-label">体重(kg)</label>
                    <input type="number" class="form-input" id="groWeight" placeholder="0.0" step="0.1">
                </div>
            </div>
            <div class="form-group">
                <label class="form-label">头围(cm)</label>
                <input type="number" class="form-input" id="groHead" placeholder="0.0" step="0.1">
            </div>
            <div class="form-group">
                <label class="form-label">备注</label>
                <textarea class="form-textarea" id="groNote" placeholder="如：在家测量/医院测量"></textarea>
            </div>
        `;

        this.showModal('记录身高体重', body, () => {
            const date = document.getElementById('groDate').value;
            if (!date) { this.toast('请选择日期'); return false; }
            Storage.add('growth', {
                date,
                height: this.val('groHeight'),
                weight: this.val('groWeight'),
                headCircumference: this.val('groHead'),
                note: this.val('groNote')
            });
            this.renderGrowth();
            this.toast('成长数据已记录');
        });
    },

    formMilestone() {
        const milestones = [
            { type: 'smile', label: '😊 第一次微笑' },
            { type: 'laugh', label: '😄 第一次笑出声' },
            { type: 'rollover', label: '🤸 第一次翻身' },
            { type: 'sit', label: '🪑 第一次独坐' },
            { type: 'crawl', label: '👶 第一次爬行' },
            { type: 'stand', label: '🧍 第一次站立' },
            { type: 'walk', label: '🚶 第一次走路' },
            { type: 'talk', label: '🗣️ 第一次叫爸爸妈妈' },
            { type: 'teeth', label: '🦷 第一颗乳牙' },
            { type: 'other', label: '⭐ 其他里程碑' }
        ];
        const body = `
            <div class="form-group">
                <label class="form-label">日期 <span class="required">*</span></label>
                <input type="date" class="form-input" id="msDate" value="${Utils.todayStr()}">
            </div>
            <div class="form-group">
                <label class="form-label">里程碑类型</label>
                <div class="form-chips" id="msTypeChips">
                    ${milestones.map(m => `<div class="form-chip" data-value="${m.type}" data-label="${m.label}">${m.label}</div>`).join('')}
                </div>
            </div>
            <div class="form-group">
                <label class="form-label">标题</label>
                <input type="text" class="form-input" id="msTitle" placeholder="如：宝宝第一次自己走路">
            </div>
            <div class="form-group">
                <label class="form-label">详细描述</label>
                <textarea class="form-textarea" id="msNote" placeholder="记录这个珍贵的时刻..."></textarea>
            </div>
        `;

        this.showModal('记录里程碑', body, () => {
            const date = document.getElementById('msDate').value;
            if (!date) { this.toast('请选择日期'); return false; }
            const chip = document.querySelector('#msTypeChips .active');
            Storage.add('milestone', {
                date,
                milestoneType: chip?.dataset.value || 'other',
                title: this.val('msTitle') || chip?.dataset.label || '里程碑',
                note: this.val('msNote')
            });
            this.renderGrowth();
            this.toast('里程碑已记录 🎉');
        });

        this.bindChips('msTypeChips', (val, el) => {
            document.getElementById('msTitle').value = el.dataset.label;
        });
    },

    formMotor() {
        const body = `
            <div class="form-group">
                <label class="form-label">日期 <span class="required">*</span></label>
                <input type="date" class="form-input" id="motDate" value="${Utils.todayStr()}">
            </div>
            <div class="form-group">
                <label class="form-label">运动技能</label>
                <input type="text" class="form-input" id="motSkill" placeholder="如：抬头、抓握、翻滚、爬行">
            </div>
            <div class="form-group">
                <label class="form-label">掌握程度</label>
                <div class="form-chips" id="motLevelChips">
                    <div class="form-chip" data-value="初学">🌱 初学</div>
                    <div class="form-chip active" data-value="进步中">📈 进步中</div>
                    <div class="form-chip" data-value="熟练">⭐ 熟练</div>
                </div>
            </div>
            <div class="form-group">
                <label class="form-label">备注</label>
                <textarea class="form-textarea" id="motNote" placeholder="详细描述"></textarea>
            </div>
        `;

        this.showModal('记录运动发展', body, () => {
            const date = document.getElementById('motDate').value;
            if (!date) { this.toast('请选择日期'); return false; }
            Storage.add('motor', {
                date,
                skill: this.val('motSkill'),
                level: document.querySelector('#motLevelChips .active')?.dataset.value,
                note: this.val('motNote')
            });
            this.renderGrowth();
            this.toast('运动发展已记录');
        });

        this.bindChips('motLevelChips');
    },

    formDiary() {
        const body = `
            <div class="form-row">
                <div class="form-group">
                    <label class="form-label">日期</label>
                    <input type="date" class="form-input" id="diaryDate" value="${Utils.todayStr()}">
                </div>
                <div class="form-group">
                    <label class="form-label">时间</label>
                    <input type="time" class="form-input" id="diaryTime" value="${Utils.nowTime()}">
                </div>
            </div>
            <div class="form-group">
                <label class="form-label">今天的心情</label>
                <div class="form-chips" id="diaryMoodChips" data-multi="true">
                    <div class="form-chip active" data-value="happy">😊 开心</div>
                    <div class="form-chip" data-value="excited">🤩 兴奋</div>
                    <div class="form-chip" data-value="calm">😌 平静</div>
                    <div class="form-chip" data-value="sad">😢 难过</div>
                    <div class="form-chip" data-value="cry">😭 哭闹</div>
                    <div class="form-chip" data-value="sick">🤒 不舒服</div>
                </div>
            </div>
            <div class="form-group">
                <label class="form-label">日记内容</label>
                <textarea class="form-textarea" id="diaryContent" style="min-height:120px" placeholder="记录宝宝今天的故事..."></textarea>
            </div>
            <div class="form-group">
                <label class="form-label">📷 添加照片（最多9张）</label>
                <button type="button" class="add-btn" id="diaryPhotoBtn" style="margin-bottom:8px">📷 选择照片</button>
                <input type="file" id="diaryPhotoInput" accept="image/*" multiple style="display:none">
                <div class="diary-photo-preview" id="diaryPhotoPreview" style="display:none"></div>
            </div>
        `;

        this.showModal('写日记', body, () => {
            const content = this.val('diaryContent');
            if (!content) { this.toast('请输入日记内容'); return false; }
            const images = window._diaryPhotos || [];
            Storage.add('diary', {
                date: document.getElementById('diaryDate').value,
                time: document.getElementById('diaryTime').value,
                mood: this.getMultiChipValues('diaryMoodChips'),
                content,
                images
            });
            window._diaryPhotos = [];
            this.renderDiary();
            this.renderDashboard();
            this.toast('日记已保存');
        });

        this.bindChips('diaryMoodChips');

        // 照片上传逻辑
        window._diaryPhotos = [];
        setTimeout(() => {
            const photoBtn = document.getElementById('diaryPhotoBtn');
            const photoInput = document.getElementById('diaryPhotoInput');
            const preview = document.getElementById('diaryPhotoPreview');

            if (photoBtn && photoInput) {
                photoBtn.addEventListener('click', () => photoInput.click());
                photoInput.addEventListener('change', (e) => {
                    const files = Array.from(e.target.files);
                    files.forEach(file => {
                        if (file.size > 2 * 1024 * 1024) {
                            this.toast(`图片 ${file.name} 超过2MB，已跳过`);
                            return;
                        }
                        if (window._diaryPhotos.length >= 9) {
                            this.toast('最多9张照片');
                            return;
                        }
                        const reader = new FileReader();
                        reader.onload = (ev) => {
                            window._diaryPhotos.push(ev.target.result);
                            this.renderDiaryPhotoPreview();
                        };
                        reader.readAsDataURL(file);
                    });
                    photoInput.value = '';
                });
            }
        }, 100);
    },

    renderDiaryPhotoPreview() {
        const preview = document.getElementById('diaryPhotoPreview');
        if (!preview) return;
        const photos = window._diaryPhotos || [];
        if (photos.length === 0) {
            preview.style.display = 'none';
            return;
        }
        preview.style.display = 'grid';
        preview.style.gridTemplateColumns = 'repeat(3, 1fr)';
        preview.style.gap = '6px';
        preview.innerHTML = photos.map((src, i) => `
            <div style="position:relative;aspect-ratio:1;border-radius:8px;overflow:hidden">
                <img src="${src}" style="width:100%;height:100%;object-fit:cover">
                <button type="button" onclick="App.removeDiaryPhoto(${i})" style="position:absolute;top:2px;right:2px;width:20px;height:20px;border-radius:50%;background:rgba(0,0,0,0.5);color:#fff;border:none;font-size:12px;display:flex;align-items:center;justify-content:center;cursor:pointer">✕</button>
            </div>
        `).join('');
    },

    removeDiaryPhoto(index) {
        if (window._diaryPhotos) {
            window._diaryPhotos.splice(index, 1);
            this.renderDiaryPhotoPreview();
        }
    },

    // ===== 辅助方法 =====
    val(id) {
        const el = document.getElementById(id);
        return el ? el.value.trim() : '';
    },

    escape(str) {
        if (str == null) return '';
        return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
    },

    bindChips(containerId, callback) {
        const container = document.getElementById(containerId);
        if (!container) return;
        // 检查是否多选模式：容器上有 data-multi 属性
        const isMulti = container.dataset.multi === 'true';
        container.querySelectorAll('.form-chip').forEach(chip => {
            chip.addEventListener('click', () => {
                if (isMulti) {
                    chip.classList.toggle('active');
                } else {
                    container.querySelectorAll('.form-chip').forEach(c => c.classList.remove('active'));
                    chip.classList.add('active');
                }
                if (callback) callback(chip.dataset.value, chip);
            });
        });
    },

    // 获取多选 chips 的值（用逗号分隔）
    getMultiChipValues(containerId) {
        const container = document.getElementById(containerId);
        if (!container) return '';
        return Array.from(container.querySelectorAll('.form-chip.active'))
            .map(c => c.dataset.value).join(',');
    },

    counter(id, delta) {
        const el = document.getElementById(id);
        if (!el) return;
        let val = parseInt(el.value) || 0;
        val = Math.max(0, val + delta);
        el.value = val;
    },

    toast(msg) {
        const toast = document.getElementById('toast');
        toast.textContent = msg;
        toast.classList.add('show');
        clearTimeout(this._toastTimer);
        this._toastTimer = setTimeout(() => toast.classList.remove('show'), 2000);
    },

    // ===== PWA =====
    registerSW() {
        if ('serviceWorker' in navigator) {
            navigator.serviceWorker.register('sw.js').catch(err => console.log('SW注册失败', err));
        }
    },

    showInstallPrompt() {
        // 检测是否已在standalone模式
        if (window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone) {
            return; // 已安装
        }

        // 延迟显示安装提示
        setTimeout(() => {
            if (!localStorage.getItem('install_dismissed')) {
                this.showInstallBanner();
            }
        }, 3000);
    },

    showInstallBanner() {
        // 如果已有banner则不重复显示
        if (document.querySelector('.install-banner')) return;

        const banner = document.createElement('div');
        banner.className = 'install-banner show';
        banner.innerHTML = `
            <div class="install-icon">📱</div>
            <div class="install-text">
                <div class="install-title">添加到主屏幕</div>
                <div class="install-desc">像APP一样使用，更方便记录</div>
            </div>
            <button class="install-action" id="installBtn">安装</button>
            <button class="install-dismiss" id="installDismiss">✕</button>
        `;
        document.body.appendChild(banner);

        document.getElementById('installBtn').addEventListener('click', () => {
            if (this.deferredPrompt) {
                this.deferredPrompt.prompt();
                this.deferredPrompt.userChoice.then(() => {
                    this.deferredPrompt = null;
                    banner.remove();
                });
            } else {
                this.showInstallGuide();
                banner.remove();
            }
        });

        document.getElementById('installDismiss').addEventListener('click', () => {
            banner.remove();
            localStorage.setItem('install_dismissed', '1');
        });
    },

    showInstallGuide() {
        const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
        const guide = isIOS
            ? `点击 Safari 底部的<strong>分享按钮</strong>📤<br>选择<strong>"添加到主屏幕"</strong><br>点击<strong>"添加"</strong>即可安装`
            : `点击浏览器菜单<strong>⋮</strong><br>选择<strong>"添加到主屏幕"</strong>或<strong>"安装应用"</strong>`;

        this.showModal('安装到手机桌面', `
            <div style="text-align:center;padding:20px 0;line-height:2">
                <div style="font-size:48px;margin-bottom:16px">📱</div>
                <div style="font-size:15px;color:var(--text)">${guide}</div>
            </div>
        `, null);

        // 隐藏取消按钮，只显示关闭
        document.getElementById('modalCancel').style.display = 'none';
        document.getElementById('modalConfirm').textContent = '知道了';
    },

    // ===== 每日推送 =====
    switchPushTab(tab) {
        document.querySelectorAll('.push-tab').forEach(t => t.classList.remove('active'));
        document.querySelectorAll('.push-content').forEach(c => c.classList.remove('active'));
        document.querySelector(`.push-tab[data-ptab="${tab}"]`).classList.add('active');
        const content = document.getElementById(`ptab-${tab}`);
        if (content) content.classList.add('active');
    },

    renderDailyPush() {
        const db = Storage.load();
        if (!db.baby.birthDate) {
            ['feeding','education','development','sleep','health','care'].forEach(tab => {
                const el = document.getElementById(`ptab-${tab}`);
                if (el) el.innerHTML = '<div class="empty-state">请先设置宝宝信息</div>';
            });
            return;
        }

        const months = Math.floor((new Date() - new Date(db.baby.birthDate)) / (1000*60*60*24*30.44));
        const ageText = months > 0 ? `${months}个月` : '新生儿';
        const ageBadge = document.getElementById('pushAgeBadge');
        if (ageBadge) ageBadge.textContent = `安安 · ${ageText}`;

        if (typeof PushData === 'undefined') return;

        const pushes = PushData.getByMonth(months);
        const catIcons = { feeding: '🍽️', education: '🧩', development: '📈', sleep: '💤', health: '🩺', care: '👶' };

        Object.keys(pushes).forEach(cat => {
            const items = pushes[cat] || [];
            const el = document.getElementById(`ptab-${cat}`);
            if (!el) return;

            if (items.length === 0) {
                el.innerHTML = '<div class="empty-state">暂无推送内容</div>';
                return;
            }

            el.innerHTML = items.map(item => {
                const sourceColor = {
                    'WHO': '#2196F3',
                    '中国卫健委': '#E53935',
                    'AAP': '#4CAF50',
                    '崔玉涛': '#FF9800'
                };
                const color = sourceColor[item.source] || '#999';

                return `
                <div class="push-card">
                    <div class="push-card-header">
                        <span class="push-card-icon">${catIcons[cat] || ''}</span>
                        <span class="push-card-title">${this.escape(item.title)}</span>
                        <span class="push-card-source" style="background:${color}15;color:${color};border:1px solid ${color}30">📚 ${this.escape(item.source || '')}</span>
                    </div>
                    <div class="push-card-content">${this.escape(item.content)}</div>
                    ${item.tags && item.tags.length > 0 ? `
                        <div class="push-card-tags">
                            ${item.tags.map(t => `<span class="push-card-tag">${this.escape(t)}</span>`).join('')}
                        </div>
                    ` : ''}
                </div>
            `}).join('');
        });

        // 免责声明
        const pushPage = document.getElementById('page-dailyPush');
        let note = pushPage.querySelector('.push-disclaimer');
        if (!note) {
            note = document.createElement('div');
            note.className = 'push-disclaimer';
            note.style.cssText = 'text-align:center;padding:20px 10px;font-size:11px;color:var(--text-lighter);line-height:1.6';
            note.innerHTML = '以上内容参考 WHO、中国卫健委、AAP 等权威来源<br>仅供参考，具体请遵医嘱';
            pushPage.appendChild(note);
        }
    },

    escape(str) {
        if (!str) return '';
        const div = document.createElement('div');
        div.textContent = str;
        return div.innerHTML;
    },

    // ===== 全局搜索 =====
    searchRecords(query) {
        const db = Storage.load();
        const results = [];
        const q = query.toLowerCase();

        (db.diary || []).forEach(r => {
            if ((r.content || '').toLowerCase().includes(q)) {
                results.push({ type: 'diary', icon: '📝', title: r.content.slice(0, 40), date: r.date, id: r.id });
            }
        });
        (db.medical || []).forEach(r => {
            const text = (r.symptom || '') + (r.diagnosis || '') + (r.hospital || '') + (r.note || '');
            if (text.toLowerCase().includes(q)) {
                results.push({ type: 'health', icon: '🏥', title: (r.hospital || '就医') + ' - ' + (r.diagnosis || r.symptom || ''), date: r.date, id: r.id });
            }
        });
        (db.shopping || []).forEach(r => {
            const text = (r.item || '') + (r.note || '') + (r.category || '');
            if (text.toLowerCase().includes(q)) {
                results.push({ type: 'shopping', icon: '🛒', title: r.item + ' ¥' + (r.price || 0), date: r.date, id: r.id });
            }
        });
        (db.milestone || []).forEach(r => {
            const text = (r.title || '') + (r.note || '');
            if (text.toLowerCase().includes(q)) {
                results.push({ type: 'growth', icon: '⭐', title: r.title || '里程碑', date: r.date, id: r.id });
            }
        });

        return results.slice(0, 20).sort((a, b) => (b.date || '').localeCompare(a.date || ''));
    },

    goToSearchResult(type) {
        document.getElementById('searchResults').style.display = 'none';
        const searchInput = document.getElementById('globalSearch');
        if (searchInput) searchInput.value = '';
        this.switchPage(type);
    },

    viewDiaryImage(src) {
        this.showModal('照片', `<div style="text-align:center"><img src="${src}" style="max-width:100%;max-height:70vh;border-radius:12px"></div>`, null);
        document.getElementById('modalCancel').style.display = 'none';
        document.getElementById('modalConfirm').textContent = '关闭';
    },

    // ===== 数据备份提醒 =====
    checkBackupReminder() {
        const db = Storage.load();
        const lastBackup = db.settings.lastBackupDate;
        if (!lastBackup) return true;
        const days = (Date.now() - new Date(lastBackup).getTime()) / (1000 * 60 * 60 * 24);
        return days > 7;
    },

    updateBackupDate() {
        Storage.updateSettings({ lastBackupDate: new Date().toISOString() });
    },

    exportReport() {
        const db = Storage.load();
        const baby = db.baby || {};
        const age = baby.birthDate ? Utils.calcAge(baby.birthDate) : '';
        const growth = (db.growth || []).sort((a, b) => new Date(b.date) - new Date(a.date));
        const vaccines = (db.vaccine || []).sort((a, b) => new Date(b.date) - new Date(a.date));
        const milestones = (db.milestone || []).sort((a, b) => new Date(b.date) - new Date(a.date));
        const shoppings = (db.shopping || []).sort((a, b) => new Date(b.date) - new Date(a.date));

        let totalShopping = 0;
        shoppings.forEach(s => totalShopping += parseFloat(s.price) || 0);

        const html = `<!DOCTYPE html>
<html lang="zh-CN">
<head><meta charset="UTF-8"><title>${baby.name || '宝宝'}成长报告</title>
<style>
body{font-family:-apple-system,sans-serif;max-width:600px;margin:0 auto;padding:20px;color:#333}
h1{color:#E891A6;text-align:center}
h2{color:#D4859A;border-bottom:2px solid #FBF2F0;padding-bottom:6px;margin-top:24px}
.card{background:#FBF5F0;border-radius:12px;padding:14px;margin:8px 0}
.stat{display:inline-block;margin-right:20px;text-align:center}
.stat-val{font-size:24px;font-weight:700;color:#E891A6}
.stat-lbl{font-size:12px;color:#888}
table{width:100%;border-collapse:collapse;margin:8px 0}
td,th{padding:6px 8px;text-align:left;border-bottom:1px solid #eee;font-size:13px}
</style></head>
<body>
<h1>${baby.avatar || '👶'} ${baby.name || '宝宝'}成长报告</h1>
<p style="text-align:center;color:#888">${age} · 生成于 ${new Date().toLocaleDateString('zh-CN')}</p>

<h2>📊 基本信息</h2>
<div class="card">
姓名：${baby.name || '未设置'}<br>
性别：${baby.gender === 'boy' ? '男' : baby.gender === 'girl' ? '女' : '未设置'}<br>
出生日期：${baby.birthDate || '未设置'}<br>
年龄：${age}
</div>

<h2>📏 最新生长数据</h2>
<div class="card">
${growth.length > 0 ? `
身高：${growth[0].height || '-'} cm<br>
体重：${growth[0].weight || '-'} kg<br>
头围：${growth[0].headCircumference || '-'} cm<br>
记录日期：${growth[0].date}
` : '暂无记录'}
</div>

<h2>💉 疫苗接种记录</h2>
<table>
<tr><th>日期</th><th>疫苗</th><th>剂次</th></tr>
${vaccines.map(v => `<tr><td>${v.date}</td><td>${v.vaccineName || ''}</td><td>${v.dose || ''}</td></tr>`).join('') || '<tr><td colspan="3">暂无记录</td></tr>'}
</table>

<h2>⭐ 发育里程碑</h2>
<div class="card">
${milestones.map(m => `<div>📅 ${m.date} - <strong>${m.title || ''}</strong> ${m.note || ''}</div>`).join('') || '暂无记录'}
</div>

<h2>💰 购物消费统计</h2>
<div class="card">
<div class="stat"><div class="stat-val">${shoppings.length}</div><div class="stat-lbl">总购物数</div></div>
<div class="stat"><div class="stat-val">¥${totalShopping.toFixed(0)}</div><div class="stat-lbl">总花费</div></div>
</div>

<h2>📝 最近日记</h2>
<div class="card">
${(db.diary || []).slice(0, 5).map(d => `<div style="margin-bottom:8px"><strong>${d.date}</strong> ${d.content.slice(0, 60)}...</div>`).join('') || '暂无记录'}
</div>

<p style="text-align:center;color:#ccc;margin-top:30px">宝宝成长记 · 用心记录每一刻 ❤️</p>
</body></html>`;

        const blob = new Blob([html], { type: 'text/html' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${baby.name || '宝宝'}成长报告-${Utils.todayStr()}.html`;
        a.click();
        URL.revokeObjectURL(url);
        this.updateBackupDate();
        this.toast('成长报告已生成');
    }
};

// 启动应用
document.addEventListener('DOMContentLoaded', () => App.init());
