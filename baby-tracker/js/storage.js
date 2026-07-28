/**
 * 存储模块 - 使用 localStorage 持久化数据
 */

const Storage = {
    DB_KEY: 'baby_tracker_db',

    // 默认数据结构
    getDefaultDB() {
        return {
            baby: {
                name: '',
                gender: '',
                birthDate: '',
                avatar: '👶'
            },
            medical: [],      // 就医记录
            vaccine: [],      // 疫苗接种
            checkup: [],      // 儿保体检
            medication: [],   // 用药记录
            feeding: [],      // 喂养记录
            sleep: [],        // 睡眠记录
            outdoor: [],      // 户外活动
            story: [],        // 故事时间
            diaper: [],       // 尿布记录
            bath: [],         // 洗澡记录
            growth: [],       // 身高体重
            milestone: [],    // 发育里程碑
            motor: [],        // 运动发展
            diary: [],        // 成长日记
            timeline: {},     // 按日期组织的每日时间线 { '2024-01-01': [...] }
            settings: {
                storyTime: '20:00',    // 默认故事时间
                outdoorGoal: 120,       // 户外目标分钟
                sleepGoal: 14,          // 睡眠目标小时
            }
        };
    },

    // 读取数据库
    load() {
        try {
            const data = localStorage.getItem(this.DB_KEY);
            if (!data) {
                const defaultDB = this.getDefaultDB();
                this.save(defaultDB);
                return defaultDB;
            }
            const db = JSON.parse(data);
            // 合并默认值，防止旧数据缺少新字段
            const defaults = this.getDefaultDB();
            return { ...defaults, ...db, baby: { ...defaults.baby, ...db.baby }, settings: { ...defaults.settings, ...db.settings } };
        } catch (e) {
            console.error('数据加载失败', e);
            return this.getDefaultDB();
        }
    },

    // 保存数据库
    save(db) {
        try {
            localStorage.setItem(this.DB_KEY, JSON.stringify(db));
        } catch (e) {
            console.error('数据保存失败', e);
            alert('存储空间不足，请清理旧数据');
        }
    },

    // 添加记录
    add(type, data) {
        const db = this.load();
        const record = {
            id: Date.now() + '-' + Math.random().toString(36).substr(2, 6),
            createdAt: new Date().toISOString(),
            ...data
        };
        if (!db[type]) db[type] = [];
        db[type].unshift(record);
        this.save(db);
        return record;
    },

    // 删除记录
    delete(type, id) {
        const db = this.load();
        if (!db[type]) return;
        db[type] = db[type].filter(r => r.id !== id);
        this.save(db);
    },

    // 更新记录
    update(type, id, data) {
        const db = this.load();
        if (!db[type]) return;
        const idx = db[type].findIndex(r => r.id === id);
        if (idx >= 0) {
            db[type][idx] = { ...db[type][idx], ...data };
            this.save(db);
        }
    },

    // 获取某类型所有记录
    getAll(type) {
        const db = this.load();
        return db[type] || [];
    },

    // 按日期获取记录
    getByDate(type, dateStr) {
        const db = this.load();
        return (db[type] || []).filter(r => r.date === dateStr);
    },

    // 获取今天的记录
    getToday(type) {
        return this.getByDate(type, Utils.todayStr());
    },

    // 更新宝宝信息
    updateBaby(baby) {
        const db = this.load();
        db.baby = { ...db.baby, ...baby };
        this.save(db);
    },

    // 更新设置
    updateSettings(settings) {
        const db = this.load();
        db.settings = { ...db.settings, ...settings };
        this.save(db);
    },

    // 导出数据
    export() {
        return JSON.stringify(this.load(), null, 2);
    },

    // 导入数据
    import(jsonStr) {
        const data = JSON.parse(jsonStr);
        this.save(data);
    },

    // 清空所有数据
    clear() {
        localStorage.removeItem(this.DB_KEY);
    }
};

// 工具函数
const Utils = {
    // 今天的日期字符串
    todayStr() {
        return this.dateStr(new Date());
    },

    // 日期对象转字符串
    dateStr(date) {
        const y = date.getFullYear();
        const m = String(date.getMonth() + 1).padStart(2, '0');
        const d = String(date.getDate()).padStart(2, '0');
        return `${y}-${m}-${d}`;
    },

    // 格式化日期显示
    formatDate(dateStr, withWeek = true) {
        if (!dateStr) return '';
        const date = new Date(dateStr);
        const month = date.getMonth() + 1;
        const day = date.getDate();
        let result = `${month}月${day}日`;
        if (withWeek) {
            const weeks = ['日', '一', '二', '三', '四', '五', '六'];
            result += ` 周${weeks[date.getDay()]}`;
        }
        return result;
    },

    // 格式化完整日期
    formatDateFull(dateStr) {
        if (!dateStr) return '';
        const date = new Date(dateStr);
        return `${date.getFullYear()}年${date.getMonth() + 1}月${date.getDate()}日`;
    },

    // 格式化时间
    formatTime(timeStr) {
        if (!timeStr) return '';
        return timeStr.substring(0, 5);
    },

    // 计算宝宝年龄
    calcAge(birthDate) {
        if (!birthDate) return '';
        const birth = new Date(birthDate);
        const now = new Date();
        const diffMs = now - birth;
        if (diffMs < 0) return '未出生';

        const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));
        const months = Math.floor(days / 30.44);
        const years = Math.floor(months / 12);

        if (years > 0) {
            const remainMonths = months % 12;
            return remainMonths > 0 ? `${years}岁${remainMonths}个月` : `${years}岁`;
        } else if (months > 0) {
            const remainDays = days - Math.floor(months * 30.44);
            return remainDays > 0 ? `${months}个月${remainDays}天` : `${months}个月`;
        } else {
            return `${days}天`;
        }
    },

    // 计算宝宝在某个日期的年龄
    calcAgeAt(birthDate, targetDate) {
        if (!birthDate || !targetDate) return '';
        const birth = new Date(birthDate);
        const target = new Date(targetDate);
        const diffMs = target - birth;
        if (diffMs < 0) return '';

        const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));
        const months = Math.floor(days / 30.44);
        const years = Math.floor(months / 12);

        if (years > 0) {
            const remainMonths = months % 12;
            return remainMonths > 0 ? `${years}岁${remainMonths}个月` : `${years}岁`;
        } else if (months > 0) {
            const remainDays = days - Math.floor(months * 30.44);
            return remainDays > 0 ? `${months}个月${remainDays}天` : `${months}个月`;
        } else {
            return `${days}天`;
        }
    },
        const d1 = new Date(dateStr1);
        const d2 = new Date(dateStr2);
        return Math.floor((d2 - d1) / (1000 * 60 * 60 * 24));
    },

    // 获取问候语
    getGreeting() {
        const hour = new Date().getHours();
        if (hour < 6) return '夜安 🌙';
        if (hour < 11) return '早安 ☀️';
        if (hour < 14) return '中午好 🌤️';
        if (hour < 18) return '下午好 🌅';
        if (hour < 22) return '晚上好 🌙';
        return '夜深了 💤';
    },

    // 获取当前时间 HH:MM
    nowTime() {
        const now = new Date();
        return `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    },

    // 日期加减
    addDays(dateStr, days) {
        const date = new Date(dateStr);
        date.setDate(date.getDate() + days);
        return this.dateStr(date);
    },

    // 判断是否今天
    isToday(dateStr) {
        return dateStr === this.todayStr();
    }
};
