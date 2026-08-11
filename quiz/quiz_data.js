// 纪念币每日一题 - 题库 (100题)
const QUIZ_QUESTIONS = [
  // ===== 发行量 (12题) =====
  {
    id: 1, category: "issuance",
    question: "下列纪念币中，哪一枚的发行量最小？",
    options: ["宁夏回族自治区成立三十周年", "中国人民银行成立四十周年", "中华人民共和国成立四十周年", "广西壮族自治区成立三十周年"],
    correctIndex: 0,
    explanation: "宁夏回族自治区成立三十周年发行量仅156万枚，是全部普通纪念币中发行量最小的品种。建行币206.8万枚紧随其后。"
  },
  {
    id: 2, category: "issuance",
    question: "以下哪枚纪念币的发行量最大？",
    options: ["抗战胜利70周年", "孙中山诞辰150周年", "航天纪念钞", "建军90周年"],
    correctIndex: 0,
    explanation: "抗战胜利70周年（2015）发行量高达5亿枚，是普通纪念币中发行量最大的品种之一。航天纪念钞发行3亿张。"
  },
  {
    id: 3, category: "issuance",
    question: "1988年发行的'建行币'（中国人民银行成立四十周年）发行量是多少？",
    options: ["156万枚", "206.8万枚", "450万枚", "1000万枚"],
    correctIndex: 1,
    explanation: "建行币发行量为206.8万枚，虽然比宁夏币（156万枚）略多，但因其特殊题材和高消耗，存世量极少。"
  },
  {
    id: 4, category: "issuance",
    question: "第二轮生肖纪念币中，发行量最大的是哪两枚？",
    options: ["二羊和二猴", "二猴和二鸡", "二狗和二猪", "二牛和二虎"],
    correctIndex: 1,
    explanation: "二轮猴（2016）和二轮鸡（2017）发行量均为5亿枚，是生肖币中发行量最大的品种。"
  },
  {
    id: 5, category: "issuance",
    question: "六运会纪念币（1987年）一套3枚，每枚的发行量是多少？",
    options: ["156万枚", "351万枚", "600万枚", "1000万枚"],
    correctIndex: 1,
    explanation: "六运会纪念币包含足球、体操、排球三枚，每枚发行351万枚，是早期稀有品种之一。"
  },
  {
    id: 6, category: "issuance",
    question: "第一轮生肖纪念币中，哪一枚的发行量最小？",
    options: ["2003年羊年（癸未）", "2004年猴年（甲申）", "2008年鼠年（戊子）", "2011年兔年（辛卯）"],
    correctIndex: 0,
    explanation: "一轮羊（2003年）以及2004-2008年的前6枚一轮生肖币，发行量均为1000万枚，是一轮生肖中发行量最小的批次。"
  },
  {
    id: 7, category: "issuance",
    question: "京剧艺术系列纪念币中，哪枚的发行量最大？",
    options: ["生角", "旦角", "净角", "三枚发行量相同"],
    correctIndex: 0,
    explanation: "京剧生角（2023年）是系列龙头，发行量6000万枚。旦角发行量5000万枚，净角6000万枚。"
  },
  {
    id: 8, category: "issuance",
    question: "2026年马年纪念币（丙午）的发行量是多少？",
    options: ["5000万枚", "8000万枚", "1亿枚", "1.2亿枚"],
    correctIndex: 2,
    explanation: "2026年马年纪念币发行量为1亿枚，与2025年蛇币、2024年龙币发行量相同。"
  },
  {
    id: 9, category: "issuance",
    question: "新疆维吾尔自治区成立30周年纪念币发行量是多少？",
    options: ["156万", "261.5万", "407.2万", "450万"],
    correctIndex: 3,
    explanation: "新疆自治区30周年（1985年）发行量450万枚，在五大自治区中发行量居中。"
  },
  {
    id: 10, category: "issuance",
    question: "第一轮生肖纪念币（2003-2014）中，发行量最大的是哪一枚？",
    options: ["2008年戊子（鼠）", "2012年壬辰（龙）", "2014年甲午（马）", "2013年癸巳（蛇）"],
    correctIndex: 2,
    explanation: "一轮马（2014年甲午）发行量1亿枚，是一轮生肖中发行量最大的品种。一轮生肖从1000万枚起步，呈逐年递增趋势。"
  },
  {
    id: 11, category: "issuance",
    question: "五大自治区纪念币中，发行量最大的是哪一枚？",
    options: ["西藏自治区成立20周年", "新疆维吾尔自治区成立30周年", "内蒙古自治区成立四十周年", "广西壮族自治区成立三十周年"],
    correctIndex: 2,
    explanation: "内蒙古自治区成立四十周年（1987年）发行量905.4万枚，是五大自治区中发行量最大的。宁夏仅156万枚为最小。"
  },
  {
    id: 12, category: "issuance",
    question: "第二轮生肖纪念币中，发行量最小的是哪一枚？",
    options: ["2015年乙未（羊）", "2016年丙申（猴）", "2024年甲辰（龙）", "2026年丙午（马）"],
    correctIndex: 0,
    explanation: "二轮羊（2015年）发行量8000万枚，是二轮生肖中发行量最小的品种，也是二轮生肖的龙头。"
  },

  // ===== 年份 (15题) =====
  {
    id: 13, category: "year",
    question: "中国第一套普通纪念币是哪一年发行的？",
    options: ["1980年", "1982年", "1984年", "1986年"],
    correctIndex: 2,
    explanation: "1984年发行了中华人民共和国成立三十五周年纪念币（一套3枚），是中国第一套普通纪念币。"
  },
  {
    id: 14, category: "year",
    question: "'建行币'（中国人民银行成立四十周年纪念币）是哪一年发行的？",
    options: ["1984年", "1986年", "1988年", "1990年"],
    correctIndex: 2,
    explanation: "建行币于1988年发行，面值1元，发行量206.8万枚，被收藏界称为'币王'。"
  },
  {
    id: 15, category: "year",
    question: "抗战胜利70周年普通纪念币是哪一年发行的？",
    options: ["2014年", "2015年", "2016年", "2017年"],
    correctIndex: 1,
    explanation: "2015年发行中国人民抗日战争暨世界反法西斯战争胜利70周年纪念币，发行量高达5亿枚。"
  },
  {
    id: 16, category: "year",
    question: "中国航天纪念钞是哪一年发行的？",
    options: ["2013年", "2014年", "2015年", "2016年"],
    correctIndex: 2,
    explanation: "航天纪念钞于2015年发行，面值100元，发行量3亿张，是中国发行的第四张纪念钞。"
  },
  {
    id: 17, category: "year",
    question: "第二轮生肖纪念币是从哪一年开始发行的？",
    options: ["2013年", "2014年", "2015年", "2016年"],
    correctIndex: 2,
    explanation: "2015年发行二轮羊（乙未），开启了第二轮生肖纪念币系列，面值10元，发行量8000万枚。"
  },
  {
    id: 18, category: "year",
    question: "西藏自治区成立20周年纪念币是哪一年发行的？",
    options: ["1984年", "1985年", "1986年", "1988年"],
    correctIndex: 1,
    explanation: "庆祝西藏自治区成立20周年纪念币于1985年发行，面值1元，发行量261.5万枚，是五大自治区纪念币的第一枚。"
  },
  {
    id: 19, category: "year",
    question: "2008年北京奥运会普通纪念币共发行了几枚？",
    options: ["3枚", "5枚", "8枚", "10枚"],
    correctIndex: 2,
    explanation: "北京奥运会普通纪念币于2006-2008年分三组发行，共8枚，每枚面值1元。"
  },
  {
    id: 20, category: "year",
    question: "中国珍稀野生动物系列纪念币（大熊猫）是哪一年开始发行的？",
    options: ["1990年", "1991年", "1993年", "1995年"],
    correctIndex: 2,
    explanation: "大熊猫纪念币于1993年发行，面值5元，发行量600万枚，材质为紫铜合金，是珍稀动物系列的龙头。"
  },
  {
    id: 21, category: "year",
    question: "第一轮生肖纪念币持续了多少年？",
    options: ["8年", "10年", "12年", "14年"],
    correctIndex: 2,
    explanation: "一轮生肖从2003年羊年（癸未）至2014年马年（甲午），完整覆盖12生肖。面值均为1元。"
  },
  {
    id: 22, category: "year",
    question: "京剧艺术系列纪念币（生角）是哪一年发行的？",
    options: ["2021年", "2022年", "2023年", "2024年"],
    correctIndex: 2,
    explanation: "中国京剧艺术（生角）纪念币于2023年发行，面值5元，发行量6000万枚，是京剧系列的第一枚。"
  },
  {
    id: 23, category: "year",
    question: "2024年发行的龙年纪念币属于第几轮生肖？",
    options: ["第一轮生肖", "第二轮生肖", "第三轮生肖", "贺岁金银币系列"],
    correctIndex: 1,
    explanation: "2024年龙年纪念币（甲辰）属于第二轮生肖系列，面值10元，发行量1.2亿枚。同时发行了龙年纪念钞。"
  },
  {
    id: 24, category: "year",
    question: "'和'字书法系列纪念币最后一枚（楷书）是哪一年发行的？",
    options: ["2013年", "2015年", "2017年", "2019年"],
    correctIndex: 2,
    explanation: "'和'字书法—楷书于2017年发行，是该系列第5枚（篆、隶、行、草、楷），发行量2.5亿枚。"
  },
  {
    id: 25, category: "year",
    question: "香港回归祖国普通纪念币是哪一年发行的？",
    options: ["1996年", "1997年", "1998年", "1999年"],
    correctIndex: 1,
    explanation: "香港回归祖国纪念币于1997年发行，一套2枚（基本法和维多利亚港），面值均为1元。"
  },
  {
    id: 26, category: "year",
    question: "世界文化遗产系列纪念币从哪一年开始发行？",
    options: ["2000年", "2001年", "2002年", "2003年"],
    correctIndex: 2,
    explanation: "2002年首发万里长城和秦始皇陵及兵马俑坑两枚，开启了世界文化遗产系列，共发行10枚。"
  },
  {
    id: 27, category: "year",
    question: "澳门回归祖国普通纪念币是哪一年发行的？",
    options: ["1997年", "1998年", "1999年", "2000年"],
    correctIndex: 2,
    explanation: "澳门回归祖国纪念币于1999年发行，同样是一套2枚（基本法和妈祖阁/帆船），面值均为1元。"
  },

  // ===== 主题 (15题) =====
  {
    id: 28, category: "theme",
    question: "下列哪枚纪念币不属于'自治区'主题？",
    options: ["西藏自治区成立20周年", "新疆维吾尔自治区成立30周年", "宁夏回族自治区成立三十周年", "建国四十周年"],
    correctIndex: 3,
    explanation: "建国四十周年属于'建国'主题。五大自治区纪念币分别是西藏(1985)、新疆(1985)、内蒙古(1987)、宁夏(1988)、广西(1988)。"
  },
  {
    id: 29, category: "theme",
    question: "中国普通纪念币中，哪个主题的品种数量最多？",
    options: ["生肖系列", "国内事件", "奥运系列", "珍稀动物"],
    correctIndex: 1,
    explanation: "国内事件主题有13枚纪念币，是第一大主题。奥运（13枚）和生肖（一轮+二轮共24枚）分列其后。"
  },
  {
    id: 30, category: "theme",
    question: "'宝岛台湾'系列纪念币包含几枚？",
    options: ["3枚", "4枚", "5枚", "6枚"],
    correctIndex: 2,
    explanation: "'宝岛台湾'系列共5枚，分别表现了朝天宫、赤嵌楼、鹅銮鼻、日月潭和敬字亭。面值均为5元。"
  },
  {
    id: 31, category: "theme",
    question: "世界文化遗产系列纪念币总共发行了多少枚？",
    options: ["5枚", "8枚", "10枚", "12枚"],
    correctIndex: 2,
    explanation: "世界文化遗产系列从2002年至2006年共发行10枚，每枚面值5元，包括万里长城、秦始皇陵、曲阜孔庙、明清故宫等。"
  },
  {
    id: 32, category: "theme",
    question: "下列哪个不是中国普通纪念币的正式主题？",
    options: ["珍稀动物", "世界双遗", "中国科技", "民间传说"],
    correctIndex: 3,
    explanation: "珍稀动物（大熊猫、金丝猴等）、世界双遗（泰山、黄山等）、中国科技（航天、高铁等）都是正式主题。民间传说并非普通纪念币主题。"
  },
  {
    id: 33, category: "theme",
    question: "'伟人诞辰'系列纪念币共发行了几位伟人的纪念币？",
    options: ["5位", "6位", "7位", "8位"],
    correctIndex: 3,
    explanation: "伟人系列共8位：毛泽东、周恩来、刘少奇、朱德、邓小平、宋庆龄、陈云、孙中山。"
  },
  {
    id: 34, category: "theme",
    question: "建党系列纪念币中，最早发行的是哪一枚？",
    options: ["建党70周年", "建党80周年", "建党90周年", "建党100周年"],
    correctIndex: 0,
    explanation: "中国共产党成立七十周年纪念币于1991年发行，一套3枚，面值均为1元，是最早的建党主题纪念币。"
  },
  {
    id: 35, category: "theme",
    question: "奥运主题纪念币（2008年北京奥运会）属于什么大类？",
    options: ["国内事件", "体育赛事", "国际事件", "单独主题"],
    correctIndex: 1,
    explanation: "奥运纪念币属于体育赛事大类。中国普通纪念币中体育赛事类共8枚（奥运8枚）。"
  },
  {
    id: 36, category: "theme",
    question: "国家公园系列纪念币的第一批是哪两个？",
    options: ["三江源和大熊猫", "东北虎豹和海南热带雨林", "三江源和武夷山", "大熊猫和东北虎豹"],
    correctIndex: 0,
    explanation: "国家公园系列于2023年首发三江源国家公园和大熊猫国家公园两枚，面值10元，发行量各8000万枚。"
  },
  {
    id: 37, category: "theme",
    question: "以下哪枚纪念币属于'国际事件'主题？",
    options: ["抗战胜利五十周年", "国际和平年", "建国五十周年", "香港回归"],
    correctIndex: 1,
    explanation: "国际和平年（1986年）属于国际事件主题。抗战胜利属于抗日胜利主题，建国属于建国主题，香港回归属于特区主题。"
  },
  {
    id: 38, category: "theme",
    question: "'环境保护'主题纪念币目前有几枚？",
    options: ["1枚", "2枚", "3枚", "4枚"],
    correctIndex: 1,
    explanation: "环境保护主题目前有2枚：环境保护—关注（2009年）和环境保护—参与（2010年），均为1元面值。"
  },
  {
    id: 39, category: "theme",
    question: "以下哪枚纪念币不属于'特区'主题？",
    options: ["香港回归祖国", "澳门回归祖国", "庆祝改革开放40周年", "香港特别行政区成立"],
    correctIndex: 2,
    explanation: "庆祝改革开放40周年属于'国内事件'主题。香港回归、澳门回归、香港特区成立均属于'特区'主题。"
  },
  {
    id: 40, category: "theme",
    question: "以下哪枚纪念币不属于'体育赛事'主题？",
    options: ["第十一届亚运会", "第一届世界女足锦标赛", "第43届世界乒乓球锦标赛", "国际和平年"],
    correctIndex: 3,
    explanation: "国际和平年属于'国际事件'主题。亚运会、女足锦标赛和乒乓球世锦赛都属于'体育赛事'主题。"
  },
  {
    id: 41, category: "theme",
    question: "万里长城和秦始皇陵纪念币同属哪个主题系列？",
    options: ["世界双遗系列", "世界文化遗产系列", "国家公园系列", "宝岛台湾系列"],
    correctIndex: 1,
    explanation: "万里长城和秦始皇陵及兵马俑坑都是世界文化遗产，2002年作为该系列的首次发行，面值5元。"
  },
  {
    id: 42, category: "theme",
    question: "以下哪组纪念币属于同一主题系列？",
    options: ["泰山和万里长城", "黄山和峨眉山", "三江源和苏州园林", "颐和园和武夷山"],
    correctIndex: 1,
    explanation: "黄山和峨眉山-乐山大佛都属于'世界双遗'系列。泰山也是双遗，但万里长城是世界文化遗产，二者不同系列。"
  },

  // ===== 材质 (11题) =====
  {
    id: 43, category: "metal",
    question: "中国普通纪念币中使用最多的材质是什么？",
    options: ["铜镍合金", "钢芯镀镍", "黄铜合金", "双色铜合金"],
    correctIndex: 2,
    explanation: "黄铜合金用于53枚纪念币，是最多的材质。双色铜合金29枚、钢芯镀镍27枚、铜镍合金11枚紧随其后。"
  },
  {
    id: 44, category: "metal",
    question: "珍稀野生动物系列纪念币（大熊猫等）使用的是什么特殊材质？",
    options: ["黄铜合金", "铜镍合金", "紫铜合金", "钢芯镀镍"],
    correctIndex: 2,
    explanation: "珍稀动物系列（10枚）均采用紫铜合金材质，呈现出独特的紫红色泽，与其他纪念币明显不同。"
  },
  {
    id: 45, category: "metal",
    question: "早期纪念币（1984-1989年）主要使用什么材质？",
    options: ["黄铜合金", "铜镍合金", "双色铜合金", "钢芯镀镍"],
    correctIndex: 1,
    explanation: "1984-1989年的早期纪念币（如建国35周年、五大自治区、建行币等）均使用铜镍合金材质，呈银白色。"
  },
  {
    id: 46, category: "metal",
    question: "从哪一年开始，普通纪念币大规模使用双色铜合金材质？",
    options: ["1990年", "1995年", "1999年", "2010年"],
    correctIndex: 2,
    explanation: "1999年发行的建国50周年纪念币首次使用双色铜合金（外黄内白），此后该工艺被广泛用于生肖、国家公园等系列。"
  },
  {
    id: 47, category: "metal",
    question: "中国纪念钞中，哪种材质的纪念钞发行数量更多？",
    options: ["纸钞", "塑料钞", "两者数量相当", "没有纪念钞"],
    correctIndex: 2,
    explanation: "纸钞（建国钞、龙钞、奥运钞、航天钞）和塑料钞（千禧龙钞、蛇钞、马钞等）各有5枚左右，数量相当。"
  },
  {
    id: 48, category: "metal",
    question: "第二轮生肖纪念币（2015年起）使用的是什么材质？",
    options: ["铜镍合金", "黄铜合金", "双色铜合金", "钢芯镀镍"],
    correctIndex: 2,
    explanation: "二轮生肖币全部采用双色铜合金材质，外圈金黄色、内芯银白色，面值10元，直径27mm。"
  },
  {
    id: 49, category: "metal",
    question: "以下哪种材质在普通纪念币中从未被使用过？",
    options: ["铜锌合金", "镍包钢", "黄铜合金", "铝合金"],
    correctIndex: 3,
    explanation: "铝合金从未用于中国普通纪念币。铜锌合金用于希望工程等，镍包钢用于宪法颁布十周年等，黄铜合金是最常用的材质。"
  },
  {
    id: 50, category: "metal",
    question: "世界文化遗产系列纪念币（万里长城等）使用什么材质？",
    options: ["铜镍合金", "黄铜合金", "钢芯镀镍", "紫铜合金"],
    correctIndex: 1,
    explanation: "世界文化遗产系列（10枚）均使用黄铜合金材质，面值5元，直径30mm。"
  },
  {
    id: 51, category: "metal",
    question: "'镍包钢'这种材质在中国普通纪念币中用于哪枚硬币？",
    options: ["建国四十周年", "亚运会", "宪法颁布十周年", "希望工程"],
    correctIndex: 2,
    explanation: "宪法颁布十周年（1992年）使用了镍包钢材质，这是普通纪念币中唯一一次使用该材质。"
  },
  {
    id: 52, category: "metal",
    question: "钢芯镀镍材质的纪念币通常面值是多少？",
    options: ["1元", "5元", "10元", "以上都有"],
    correctIndex: 0,
    explanation: "钢芯镀镍材质的纪念币面值均为1元，包括伟人系列、台湾系列等。这种材质呈银白色，成本较低。"
  },
  {
    id: 53, category: "metal",
    question: "铜镍合金材质的纪念币外观呈现什么颜色？",
    options: ["金黄色", "银白色", "紫红色", "黄白双色"],
    correctIndex: 1,
    explanation: "铜镍合金材质呈银白色，是1984-1989年早期纪念币的主要材质。黄铜合金呈金黄色，紫铜合金呈紫红色。"
  },

  // ===== 造币厂 (12题) =====
  {
    id: 54, category: "mint",
    question: "哪个造币厂参与制造了最多的中国普通纪念币？",
    options: ["上海造币厂", "沈阳造币厂", "南京造币厂", "北京造币厂"],
    correctIndex: 1,
    explanation: "沈阳造币厂参与了67枚纪念币的制造，是最多的。上海造币厂以37枚居第二位。"
  },
  {
    id: 55, category: "mint",
    question: "五大自治区纪念币中，有几枚是由单一造币厂制造的？",
    options: ["0枚（全部多厂制造）", "2枚", "3枚", "5枚（全部单厂制造）"],
    correctIndex: 3,
    explanation: "五大自治区纪念币全部为单一造币厂制造：西藏(1985)和新疆(1985)由上海造币厂独家制造，内蒙古(1987)、宁夏(1988)和广西(1988)由沈阳造币厂独家制造。"
  },
  {
    id: 56, category: "mint",
    question: "南京造币厂主要在哪一年代开始参与纪念币制造？",
    options: ["1980年代", "1990年代", "2000年代", "2010年代"],
    correctIndex: 2,
    explanation: "南京造币厂从2000年代开始参与制造，共参与14枚纪念币，在沈阳和上海之后排第三位。"
  },
  {
    id: 57, category: "mint",
    question: "以下哪枚纪念币是由上海造币厂单独制造的？",
    options: ["建国三十五周年", "庆祝西藏自治区成立20周年", "国际和平年", "第十一届亚运会"],
    correctIndex: 1,
    explanation: "西藏自治区成立20周年由上海造币厂单独制造。建国35周年和国际和平年由沈阳和上海双厂制造，亚运会由上海造币厂单独制造。"
  },
  {
    id: 58, category: "mint",
    question: "2026年马年纪念币由哪家造币厂制造？",
    options: ["沈阳造币厂", "上海造币厂", "沈阳和上海双厂", "南京造币厂"],
    correctIndex: 2,
    explanation: "马年纪念币（2026）由沈阳和上海双厂联合制造，与近年大多数生肖纪念币相同。"
  },
  {
    id: 59, category: "mint",
    question: "以下哪个造币厂制造了最少的纪念币品种？",
    options: ["上海造币厂", "南京造币厂", "北京造币厂", "广州造币厂"],
    correctIndex: 3,
    explanation: "广州造币厂仅参与2枚纪念币的制造，是参与最少的造币厂。"
  },
  {
    id: 60, category: "mint",
    question: "纪念钞主要由什么机构制造？",
    options: ["沈阳造币厂", "上海造币厂", "北京印钞厂和上海印钞厂", "南京造币厂"],
    correctIndex: 2,
    explanation: "纪念钞由印钞厂制造（非造币厂），主要由北京印钞厂和上海印钞厂承担，与纸币制造体系相同。"
  },
  {
    id: 61, category: "mint",
    question: "由上海造币厂单独制造的纪念币通常被认为有什么特点？",
    options: ["没有特殊特征", "币面带有'S'标记", "通常被收藏者认为制作更精美", "发行量更大"],
    correctIndex: 2,
    explanation: "上海造币厂单独制造的品种通常被收藏者认为币面制作更为精美，有时会有微小的版别差异。"
  },
  {
    id: 62, category: "mint",
    question: "中国普通纪念币中，单厂制造和双厂制造的比例如何？",
    options: ["几乎全是单厂制造", "几乎全是双厂制造", "约78%单厂、22%双厂", "约50%:50%"],
    correctIndex: 2,
    explanation: "大部分纪念币为单一造币厂制造，两家或以上造币厂联合制造的情况约占22%。"
  },
  {
    id: 63, category: "mint",
    question: "1984年发行的建国三十五周年纪念币由哪些造币厂制造？",
    options: ["仅沈阳", "仅上海", "沈阳和上海", "沈阳、上海和南京"],
    correctIndex: 2,
    explanation: "建国三十五周年纪念币（一套3枚）由沈阳和上海两家造币厂联合制造，是最早的双厂制造纪念币。"
  },
  {
    id: 64, category: "mint",
    question: "沈阳造币厂始建于哪一年？",
    options: ["1896年", "1905年", "1920年", "1949年"],
    correctIndex: 0,
    explanation: "沈阳造币厂始建于1896年（清光绪二十二年），是中国历史最悠久的造币厂之一。"
  },
  {
    id: 65, category: "mint",
    question: "中国普通纪念币制造量最大的两家造币厂是？",
    options: ["沈阳和南京", "上海和南京", "沈阳和上海", "北京和上海"],
    correctIndex: 2,
    explanation: "沈阳造币厂和上海造币厂合计参与了约85%以上普通纪念币的制造，是中国纪念币制造的绝对主力。"
  },

  // ===== 面值 (10题) =====
  {
    id: 66, category: "denomination",
    question: "中国普通纪念币中最常见的面值是多少？",
    options: ["1角", "1元", "5元", "10元"],
    correctIndex: 1,
    explanation: "1元面值有63枚，是最常见的面值。5元面值41枚居第二，10元面值31枚居第三。"
  },
  {
    id: 67, category: "denomination",
    question: "下列哪枚纪念币面值不是1元？",
    options: ["建行币（人行四十周年）", "建国三十五周年", "宋庆龄诞辰100周年", "政协成立五十周年"],
    correctIndex: 2,
    explanation: "宋庆龄诞辰100周年面值为5元，不是1元。建行币、建国三十五周年均为1元面值。"
  },
  {
    id: 68, category: "denomination",
    question: "面值100元的纪念钞有哪些？",
    options: ["航天钞", "建国钞和航天钞", "龙钞和蛇钞", "以上全是"],
    correctIndex: 1,
    explanation: "建国50周年纪念钞（1999年）和航天纪念钞（2015年）面值均为100元。生肖纪念钞面值为20元。"
  },
  {
    id: 69, category: "denomination",
    question: "中国普通纪念币中面值最小的是多少？",
    options: ["1分", "1角", "5角", "1元"],
    correctIndex: 1,
    explanation: "第六届全国运动会纪念币（1987年）面值为1角，一套3枚，是普通纪念币中面值最小的品种。"
  },
  {
    id: 70, category: "denomination",
    question: "世界文化遗产系列纪念币的面值是多少？",
    options: ["1元", "5元", "10元", "20元"],
    correctIndex: 1,
    explanation: "世界文化遗产系列（10枚）面值均为5元，材质为黄铜合金，直径30mm。"
  },
  {
    id: 71, category: "denomination",
    question: "2024-2026年发行的生肖纪念钞面值是多少？",
    options: ["10元", "20元", "50元", "100元"],
    correctIndex: 1,
    explanation: "2024龙钞、2025蛇钞、2026马钞面值均为20元，材质为塑料钞。"
  },
  {
    id: 72, category: "denomination",
    question: "下列哪枚纪念币面值与其他三枚不同？",
    options: ["珍稀野生动物—大熊猫", "毛泽东诞辰100周年", "香港回归祖国", "澳门回归祖国"],
    correctIndex: 0,
    explanation: "大熊猫为5元面值。毛泽东（钢芯镀镍）、香港回归、澳门回归均为1元面值。"
  },
  {
    id: 73, category: "denomination",
    question: "双色铜合金纪念币的面值通常是？",
    options: ["1元", "5元", "10元", "20元"],
    correctIndex: 2,
    explanation: "双色铜合金纪念币面值主要为10元，包括二轮生肖系列、国家公园系列、建党100周年等。"
  },
  {
    id: 74, category: "denomination",
    question: "以下哪枚纪念币的面值不是5元？",
    options: ["珍稀野生动物—大熊猫", "世界文化遗产—万里长城", "毛泽东诞辰100周年", "泰山纪念币"],
    correctIndex: 2,
    explanation: "毛泽东诞辰100周年面值为1元（钢芯镀镍材质）。大熊猫、万里长城和泰山纪念币的面值均为5元。"
  },
  {
    id: 75, category: "denomination",
    question: "第一轮生肖纪念币（2003-2014）的面值是多少？",
    options: ["1元", "5元", "10元", "20元"],
    correctIndex: 0,
    explanation: "一轮生肖12枚面值均为1元，材质为黄铜合金，直径25mm。二轮生肖（2015年起）面值改为10元。"
  },

  // ===== 名称匹配与描述 (16题) =====
  {
    id: 76, category: "name-match",
    question: "哪枚纪念币被称为中国普通纪念币中的'币王'？",
    options: ["建国三十五周年", "宁夏自治区三十周年", "中国人民银行成立四十周年（建行币）", "六运会纪念币"],
    correctIndex: 2,
    explanation: "建行币（1988年）发行量206.8万枚，虽然发行量并非最小，但其特殊题材和高消耗使其存世量极少，被收藏界公认为'币王'。"
  },
  {
    id: 77, category: "name-match",
    question: "哪枚纪念币的背面图案中包含了毛泽东等领导人在天安门城楼上的形象？",
    options: ["建国三十五周年—祖国万岁", "建国三十五周年—民族大团结", "建国三十五周年—开国大典", "毛泽东诞辰100周年"],
    correctIndex: 2,
    explanation: "建国三十五周年—开国大典的背面图案为1949年10月1日毛泽东等领导同志在天安门城楼上举行开国大典的场景。"
  },
  {
    id: 78, category: "name-match",
    question: "以下哪枚纪念币不属于中国珍稀野生动物系列？",
    options: ["大熊猫", "金丝猴", "丹顶鹤", "中华鲟"],
    correctIndex: 2,
    explanation: "丹顶鹤不属于珍稀动物系列。该系列10枚包括大熊猫、金丝猴、白鳍豚、华南虎、朱鹮、中华鲟、金斑喙凤蝶等。"
  },
  {
    id: 79, category: "name-match",
    question: "六运会纪念币上的三个运动项目分别是什么？",
    options: ["足球、篮球、排球", "足球、体操、排球", "乒乓球、体操、游泳", "足球、田径、排球"],
    correctIndex: 1,
    explanation: "六运会纪念币（1987年）一套3枚，分别为足球、体操和排球项目，面值1角，是面值最小的普通纪念币。"
  },
  {
    id: 80, category: "name-match",
    question: "哪枚纪念币的背面图案包含布达拉宫？",
    options: ["新疆自治区成立30周年", "西藏自治区成立20周年", "宁夏自治区成立三十周年", "内蒙古自治区成立四十周年"],
    correctIndex: 1,
    explanation: "庆祝西藏自治区成立20周年（1985年）的背面图案为布达拉宫，面值1元，发行量261.5万枚。"
  },
  {
    id: 81, category: "name-match",
    question: "'和'字书法系列纪念币按照什么顺序发行？",
    options: ["楷、行、草、隶、篆", "篆、隶、行、草、楷", "行、草、楷、隶、篆", "草、行、隶、篆、楷"],
    correctIndex: 1,
    explanation: "'和'字书法系列按篆书→隶书→行书→草书→楷书的顺序发行，分别为2009、2010、2013、2014、2017年。"
  },
  {
    id: 82, category: "name-match",
    question: "下列哪枚币上出现了地球和鸽子图案？",
    options: ["国际和平年", "联合国成立五十周年", "国际妇女年", "世界粮食日"],
    correctIndex: 0,
    explanation: "国际和平年（1986年）正面图案为国徽，背面为'和平'雕像、地球和鸽子，面值1元，发行量2704.8万枚。"
  },
  {
    id: 83, category: "name-match",
    question: "纪念币上的'华表'图案出现在哪枚币上？",
    options: ["建国四十周年", "建国三十五周年—祖国万岁", "建党七十周年", "建国五十周年"],
    correctIndex: 1,
    explanation: "建国三十五周年—祖国万岁的背面图案为华表、松树、仙鹤和长城组成的象征祖国万岁的图案。"
  },
  {
    id: 84, category: "name-match",
    question: "下列哪组币上集中出现了汉、蒙、藏、维和高山族人物形象？",
    options: ["建国三十五周年—祖国万岁", "建国三十五周年—民族大团结", "建国四十周年", "建党七十周年"],
    correctIndex: 1,
    explanation: "建国三十五周年—民族大团结的背面图案包含汉、蒙、藏、维和高山族人物形象，象征民族大团结。"
  },
  {
    id: 85, category: "name-match",
    question: "京剧艺术纪念币系列分别表现为哪些行当？",
    options: ["生、旦、净、末", "生、旦、净、丑", "生、旦、净（已发行的3枚）", "梅、程、荀、尚"],
    correctIndex: 2,
    explanation: "京剧艺术系列目前已发行3枚：生角（2023年）、旦角（2024年）、净角（2025年），分别对应京剧三大行当。"
  },
  {
    id: 86, category: "name-match",
    question: "香港回归和澳门回归纪念币分别在哪年发行？",
    options: ["都是1997年", "1997年和1999年", "1999年和1999年", "1997年和1998年"],
    correctIndex: 1,
    explanation: "香港回归纪念币于1997年发行（一套2枚），澳门回归纪念币于1999年发行（一套2枚）。面值均为1元。"
  },
  {
    id: 87, category: "name-match",
    question: "'世界双遗'系列纪念币中的第一枚是？",
    options: ["黄山", "泰山", "武夷山", "峨眉山—乐山大佛"],
    correctIndex: 1,
    explanation: "泰山纪念币（2019年）是世界文化和自然双遗产系列的第一枚，面值5元，形状为圆角正方形（异形币）。"
  },
  {
    id: 88, category: "name-match",
    question: "世界文化遗产系列中，哪一枚表现了'秦始皇陵及兵马俑坑'？",
    options: ["第一枚", "第二枚", "第三枚", "第五枚"],
    correctIndex: 1,
    explanation: "秦始皇陵及兵马俑坑是世界文化遗产系列的第二枚，与第一枚万里长城同于2002年发行，面值5元。"
  },
  {
    id: 89, category: "name-match",
    question: "以下哪枚纪念币的正面图案中出现了'天安门'而非国徽？",
    options: ["建国三十五周年", "建党七十周年", "建国四十周年", "毛泽东诞辰100周年"],
    correctIndex: 0,
    explanation: "建国三十五周年纪念币的正面图案为国徽、天安门广场及礼花。其他大多数纪念币正面仅为国徽。"
  },
  {
    id: 90, category: "name-match",
    question: "以下哪枚纪念币的背面图案中出现了'遵义会议会址'？",
    options: ["建国三十五周年", "建党七十周年（遵义会议）", "建党八十周年", "抗战胜利50周年"],
    correctIndex: 1,
    explanation: "建党七十周年纪念币一套3枚，分别表现中共一大、遵义会议和十一届三中全会会址，每枚面值1元。"
  },
  {
    id: 91, category: "name-match",
    question: "'环境保护'系列纪念币两枚的名称分别是什么？",
    options: ["关注和参与", "节能和减排", "绿色和环保", "低碳和生态"],
    correctIndex: 0,
    explanation: "环境保护系列两枚分别命名为'关注'（2009年）和'参与'（2010年），面值均为1元，呼吁公众关注和参与环保。"
  },

  // ===== 直径/尺寸 (8题) =====
  {
    id: 92, category: "size",
    question: "中国普通纪念币中最常见的直径是多少？",
    options: ["20mm", "25mm", "30mm", "32mm"],
    correctIndex: 1,
    explanation: "25mm直径的纪念币有50枚，是最常见的规格。30mm有44枚、27mm有24枚。"
  },
  {
    id: 93, category: "size",
    question: "二轮生肖纪念币（2015年起）的直径是多少？",
    options: ["25mm", "27mm", "30mm", "32mm"],
    correctIndex: 1,
    explanation: "二轮生肖纪念币直径均为27mm，面值10元，双色铜合金材质。一轮生肖币直径为25mm。"
  },
  {
    id: 94, category: "size",
    question: "纪念钞的常见尺寸是多少？",
    options: ["100mm×50mm", "130mm×65mm", "145mm×70mm", "160mm×80mm"],
    correctIndex: 2,
    explanation: "大部分生肖纪念钞（龙钞、蛇钞、马钞）尺寸为145mm×70mm。建国钞和航天钞尺寸略有不同。"
  },
  {
    id: 95, category: "size",
    question: "世界文化遗产系列纪念币的直径是多少？",
    options: ["25mm", "27mm", "30mm", "32mm"],
    correctIndex: 2,
    explanation: "世界文化遗产系列纪念币直径均为30mm，面值5元，材质为黄铜合金。"
  },
  {
    id: 96, category: "size",
    question: "直径最大的普通纪念币是多少毫米？",
    options: ["27mm", "30mm", "32mm", "25mm"],
    correctIndex: 2,
    explanation: "32mm是普通纪念币中最大的直径，有10枚，主要包括珍稀动物系列等5元面值纪念币。"
  },
  {
    id: 97, category: "size",
    question: "泰山的异形纪念币（圆角正方形）外接圆直径是多少？",
    options: ["25mm", "27mm", "30mm", "32mm"],
    correctIndex: 2,
    explanation: "泰山纪念币（2019年）是首枚异形普通纪念币，呈圆角正方形，外接圆直径30mm，面值5元。"
  },
  {
    id: 98, category: "size",
    question: "一轮生肖纪念币（2003-2014）的直径是多少？",
    options: ["25mm", "27mm", "30mm", "32mm"],
    correctIndex: 0,
    explanation: "一轮生肖纪念币直径均为25mm，面值1元，材质为黄铜合金。二轮生肖直径增大至27mm。"
  },
  {
    id: 99, category: "size",
    question: "以下哪种直径的普通纪念币数量最多？",
    options: ["25mm", "27mm", "30mm", "32mm"],
    correctIndex: 0,
    explanation: "25mm直径的纪念币有50枚，是最常见的规格，主要包括1元面值的纪念币。30mm（44枚）是第二常见的直径。"
  },

  // ===== 背景知识 (1题) =====
  {
    id: 100, category: "knowledge",
    question: "1986年'国际和平年'纪念币的发行，与哪个国际组织的倡议有关？",
    options: ["联合国", "世界银行", "国际奥委会", "世界卫生组织"],
    correctIndex: 0,
    explanation: "1986年被联合国定为'国际和平年'，中国为此发行了国际和平年纪念币，背面图案包含'和平'雕像、地球和鸽子。"
  }
];

// 如果模块环境，导出
if (typeof module !== 'undefined' && module.exports) {
    module.exports = QUIZ_QUESTIONS;
}
