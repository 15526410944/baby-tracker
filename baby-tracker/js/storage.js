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
            shopping: [],     // 购物记录
            music: [],        // 音乐早教
            customEarly: [],  // 自定义早教
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
    daysDiff(dateStr1, dateStr2) {
        const d1 = new Date(dateStr1);
        const d2 = new Date(dateStr2);
        return Math.floor((d2 - d1) / (1000 * 60 * 60 * 24));
    },

    // 获取问候语
    getGreeting() {
        const hour = new Date().getHours();
        if (hour < 6) return '夜安 ✨';
        if (hour < 11) return '早安 ☀️';
        if (hour < 14) return '中午好 ☁️';
        if (hour < 18) return '下午好 ☁️';
        if (hour < 22) return '晚上好 ⭐';
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

/**
 * 每日推送内容库 - 按月龄分类的育儿知识
 * 内容来源：WHO、中国卫健委、AAP、崔玉涛育儿百科
 */
const PushData = {
    // 获取某月龄的推送内容
    getByMonth(month) {
        if (month <= 0) return this.data[0];
        if (month <= 6) return this.data[month] || this.data[0];
        if (month <= 8) return this.data['7-8'];
        if (month <= 10) return this.data['9-10'];
        if (month <= 12) return this.data['11-12'];
        if (month <= 18) return this.data['13-18'];
        if (month <= 24) return this.data['19-24'];
        return this.data['19-24'];
    },

    data: {
        // ===== 0个月 新生儿 =====
        0: {
            feeding: [
                { title: '母乳是最好的礼物', content: 'WHO建议出生后1小时内开始母乳喂养，初乳富含抗体和营养，是宝宝的第一剂"疫苗"。按需喂养，每天至少8-12次。', source: 'WHO', tags: ['母乳', '初乳', '按需喂养'] },
                { title: '配方奶喂养须知', content: '无法母乳喂养时，选择适合的1段配方奶。冲泡水温70°C以上，先放水后放奶粉，严格按照比例冲调，避免过浓或过稀。', source: '中国卫健委', tags: ['配方奶', '冲泡'] }
            ],
            education: [
                { title: '多和宝宝说话', content: '新生儿虽然不会说话，但能听到声音。多和宝宝说话、唱歌，描述正在做的事情，有助于语言发育和亲子 bonding。', source: 'AAP', tags: ['语言', '亲子互动'] },
                { title: '黑白卡片视觉训练', content: '新生儿视力约20-30cm，对比强烈的黑白图案最能吸引注意。每天展示黑白卡片2-3次，每次1-2分钟，促进视觉发育。', source: 'AAP', tags: ['视觉', '卡片'] }
            ],
            development: [
                { title: '新生儿反射', content: '觅食反射、吸吮反射、握持反射、拥抱反射是正常生理反射，大多在3-6个月消失。这些反射是神经系统发育正常的标志。', source: 'AAP', tags: ['反射', '神经发育'] },
                { title: '抬头练习', content: '趴着的时间从每天几次、每次1-2分钟开始，逐渐增加。这能锻炼颈部和背部肌肉，为后续大运动发展打基础。', source: '崔玉涛', tags: ['大运动', '抬头', 'tummy time'] }
            ],
            sleep: [
                { title: '新生儿睡眠规律', content: '新生儿每天睡眠16-17小时，但每次睡眠2-4小时就会醒来吃奶。昼夜颠倒很正常，白天保持明亮，晚上保持黑暗安静。', source: 'AAP', tags: ['睡眠时长', '昼夜'] },
                { title: '安全睡眠环境', content: '仰睡！仰睡！仰睡！重要的事说三遍。婴儿床不要放松软物品，室温22-24°C，这是预防SIDS的关键。', source: 'AAP', tags: ['安全', 'SIDS', '仰睡'] }
            ],
            health: [
                { title: '黄疸观察', content: '大部分新生儿在2-3天出现生理性黄疸，7-10天消退。如黄疸出现过早（24小时内）、进展快、手脚心发黄，需及时就医。', source: '崔玉涛', tags: ['黄疸', '观察'] },
                { title: '脐带护理', content: '保持脐带残端干燥清洁，每天用75%酒精消毒1-2次。尿布折叠在脐带下方避免摩擦。一般1-2周自然脱落。', source: '中国卫健委', tags: ['脐带', '护理'] }
            ],
            care: [
                { title: '洗澡频率', content: '新生儿不需要每天洗澡，2-3天洗一次即可。洗澡水温37-38°C，时间5-10分钟。重点清洁颈部、腋下、大腿根等皱褶处。', source: 'AAP', tags: ['洗澡', '清洁'] },
                { title: '抚触的力量', content: '每天给宝宝做抚触按摩15-20分钟，能促进神经系统发育、改善睡眠、增强免疫力。在两次喂奶之间进行，使用婴儿润肤油。', source: 'WHO', tags: ['抚触', '按摩'] }
            ]
        },

        // ===== 1个月 =====
        1: {
            feeding: [
                { title: '判断奶量是否足够', content: '每天6片以上湿尿布、体重每周增长150-200g、喂养后宝宝满足安静，说明奶量充足。不要过度焦虑奶量。', source: 'WHO', tags: ['奶量', '体重'] },
                { title: '拍嗝很重要', content: '每次喂奶后竖抱拍嗝5-10分钟，减少吐奶和肠胀气。手掌空心状从下往上轻拍背部。', source: '崔玉涛', tags: ['拍嗝', '吐奶'] }
            ],
            education: [
                { title: '模仿表情游戏', content: '宝宝开始能模仿面部表情了。对着宝宝吐舌头、张嘴，等宝宝模仿。这锻炼面部肌肉和社交能力。', source: 'AAP', tags: ['模仿', '社交'] },
                { title: '摇铃听觉训练', content: '在宝宝头部两侧30cm处轻轻摇铃，观察宝宝是否会转头寻找声源。这能训练听觉定位能力。', source: 'AAP', tags: ['听觉', '追声'] }
            ],
            development: [
                { title: '社交性微笑', content: '满月前后宝宝开始出现社交性微笑，对人脸和声音报以微笑。这是亲子互动的重要里程碑，多逗宝宝笑。', source: 'AAP', tags: ['微笑', '社交'] },
                { title: '追视训练', content: '宝宝能追踪眼前20-30cm移动的物体。用红色小球或黑白卡片缓慢左右移动，训练眼球追视能力。', source: '崔玉涛', tags: ['视觉', '追视'] }
            ],
            sleep: [
                { title: '开始建立昼夜节律', content: '白天喂奶后保持一段清醒时间，房间保持明亮。晚上喂奶时灯光昏暗、动作轻柔，帮助宝宝区分白天和黑夜。', source: 'AAP', tags: ['昼夜', '节律'] },
                { title: '睡眠总量约15-16小时', content: '1个月宝宝每天睡15-16小时，白天3-4次小睡。夜间最长连续睡眠3-4小时属于正常。', source: 'WHO', tags: ['睡眠时长'] }
            ],
            health: [
                { title: '满月体检提醒', content: '满月时需做体检，检查体重、身高、头围增长情况，评估喂养效果。同时接种第二针乙肝疫苗。', source: '中国卫健委', tags: ['体检', '疫苗'] },
                { title: '肠绞痛应对', content: '若宝宝固定在傍晚大哭不止、难以安抚，可能是肠绞痛。尝试飞机抱、白噪音、按摩腹部缓解。一般4个月后会自行消失。', source: '崔玉涛', tags: ['肠绞痛', '哭闹'] }
            ],
            care: [
                { title: '皮肤保湿', content: '新生儿皮肤容易干燥，洗澡后3分钟内全身涂抹婴儿润肤乳，锁住水分。如出现湿疹，需加强保湿并就医。', source: 'AAP', tags: ['皮肤', '保湿', '湿疹'] },
                { title: '指甲护理', content: '宝宝指甲长得快，容易抓伤自己。在宝宝睡着时用婴儿指甲剪修剪，剪成圆弧形，不要剪太短。', source: 'AAP', tags: ['指甲', '修剪'] }
            ]
        },

        // ===== 2个月 =====
        2: {
            feeding: [
                { title: '建立喂养规律', content: '2个月宝宝约每3小时喂一次，每天6-8次。开始形成相对规律的喂养节奏，但仍以按需为主。', source: 'WHO', tags: ['规律', '喂养频率'] },
                { title: '维生素D补充', content: '纯母乳喂养宝宝每天需补充400IU维生素D。配方奶喂养宝宝如奶量充足可不用额外补充。', source: '中国卫健委', tags: ['维生素D', '补充'] }
            ],
            education: [
                { title: '多趴多练', content: '清醒时多趴着，每天累计至少30分钟。可以趴在妈妈胸口或垫子上，用玩具吸引抬头。锻炼颈背肌肉。', source: 'AAP', tags: ['tummy time', '抬头'] },
                { title: '发声回应', content: '宝宝开始发出"啊""哦"等元音。当宝宝发声时积极回应，模仿宝宝的声音，鼓励更多"对话"。', source: 'AAP', tags: ['语言', '发声'] }
            ],
            development: [
                { title: '头部控制增强', content: '竖抱时头部能短暂直立，俯卧时能抬头45度。多练习趴着，为翻身做准备。', source: 'AAP', tags: ['大运动', '抬头'] },
                { title: '手部开始张开', content: '从握拳状态逐渐张开手指，偶尔会抓握玩具。可以放摇铃在手中让宝宝练习抓握。', source: '崔玉涛', tags: ['精细动作', '抓握'] }
            ],
            sleep: [
                { title: '夜间睡眠延长', content: '部分宝宝夜间能睡4-6小时连续。可以开始建立睡前仪式：洗澡→按摩→喂奶→讲故事→关灯。', source: 'AAP', tags: ['夜间', '睡前仪式'] },
                { title: '小睡安排', content: '白天3次小睡，上午、中午、下午各一次。每次1-2小时。注意观察宝宝犯困信号及时安排小睡。', source: 'WHO', tags: ['小睡', '犯困信号'] }
            ],
            health: [
                { title: '2个月疫苗提醒', content: '需接种：脊灰疫苗第1剂、百白破第1剂、乙肝第2剂（如满月未接种）。接种后观察体温和局部反应。', source: '中国卫健委', tags: ['疫苗', '脊灰', '百白破'] },
                { title: '头型关注', content: '注意变换睡姿，白天多趴着，避免长时间同一姿势导致偏头。如发现明显偏头需咨询医生。', source: 'AAP', tags: ['头型', '偏头'] }
            ],
            care: [
                { title: '口水疹预防', content: '2个月开始流口水增多，及时擦干下巴和颈部，涂抹润肤霜隔离。选择柔软棉质口水巾。', source: '崔玉涛', tags: ['口水疹', '皮肤'] },
                { title: '户外活动开始', content: '天气好时可以带宝宝户外活动10-15分钟，接触自然光有助维生素D合成。避免阳光直射。', source: 'AAP', tags: ['户外', '阳光'] }
            ]
        },

        // ===== 3个月 =====
        3: {
            feeding: [
                { title: '奶量参考', content: '3个月宝宝每天奶量约600-800ml，每次120-150ml。不要过早添加辅食，WHO建议6个月内纯母乳喂养。', source: 'WHO', tags: ['奶量', '辅食'] },
                { title: '厌奶期应对', content: '部分宝宝3-4个月出现厌奶，吃奶量减少但精神好。不要强迫喂养，安静环境喂奶，通常1-2周恢复。', source: '崔玉涛', tags: ['厌奶', '应对'] }
            ],
            education: [
                { title: '照镜子游戏', content: '抱宝宝照镜子，宝宝会对镜中的"小伙伴"感兴趣。这有助于自我认知和社交发展。', source: 'AAP', tags: ['镜子', '认知'] },
                { title: '不同材质触摸', content: '提供丝绸、毛绒、硅胶等不同材质的物品让宝宝触摸，丰富触觉体验，促进感官发育。', source: 'AAP', tags: ['触觉', '感官'] }
            ],
            development: [
                { title: '翻身准备', content: '宝宝开始尝试从仰卧翻到侧卧。可以在侧面放玩具吸引宝宝翻身。多趴着是翻身的关键基础。', source: 'AAP', tags: ['翻身', '大运动'] },
                { title: '笑声出现', content: '3-4个月宝宝会发出咯咯笑声。多逗宝宝笑，挠痒痒、做鬼脸，笑是社交和情绪发展的重要标志。', source: 'AAP', tags: ['笑声', '社交'] }
            ],
            sleep: [
                { title: '睡眠总量14-15小时', content: '3个月宝宝每天睡14-15小时，夜间可能睡5-6小时连续。白天3次小睡，总时长3-4小时。', source: 'WHO', tags: ['睡眠时长'] },
                { title: '入睡能力培养', content: '尝试在宝宝犯困但还清醒时放到床上，让宝宝学习自主入睡。减少奶睡和抱睡依赖。', source: 'AAP', tags: ['自主入睡', '睡眠习惯'] }
            ],
            health: [
                { title: '3个月疫苗提醒', content: '需接种：脊灰疫苗第2剂、百白破第2剂。接种后多饮水，观察24小时体温变化。', source: '中国卫健委', tags: ['疫苗', '脊灰', '百白破'] },
                { title: '髋关节检查', content: '3个月体检时会检查髋关节发育情况。如有臀位产史或双腿纹不对称，需做B超排查发育性髋关节脱位。', source: 'AAP', tags: ['髋关节', '体检'] }
            ],
            care: [
                { title: '口水增多', content: '3个月后唾液腺发育，口水明显增多。及时擦拭，戴纯棉口水巾，下巴涂抹润肤霜防口水疹。', source: '崔玉涛', tags: ['口水', '护理'] },
                { title: '抓物入口', content: '宝宝开始抓东西往嘴里放，这是正常的探索方式。确保玩具干净安全，直径大于4cm防止误吞。', source: 'AAP', tags: ['安全', '探索'] }
            ]
        },

        // ===== 4个月 =====
        4: {
            feeding: [
                { title: '仍以奶为主', content: '4个月仍以母乳或配方奶为主，每天约800ml。不要急于加辅食，消化系统还需发育。如有过敏家族史，更不建议过早添加。', source: 'WHO', tags: ['纯奶', '辅食推迟'] },
                { title: '观察辅食信号', content: '如宝宝能竖头稳定、对食物感兴趣、舌挺反射消失，可咨询医生是否在4-6个月间开始尝试辅食。', source: '中国卫健委', tags: ['辅食信号', '准备'] }
            ],
            education: [
                { title: '因果关系游戏', content: '宝宝开始理解因果关系。提供按一下就响/动的玩具，让宝宝体验"我做了动作→产生结果"的因果联系。', source: 'AAP', tags: ['因果', '认知'] },
                { title: '名字认知', content: '经常叫宝宝名字，观察宝宝是否会转头回应。4-5个月开始对自己的名字有反应。', source: 'AAP', tags: ['名字', '认知'] }
            ],
            development: [
                { title: '翻身完成', content: '4-5个月大多数宝宝能从仰卧翻到俯卧。在床上或地垫上多练习，注意安全防护，避免从高处跌落。', source: 'AAP', tags: ['翻身', '大运动'] },
                { title: '主动抓握', content: '宝宝能主动伸手抓玩具，双手会互相传递物品。提供不同形状、声音的玩具锻炼手部技能。', source: '崔玉涛', tags: ['抓握', '精细动作'] }
            ],
            sleep: [
                { title: '4个月睡眠倒退', content: '常见睡眠倒退期！宝宝睡眠模式向成人转变，夜醒增多。保持一致睡前仪式，避免养成不良睡眠联想。通常2-4周好转。', source: 'AAP', tags: ['睡眠倒退', '夜醒'] },
                { title: '并觉期', content: '部分宝宝开始从3次小睡过渡到2次。观察宝宝下午小睡是否难以入睡，可能需要调整小睡安排。', source: 'WHO', tags: ['并觉', '小睡'] }
            ],
            health: [
                { title: '4个月疫苗提醒', content: '需接种：脊灰疫苗第3剂、百白破第3剂。这是基础免疫的最后一针，完成后抗体水平达到保护标准。', source: '中国卫健委', tags: ['疫苗', '基础免疫'] },
                { title: '出牙前兆', content: '部分宝宝4个月开始流口水增多、喜欢咬东西，是出牙前兆。可以准备牙胶冷藏后使用缓解牙龈不适。', source: '崔玉涛', tags: ['出牙', '牙胶'] }
            ],
            care: [
                { title: '坐姿练习', content: '可以靠坐在枕头或靠垫上短时间练习坐。不要时间太长，脊柱还不够有力。5-6个月能独坐。', source: 'AAP', tags: ['坐', '大运动'] },
                { title: '安全防护升级', content: '宝宝活动能力增强，检查家中安全。防撞角、插座保护盖、柜子固定等，为即将到来的爬行期做准备。', source: 'AAP', tags: ['安全', '防护'] }
            ]
        },

        // ===== 5个月 =====
        5: {
            feeding: [
                { title: '辅食准备期', content: '5个月可以开始让宝宝坐在餐椅上观察家人吃饭，感受用餐氛围。准备辅食工具：餐椅、硅胶碗勺、围嘴。', source: '中国卫健委', tags: ['辅食准备', '工具'] },
                { title: '铁储备下降', content: '5-6个月宝宝体内铁储备开始下降，需通过辅食补充铁。首推高铁米粉，用母乳或配方奶调配。', source: 'WHO', tags: ['补铁', '米粉'] }
            ],
            education: [
                { title: '积木游戏', content: '提供大块软积木，宝宝会抓握、敲打、传递。锻炼手眼协调和因果关系认知。', source: 'AAP', tags: ['积木', '手眼协调'] },
                { title: '躲猫猫', content: '用手遮住脸再露出，宝宝会觉得很有趣。这帮助宝宝理解"客体永久性"——东西看不见依然存在。', source: 'AAP', tags: ['躲猫猫', '认知'] }
            ],
            development: [
                { title: '独坐萌芽', content: '5个月宝宝可能短暂独坐几秒，但还不稳。多练习靠坐→扶坐→独坐，用玩具吸引向前伸手。', source: 'AAP', tags: ['独坐', '大运动'] },
                { title: '双脚交替蹬', content: '仰卧时双脚喜欢交替蹬踢，这是良好的运动信号。可以放响纸在脚下让蹬踢产生声音。', source: '崔玉涛', tags: ['运动', '腿部'] }
            ],
            sleep: [
                { title: '夜间睡眠延长', content: '部分宝宝夜间能连续睡6-8小时。白天2-3次小睡，总时长2-3小时。保持规律作息。', source: 'WHO', tags: ['夜间', '睡眠时长'] },
                { title: '分离焦虑初现', content: '5-6个月开始出现分离焦虑，睡前可能哭闹。建立固定的告别仪式，不要偷偷离开。', source: 'AAP', tags: ['分离焦虑', '情绪'] }
            ],
            health: [
                { title: '视力色彩发展', content: '5个月宝宝色觉基本发育完善，能分辨红黄蓝等颜色。提供彩色玩具和绘本，丰富视觉刺激。', source: 'AAP', tags: ['视力', '色彩'] },
                { title: '听力发育', content: '能转头寻找声源，对音乐有反应。可以播放轻柔音乐，但音量不宜过大，避免噪音损伤听力。', source: 'AAP', tags: ['听力', '音乐'] }
            ],
            care: [
                { title: '口腔清洁', content: '即使还没长牙，也要每天用纱布蘸温水擦拭牙龈。出牙后用婴儿软毛牙刷和米粒大小含氟牙膏清洁。', source: 'AAP', tags: ['口腔', '清洁'] },
                { title: '穿衣指南', content: '宝宝活动量大容易出汗，穿和大人一样多或少一件。选纯棉透气材质，方便活动的连体衣。', source: '崔玉涛', tags: ['穿衣', '透气'] }
            ]
        },

        // ===== 6个月 =====
        6: {
            feeding: [
                { title: '辅食正式开始！', content: '6个月正式添加辅食。第一口推荐高铁米粉，从稀到稠、从少到多。每次只加一种新食物，观察3-5天无过敏再加新的。', source: '中国卫健委', tags: ['辅食', '米粉', '高铁'] },
                { title: '辅食添加顺序', content: '强化铁米粉→蔬菜泥（根茎类→叶菜）→水果泥→蛋黄→肉泥。1岁内不加盐糖蜂蜜，不喝鲜牛奶。', source: 'WHO', tags: ['辅食顺序', '禁忌'] },
                { title: 'BLW自主进食', content: 'Baby-Led Weaning让宝宝自己抓食物吃。提供蒸软的胡萝卜条、牛油果块等手指食物，锻炼手眼协调和咀嚼能力。', source: 'AAP', tags: ['BLW', '手指食物'] }
            ],
            education: [
                { title: '绘本阅读启蒙', content: '6个月可以开始读绘本了！选择色彩鲜艳、有触摸元素的纸板书。每天5-10分钟，指认图片、模仿声音。', source: 'AAP', tags: ['绘本', '阅读'] },
                { title: '感官瓶DIY', content: '空水瓶装入水+食用色素+亮片，拧紧瓶盖。宝宝摇晃、观察、追踪，锻炼视觉追踪和因果认知。注意瓶盖牢固。', source: 'AAP', tags: ['感官', 'DIY'] },
                { title: '躲猫猫升级版', content: '把玩具藏在毯子下让宝宝找，或照镜子指认五官。这些游戏培养客体永久性和自我认知。', source: 'AAP', tags: ['认知', '游戏'] }
            ],
            development: [
                { title: '独坐稳定', content: '6个月大多数宝宝能独坐片刻，7-8个月坐稳。用玩具吸引宝宝坐起，周围放靠垫保护。', source: 'AAP', tags: ['独坐', '大运动'] },
                { title: '抓握精准', content: '能用拇指和食指配合抓小物品（不完全捏取）。提供溶豆、小馒头练习精细抓握，注意看护防误吞。', source: '崔玉涛', tags: ['精细动作', '抓握'] },
                { title: '叫名字有反应', content: '6个月宝宝对自己的名字有明显反应，会转头寻找。多叫名字加强认知，这也是听力正常的体现。', source: 'AAP', tags: ['名字', '认知'] }
            ],
            sleep: [
                { title: '6个月睡眠倒退', content: '辅食添加、大运动发展可能导致再次睡眠倒退。保持作息规律，夜间醒来先观察不要立即干预。', source: 'AAP', tags: ['睡眠倒退', '夜醒'] },
                { title: '白天2次小睡', content: '6个月通常过渡到2次小睡：上午1-1.5小时+下午1-1.5小时。夜间睡眠10-12小时。总睡眠12-14小时。', source: 'WHO', tags: ['小睡', '睡眠时长'] }
            ],
            health: [
                { title: '6个月疫苗提醒', content: '需接种：乙肝疫苗第3剂、A群流脑多糖疫苗第1剂。6个月后还需接种手足口疫苗（自费推荐）。', source: '中国卫健委', tags: ['疫苗', '乙肝', '流脑'] },
                { title: '出牙护理', content: '大部分宝宝6个月开始长第一颗牙。出牙时可能烦躁、流口水、低烧。用硅胶牙胶冷藏后咬，按摩牙龈缓解不适。', source: '崔玉涛', tags: ['出牙', '牙胶', '护理'] },
                { title: '贫血筛查', content: '6个月体检建议查血常规，排查缺铁性贫血。辅食添加含铁食物（强化米粉、红肉泥、蛋黄）预防贫血。', source: 'AAP', tags: ['贫血', '血常规'] }
            ],
            care: [
                { title: '口腔清洁升级', content: '第一颗牙萌出后就开始刷牙！用婴儿软毛牙刷+米粒大小含氟牙膏，每天2次。不要奶睡，预防奶瓶龋。', source: 'AAP', tags: ['刷牙', '含氟', '防龋'] },
                { title: '防晒很重要', content: '6个月后可以使用婴儿专用防晒霜（SPF30+）。外出前20分钟涂抹，每2小时补涂。戴帽子、穿防晒衣。', source: 'AAP', tags: ['防晒', '户外'] }
            ]
        },

        // ===== 7-8个月 =====
        '7-8': {
            feeding: [
                { title: '辅食质地升级', content: '从泥糊状过渡到颗粒状、碎末状。可以吃肉末、碎菜、软烂的面条粥。锻炼咀嚼能力，不能一直吃糊糊。', source: '中国卫健委', tags: ['辅食', '质地', '咀嚼'] },
                { title: '蛋白质多样化', content: '蛋黄→蛋白（如不过敏）、鸡肉泥→鱼肉泥（注意去刺）、豆腐。每种新食物观察3天，留意过敏反应。', source: 'WHO', tags: ['蛋白质', '过敏'] },
                { title: '手指食物', content: '提供煮软的胡萝卜条、土豆块、香蕉段等，让宝宝自己抓着吃。锻炼手眼协调和自主进食能力。', source: 'AAP', tags: ['手指食物', '自主进食'] }
            ],
            education: [
                { title: '敲打游戏', content: '给宝宝两个积木或勺子，让他敲打出声。这锻炼手眼协调、因果关系和节奏感。', source: 'AAP', tags: ['敲打', '节奏'] },
                { title: '指认图片', content: '和宝宝一起看绘本，指着图片说名称："这是小狗，汪汪汪"。重复多次后问"小狗在哪里"，观察宝宝是否会指。', source: 'AAP', tags: ['绘本', '指认'] },
                { title: '容器游戏', content: '给宝宝一个箱子和几个球，教他把球放进箱子再拿出来。理解"里面""外面"的空间概念。', source: 'AAP', tags: ['空间', '认知'] }
            ],
            development: [
                { title: '爬行开始', content: '7-8个月开始学爬，先从腹部贴地匍匐前进，逐渐学会手膝爬行。多趴、多在地上活动是关键。', source: 'AAP', tags: ['爬行', '大运动'] },
                { title: '扶站出现', content: '8个月左右会扶着家具站立。确保家具稳固安全，尖角防护。不要用学步车，影响自然运动发展。', source: 'AAP', tags: ['扶站', '安全'] },
                { title: '拇指食指捏取', content: '8-9个月发展出精细的拇指食指对捏。用溶豆、小馒头练习，这是精细动作的重要里程碑。', source: '崔玉涛', tags: ['捏取', '精细动作'] }
            ],
            sleep: [
                { title: '分离焦虑高峰', content: '7-9个月分离焦虑达到高峰，睡前哭闹增多。保持耐心，固定的睡前仪式和安全依恋很重要。peek-a-boo有帮助。', source: 'AAP', tags: ['分离焦虑', '睡前'] },
                { title: '并觉到2次小睡', content: '白天2次小睡：上午9-10点+下午1-3点。部分宝宝开始抗拒第三次小睡。夜间睡眠10-12小时。', source: 'WHO', tags: ['小睡', '并觉'] }
            ],
            health: [
                { title: '8个月疫苗提醒', content: '8个月接种：麻腮风疫苗第1剂、乙脑减毒活疫苗第1剂。接种后1-2周可能出现轻微发热或皮疹，属正常反应。', source: '中国卫健委', tags: ['疫苗', '麻腮风', '乙脑'] },
                { title: '幼儿急疹', content: '6-18个月高发。突发高烧3-5天，退烧后全身出疹。高烧时注意降温补水，出疹后即痊愈，预后良好。', source: '崔玉涛', tags: ['幼儿急疹', '发烧'] }
            ],
            care: [
                { title: '家居安全全面升级', content: '宝宝会爬会扶站了！全面检查：楼梯口安装护栏、家具固定上墙、尖锐角防护、电线隐藏、小物品收好。', source: 'AAP', tags: ['安全', '防护', '爬行'] },
                { title: '学饮杯过渡', content: '8个月开始学习用鸭嘴杯或吸管杯喝水，减少奶瓶使用。1岁后尽量戒除奶瓶，预防龋齿和咬合问题。', source: 'AAP', tags: ['学饮杯', '戒奶瓶'] }
            ]
        },

        // ===== 9-10个月 =====
        '9-10': {
            feeding: [
                { title: '一日三餐规律', content: '9个月后辅食变成正餐，每天3次辅食+2-3次奶。奶量保持500-600ml，辅食提供一半以上营养。', source: '中国卫健委', tags: ['三餐', '奶量'] },
                { title: '自主进食鼓励', content: '给宝宝勺子让他尝试自己吃，虽然会弄脏。这是独立性和手眼协调的重要练习。准备防水围嘴和地垫。', source: 'AAP', tags: ['自主进食', '勺子'] },
                { title: '食物多样性', content: '每天谷物+蔬菜+水果+肉蛋+豆制品。颜色越丰富营养越均衡。避免单一食物，培养不挑食习惯。', source: 'WHO', tags: ['多样', '均衡'] }
            ],
            education: [
                { title: '叠积木', content: '9-10个月可以教宝宝把2-3块大积木叠起来。锻炼手眼协调和空间感。积木倒了的"倒塌声"也是乐趣。', source: 'AAP', tags: ['积木', '手眼协调'] },
                { title: '模仿动作', content: '宝宝开始模仿大人的动作：拍手、挥手再见、摇头。多做夸张的动作让宝宝模仿，配合语言"再见""好棒"。', source: 'AAP', tags: ['模仿', '动作'] },
                { title: '音乐律动', content: '播放节奏鲜明的音乐，和宝宝一起拍手、摇摆。音乐促进大脑发育和节奏感。可以引入简单打击乐器。', source: 'AAP', tags: ['音乐', '律动'] }
            ],
            development: [
                { title: '扶走开始', content: '9-10个月会扶着家具移步，部分宝宝能独站片刻。不要急于让宝宝走路，多爬行有助于核心力量和协调。', source: 'AAP', tags: ['扶走', '爬行'] },
                { title: '理解简单指令', content: '能理解"不行""给我""过来"等简单指令。会用手指指东西表示需求。这是语言理解的重要进步。', source: 'AAP', tags: ['指令', '语言理解'] },
                { title: '物件永久性', content: '当着宝宝面把玩具藏到毯子下，宝宝会主动掀开找。说明已理解物体看不见依然存在。', source: 'AAP', tags: ['认知', '客体永久性'] }
            ],
            sleep: [
                { title: '睡眠总量12-14小时', content: '9-10个月每天睡12-14小时，夜间10-11小时，白天2次小睡共2-3小时。部分宝宝开始抗拒下午小睡。', source: 'WHO', tags: ['睡眠时长'] },
                { title: '夜醒应对', content: '大运动发展（学站学走）可能导致夜醒。如宝宝夜间站起来无法自己坐下，及时帮助但少干预。', source: 'AAP', tags: ['夜醒', '大运动'] }
            ],
            health: [
                { title: '9个月体检+疫苗', content: '9个月体检：评估生长发育、营养状况。需接种A群流脑多糖疫苗第2剂。检查血红蛋白排查贫血。', source: '中国卫健委', tags: ['体检', '疫苗', '贫血'] },
                { title: '便秘常见', content: '辅食增多后可能出现便秘。增加水分和膳食纤维（蔬菜水果），适当添加西梅汁、火龙果通便。', source: '崔玉涛', tags: ['便秘', '膳食纤维'] }
            ],
            care: [
                { title: '牙齿护理', content: '已有4-8颗牙，每天早晚用软毛牙刷+米粒大小含氟牙膏刷牙。睡前刷牙后不喝奶，定期看牙医。', source: 'AAP', tags: ['刷牙', '含氟'] },
                { title: '如厕训练准备', content: '9-12个月可以开始如厕训练准备：让宝宝坐马桶玩一会，建立马桶=安全的认知。真正训练通常18个月后。', source: 'AAP', tags: ['如厕', '准备'] }
            ]
        },

        // ===== 11-12个月 =====
        '11-12': {
            feeding: [
                { title: '过渡到家庭饮食', content: '1岁前后辅食质地接近成人，可吃小块软烂的家庭餐。盐糖仍需少加，但不需单独做。奶量保持400-500ml。', source: '中国卫健委', tags: ['家庭餐', '过渡'] },
                { title: '1岁后喝纯牛奶', content: '1岁后可以从配方奶过渡到全脂纯牛奶。每天300-400ml即可，不要过量影响正餐。2岁前不喝脱脂奶。', source: 'AAP', tags: ['纯牛奶', '1岁'] },
                { title: '自主进食', content: '鼓励宝宝自己用勺子吃饭，虽然会弄得到处都是。这是独立性和精细动作的重要发展。多鼓励少批评。', source: 'AAP', tags: ['自主', '勺子'] }
            ],
            education: [
                { title: '绘本互动阅读', content: '1岁宝宝能指认书中图片，会"咿咿呀呀"讲故事。多问"这是什么""在哪里"，鼓励宝宝指和发声。', source: 'AAP', tags: ['绘本', '互动'] },
                { title: '形状分类', content: '提供形状分类盒（圆形、方形），教宝宝把对应形状投入孔中。锻炼形状认知和手眼协调。', source: 'AAP', tags: ['形状', '认知'] },
                { title: '涂鸦启蒙', content: '给大蜡笔和白纸，让宝宝自由涂鸦。虽然只是乱画，但这是书写能力发展的起点。用可水洗蜡笔。', source: 'AAP', tags: ['涂鸦', '蜡笔'] }
            ],
            development: [
                { title: '独走里程碑', content: '12-15个月大多数宝宝开始独走。先扶走→独站→迈步。多鼓励，跌倒不要大惊小怪。每个宝宝节奏不同。', source: 'AAP', tags: ['独走', '大运动'] },
                { title: '第一个有意义的词', content: '12个月左右说出第一个有意义的词，通常是"妈妈""爸爸"。多和宝宝说话，描述日常事物促进语言发展。', source: 'AAP', tags: ['语言', '第一个词'] },
                { title: '会用手势沟通', content: '会指东西、挥手、伸手要抱。这是非语言沟通的重要方式。积极回应宝宝的手势，鼓励表达。', source: 'AAP', tags: ['手势', '沟通'] }
            ],
            sleep: [
                { title: '并觉到1次', content: '12-18个月从2次小睡过渡到1次午后小睡（1-2小时）。并觉期可能烦躁，调整需要1-2周。夜间11-12小时。', source: 'WHO', tags: ['并觉', '小睡'] },
                { title: '睡眠仪式固定', content: '固定流程：洗澡→刷牙→讲故事→关灯→睡觉。每天同一时间同一顺序，帮助建立稳定的睡眠节律。', source: 'AAP', tags: ['仪式', '规律'] }
            ],
            health: [
                { title: '1岁疫苗提醒', content: '12个月需接种：水痘疫苗第1剂。18个月接种麻腮风第2剂、甲肝疫苗、百白破加强针。按时接种很重要。', source: '中国卫健委', tags: ['疫苗', '水痘'] },
                { title: '1岁体检', content: '全面体检：身高体重头围、运动发育评估、视力听力筛查。检查血红蛋白和维生素D水平。建立生长曲线。', source: 'AAP', tags: ['体检', '发育评估'] }
            ],
            care: [
                { title: '如厕训练信号', content: '能保持2小时干爽、对马桶感兴趣、能听懂简单指令、会拉裤子，说明准备好如厕训练了。通常18-24个月开始。', source: 'AAP', tags: ['如厕', '信号'] },
                { title: '断奶瓶', content: '1岁后逐步戒除奶瓶，改用杯子喝奶。奶瓶使用过久影响牙齿咬合和口腔发育。最晚18个月完全戒除。', source: 'AAP', tags: ['断奶瓶', '杯子'] }
            ]
        },

        // ===== 13-18个月 =====
        '13-18': {
            feeding: [
                { title: '培养自主进食', content: '让宝宝自己用勺子吃饭，虽然会弄脏。提供手指食物和半固体食物。自主进食能培养独立性、手眼协调和食欲调节。', source: 'AAP', tags: ['自主进食', '独立性'] },
                { title: '饮食多样化', content: '每天谷物+蔬菜+水果+肉蛋奶+豆制品。颜色越丰富越好。和大人同桌吃饭，培养良好饮食习惯。', source: 'WHO', tags: ['多样', '均衡'] },
                { title: '控制糖和加工食品', content: '1岁半后仍需控制糖、盐、油炸食品。避免果汁（即使鲜榨）、零食、含糖酸奶。培养清淡口味。', source: '中国卫健委', tags: ['控糖', '健康饮食'] }
            ],
            education: [
                { title: '绘本亲子共读', content: '每天固定时间读绘本15-20分钟。指认图片、问简单问题、模仿动物叫声。这是语言和认知发展的黄金期。', source: 'AAP', tags: ['绘本', '语言'] },
                { title: '积木搭建', content: '能叠3-6块积木。提供各种形状的积木自由搭建，锻炼空间认知、创造力和手眼协调。', source: 'AAP', tags: ['积木', '空间'] },
                { title: '角色扮演', content: '开始假装游戏：喂娃娃吃饭、打电话、开汽车。这是认知发展的重要里程碑，培养想象力和社交能力。', source: 'AAP', tags: ['角色扮演', '想象'] }
            ],
            development: [
                { title: '走路稳→跑', content: '15个月走路基本稳定，18个月开始小跑。多户外活动，提供安全空间自由活动。上下楼梯开始学习。', source: 'AAP', tags: ['走路', '跑步', '大运动'] },
                { title: '词汇爆发', content: '18个月能说10-20个单字，开始说两个字组合"妈妈抱"。多和宝宝说话、讲故事，语言输入越多输出越快。', source: 'AAP', tags: ['语言', '词汇'] },
                { title: '精细动作', content: '会翻书页（不是一页一页）、用蜡笔画线、叠积木。提供蜡笔、纸张、大拼图锻炼手部精细能力。', source: '崔玉涛', tags: ['精细动作', '画画'] }
            ],
            sleep: [
                { title: '1次午睡', content: '13-18个月每天1次午睡1.5-2小时，夜间11-12小时。总睡眠12-13小时。固定午睡时间有助于作息规律。', source: 'WHO', tags: ['午睡', '作息'] }
            ],
            health: [
                { title: '18个月疫苗', content: '18个月接种：麻腮风第2剂、甲肝减毒活疫苗、百白破第4剂（加强）。完成后基础免疫基本结束。', source: '中国卫健委', tags: ['疫苗', '加强'] },
                { title: '视力关注', content: '注意观察是否有斜视、对眼、频繁揉眼。限制屏幕时间（不建议18个月以下看屏幕）。多户外活动预防近视。', source: 'AAP', tags: ['视力', '屏幕'] }
            ],
            care: [
                { title: '如厕训练开始', content: '18个月左右可以开始如厕训练。买儿童马桶、固定时间坐一坐、成功时及时表扬。训练可能需要3-6个月。', source: 'AAP', tags: ['如厕', '训练'] },
                { title: '刷牙自理', content: '让宝宝自己拿牙刷刷，家长再帮忙补刷。用豌豆大小含氟牙膏。每半年看一次牙医，涂氟防龋。', source: 'AAP', tags: ['刷牙', '含氟', '牙医'] }
            ]
        },

        // ===== 19-24个月 =====
        '19-24': {
            feeding: [
                { title: '和大人同桌吃饭', content: '2岁宝宝基本可以吃家庭餐，注意少盐少油。培养坐在餐椅上专心吃饭的习惯，不追喂不看电视吃饭。', source: '中国卫健委', tags: ['餐桌', '习惯'] },
                { title: '牛奶适量', content: '每天300-400ml牛奶或酸奶即可，过多影响正餐食欲。可以吃少量奶酪。1岁半后可以尝试坚果酱（非整粒）。', source: 'AAP', tags: ['奶量', '适量'] }
            ],
            education: [
                { title: '颜色和形状认知', content: '2岁能认识红黄蓝等颜色和圆形方形。通过玩具、绘本、日常物品教颜色形状："红色的苹果""圆圆的球"。', source: 'AAP', tags: ['颜色', '形状', '认知'] },
                { title: '简单拼图', content: '2-4块的大拼图适合这个年龄段。从凹凸匹配的形状拼图开始，培养空间认知和问题解决能力。', source: 'AAP', tags: ['拼图', '认知'] },
                { title: '唱儿歌', content: '2岁宝宝喜欢音乐和儿歌。一起唱《小星星》《两只老虎》等，配合动作。促进语言、节奏和记忆力。', source: 'AAP', tags: ['儿歌', '音乐'] }
            ],
            development: [
                { title: '跑跳能力', content: '2岁能平稳跑步、双脚跳、踢球。多户外活动锻炼大运动。开始学上下楼梯（扶栏杆一步一步）。', source: 'AAP', tags: ['跑步', '跳跃', '大运动'] },
                { title: '说短句', content: '2岁能说2-3个字的短句"我要喝水""妈妈出去"。词汇量50-100个。如18个月仍无有意义单词需评估。', source: 'AAP', tags: ['语言', '短句'] },
                { title: '自理萌芽', content: '会自己脱袜子、拉下裤子、用勺子吃饭（会洒）。鼓励自己穿脱简单衣物，培养独立性。', source: 'AAP', tags: ['自理', '独立'] }
            ],
            sleep: [
                { title: '作息规律', content: '2岁每天睡11-12小时，白天1次午睡1-2小时。保持固定作息时间，周末也不要打乱太多。', source: 'WHO', tags: ['作息', '规律'] },
                { title: '抗拒入睡', content: '2岁左右可能抗拒午睡或 bedtime。坚持规律，提供安全感物品（小毯子/玩偶），温和但坚定地执行就寝时间。', source: 'AAP', tags: ['抗拒', '就寝'] }
            ],
            health: [
                { title: '2岁体检', content: '2岁全面体检：生长发育评估、语言和运动发育筛查、视力听力检查。关注生长曲线走势是否正常。', source: 'AAP', tags: ['体检', '发育'] },
                { title: '屏气发作', content: '部分宝宝哭闹厉害时会出现屏气、甚至嘴唇发紫。虽然吓人但通常无害，保持冷静、确保安全即可。3-4岁自愈。', source: '崔玉涛', tags: ['屏气', '情绪'] }
            ],
            care: [
                { title: '如厕训练进阶', content: '2岁左右大部分宝宝白天能控制大小便。夜间控制可能要到3-4岁。多表扬成功，不批评意外。', source: 'AAP', tags: ['如厕', '白天'] },
                { title: '规则意识', content: '2岁开始理解简单规则。建立基本安全规则（不碰插座、不摸热水），用简单语言解释"为什么不行"。', source: 'AAP', tags: ['规则', '安全'] }
            ]
        }
    }
};

/**
 * WHO 生长标准数据 (0-24个月)
 * 来源: WHO Child Growth Standards
 */
const WhoGrowth = {
    girl: {
        0:  { height: { p3:45.4, p15:47.0, p50:49.1, p85:51.3, p97:52.9 }, weight: { p3:2.4, p15:2.8, p50:3.2, p85:3.7, p97:4.0 } },
        1:  { height: { p3:49.8, p15:51.4, p50:53.7, p85:55.9, p97:57.6 }, weight: { p3:3.2, p15:3.6, p50:4.2, p85:4.8, p97:5.2 } },
        2:  { height: { p3:53.0, p15:54.7, p50:57.1, p85:59.4, p97:61.1 }, weight: { p3:3.9, p15:4.5, p50:5.1, p85:5.8, p97:6.3 } },
        3:  { height: { p3:55.6, p15:57.3, p50:59.8, p85:62.3, p97:64.0 }, weight: { p3:4.5, p15:5.2, p50:5.8, p85:6.6, p97:7.2 } },
        4:  { height: { p3:57.8, p15:59.6, p50:62.1, p85:64.7, p97:66.4 }, weight: { p3:5.0, p15:5.7, p50:6.4, p85:7.3, p97:7.9 } },
        5:  { height: { p3:59.6, p15:61.5, p50:64.0, p85:66.7, p97:68.5 }, weight: { p3:5.4, p15:6.1, p50:6.9, p85:7.8, p97:8.5 } },
        6:  { height: { p3:61.2, p15:63.1, p50:65.7, p85:68.5, p97:70.3 }, weight: { p3:5.7, p15:6.5, p50:7.3, p85:8.3, p97:9.0 } },
        7:  { height: { p3:62.7, p15:64.6, p50:67.3, p85:70.1, p97:72.0 }, weight: { p3:6.0, p15:6.8, p50:7.6, p85:8.7, p97:9.4 } },
        8:  { height: { p3:64.0, p15:66.0, p50:68.7, p85:71.7, p97:73.6 }, weight: { p3:6.3, p15:7.0, p50:7.9, p85:9.0, p97:9.8 } },
        9:  { height: { p3:65.3, p15:67.3, p50:70.1, p85:73.1, p97:75.1 }, weight: { p3:6.5, p15:7.3, p50:8.2, p85:9.3, p97:10.1 } },
        10: { height: { p3:66.5, p15:68.5, p50:71.5, p85:74.5, p97:76.5 }, weight: { p3:6.7, p15:7.5, p50:8.5, p85:9.6, p97:10.4 } },
        11: { height: { p3:67.7, p15:69.8, p50:72.8, p85:75.9, p97:77.9 }, weight: { p3:6.9, p15:7.7, p50:8.7, p85:9.9, p97:10.7 } },
        12: { height: { p3:68.9, p15:71.0, p50:74.0, p85:77.2, p97:79.3 }, weight: { p3:7.0, p15:7.9, p50:8.9, p85:10.2, p97:11.0 } },
        15: { height: { p3:72.2, p15:74.4, p50:77.5, p85:80.8, p97:83.0 }, weight: { p3:7.6, p15:8.5, p50:9.6, p85:10.9, p97:11.8 } },
        18: { height: { p3:75.0, p15:77.2, p50:80.7, p85:84.1, p97:86.4 }, weight: { p3:8.1, p15:9.1, p50:10.2, p85:11.6, p97:12.6 } },
        21: { height: { p3:77.7, p15:80.0, p50:83.6, p85:87.1, p97:89.5 }, weight: { p3:8.6, p15:9.6, p50:10.9, p85:12.3, p97:13.3 } },
        24: { height: { p3:80.0, p15:82.5, p50:86.4, p85:90.0, p97:92.5 }, weight: { p3:9.0, p15:10.2, p50:11.5, p85:13.0, p97:14.1 } },
    },
    boy: {
        0:  { height: { p3:46.1, p15:47.7, p50:49.9, p85:52.1, p97:53.7 }, weight: { p3:2.5, p15:2.9, p50:3.3, p85:3.8, p97:4.2 } },
        1:  { height: { p3:50.8, p15:52.4, p50:54.7, p85:57.0, p97:58.6 }, weight: { p3:3.4, p15:3.9, p50:4.5, p85:5.1, p97:5.5 } },
        2:  { height: { p3:54.4, p15:56.1, p50:58.4, p85:60.8, p97:62.5 }, weight: { p3:4.3, p15:4.9, p50:5.6, p85:6.3, p97:6.8 } },
        3:  { height: { p3:57.3, p15:59.1, p50:61.4, p85:63.9, p97:65.6 }, weight: { p3:5.0, p15:5.7, p50:6.4, p85:7.2, p97:7.8 } },
        4:  { height: { p3:59.7, p15:61.5, p50:63.9, p85:66.4, p97:68.2 }, weight: { p3:5.6, p15:6.3, p50:7.0, p85:7.9, p97:8.5 } },
        5:  { height: { p3:61.7, p15:63.6, p50:66.0, p85:68.6, p97:70.4 }, weight: { p3:6.0, p15:6.7, p50:7.5, p85:8.4, p97:9.1 } },
        6:  { height: { p3:63.4, p15:65.3, p50:67.8, p85:70.5, p97:72.3 }, weight: { p3:6.4, p15:7.1, p50:7.9, p85:8.9, p97:9.6 } },
        7:  { height: { p3:64.9, p15:66.9, p50:69.5, p85:72.2, p97:74.1 }, weight: { p3:6.7, p15:7.4, p50:8.3, p85:9.3, p97:10.1 } },
        8:  { height: { p3:66.3, p15:68.3, p50:71.0, p85:73.8, p97:75.7 }, weight: { p3:6.9, p15:7.7, p50:8.6, p85:9.7, p97:10.5 } },
        9:  { height: { p3:67.7, p15:69.7, p50:72.5, p85:75.3, p97:77.3 }, weight: { p3:7.2, p15:8.0, p50:8.9, p85:10.0, p97:10.9 } },
        10: { height: { p3:69.0, p15:71.1, p50:73.9, p85:76.8, p97:78.8 }, weight: { p3:7.4, p15:8.2, p50:9.2, p85:10.3, p97:11.2 } },
        11: { height: { p3:70.3, p15:72.4, p50:75.3, p85:78.2, p97:80.3 }, weight: { p3:7.6, p15:8.4, p50:9.4, p85:10.6, p97:11.5 } },
        12: { height: { p3:71.5, p15:73.7, p50:76.6, p85:79.6, p97:81.7 }, weight: { p3:7.8, p15:8.6, p50:9.6, p85:10.9, p97:11.8 } },
        15: { height: { p3:75.0, p15:77.3, p50:80.2, p85:83.3, p97:85.5 }, weight: { p3:8.4, p15:9.3, p50:10.4, p85:11.7, p97:12.7 } },
        18: { height: { p3:78.0, p15:80.4, p50:83.6, p85:86.8, p97:89.2 }, weight: { p3:9.0, p15:10.0, p50:11.2, p85:12.6, p97:13.7 } },
        21: { height: { p3:80.8, p15:83.3, p50:86.7, p85:90.0, p97:92.5 }, weight: { p3:9.5, p15:10.6, p50:11.9, p85:13.4, p97:14.6 } },
        24: { height: { p3:83.5, p15:86.1, p50:89.6, p85:93.0, p97:95.7 }, weight: { p3:10.1, p15:11.2, p50:12.7, p85:14.3, p97:15.5 } },
    }
};

/**
 * 中国免疫规划疫苗程序表
 * 来源: 中国国家免疫规划
 */
const VaccineSchedule = [
    { name: '乙肝疫苗', dose: 1, month: 0, desc: '出生24小时内' },
    { name: '卡介苗', dose: 1, month: 0, desc: '出生后尽早' },
    { name: '乙肝疫苗', dose: 2, month: 1, desc: '满月' },
    { name: '脊灰疫苗', dose: 1, month: 2, desc: '2月龄' },
    { name: '脊灰疫苗', dose: 2, month: 3, desc: '3月龄' },
    { name: '百白破', dose: 1, month: 3, desc: '3月龄' },
    { name: '脊灰疫苗', dose: 3, month: 4, desc: '4月龄' },
    { name: '百白破', dose: 2, month: 4, desc: '4月龄' },
    { name: '百白破', dose: 3, month: 5, desc: '5月龄' },
    { name: '乙肝疫苗', dose: 3, month: 6, desc: '6月龄' },
    { name: 'A群流脑', dose: 1, month: 6, desc: '6月龄' },
    { name: '麻腮风', dose: 1, month: 8, desc: '8月龄' },
    { name: '乙脑减毒活疫苗', dose: 1, month: 8, desc: '8月龄' },
    { name: 'A群流脑', dose: 2, month: 9, desc: '9月龄' },
    { name: '水痘疫苗', dose: 1, month: 12, desc: '12月龄（自费推荐）' },
    { name: '麻腮风', dose: 2, month: 18, desc: '18月龄' },
    { name: '甲肝减毒活疫苗', dose: 1, month: 18, desc: '18月龄' },
    { name: '百白破', dose: 4, month: 18, desc: '18月龄（加强）' },
    { name: '乙脑减毒活疫苗', dose: 2, month: 24, desc: '2岁' },
];

VaccineSchedule.getReminders = function(birthDate, vaccinated) {
    if (!birthDate) return [];
    const months = Math.floor((new Date() - new Date(birthDate)) / (1000*60*60*24*30.44));
    const nextMonth = months + 1;
    
    return this.filter(v => {
        if (v.month > nextMonth || v.month < months - 1) return false;
        const already = vaccinated.some(vac => 
            vac.vaccineName && vac.vaccineName.includes(v.name) && 
            (!vac.dose || vac.dose.includes(String(v.dose)) || v.dose === 1)
        );
        return !already;
    });
};
