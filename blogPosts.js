/* blogPosts.js —— 博客数据单一来源(blogs.html 与 blog-view.html 共用)。
 * 约定:
 *  - date 统一使用完整年份 YYYY-MM-DD;
 *  - 数组按日期升序排列,新增文章追加到末尾(列表页按数组顺序分组渲染,无需再排序);
 *  - file 与 blogs/posts/ 下的文件名一致,请勿改动已有 file 值,否则旧收藏链接会失效;
 *  - category 必须是 blogCategoryOrder 中的分组;新增分组请同步更新 blogCategoryOrder;
 *  - summary 为卡片上显示的内容简介,一两句话即可。
 */
var blogCategoryOrder = ['数学', 'Atcoder', 'Codeforces', 'CSP', 'Leetcode', '字符串', 'DS', 'dp', '散记'];

var blogPosts = [
  { title: 'Introduction to Decision Tree', date: '2026-03-16', file: 'posts/Decision-Tree.html', category: '散记', summary: '决策树入门讲义,讲解信息熵与信息增益、决策树构建与剪枝,以及随机森林(Bagging)与 Boosting 等优化算法。' },
  { title: 'Introduction to Byte Latent Transformer', date: '2026-03-18', file: 'posts/Introduction-to-BLT.html', category: '散记', summary: '介绍 Byte Latent Transformer(BLT)架构,梳理字节级局部编码器、全局 Transformer 与预测头(State / Content / Length)各模块的原理。' },
  { title: 'Leetcode Weekly Contest 494', date: '2026-03-22', file: 'posts/Leetcode-SingleRound494.html', category: 'Leetcode', summary: 'LeetCode 周赛 Round 494 题解,包含“构造奇偶一致的数组 Ⅰ/Ⅱ”“达到目标异或值的最少删除次数”“统计好子数组”四道题的题面、解析与代码。' },
  { title: '近期 dp 题总结', date: '2026-04-20', file: 'posts/近期 dp 题总结.html', category: 'dp', summary: '近期 DP 题总结,收录木棍加工、书的复制、加油问题、下午茶时光、Posterize 五道经典题,每题含题目描述、思路分析与代码。' },
  { title: '部分搜索与数学题心得', date: '2026-04-21', file: 'posts/部分搜索与数学题心得.html', category: '数学', summary: '搜索与数学题解题心得,包含机器人搬重物、Error Curves、雪中楼、Parking Party、球形空间产生器、可达性统计六道题的思路与代码。' },
  { title: 'Educational Codeforces Round 189 (Div. 2)', date: '2026-04-21', file: 'posts/Educational Codeforces Round 189 (Div. 2).html', category: 'Codeforces', summary: '记录了 Educational Codeforces Round 189 (Div. 2) 的解题过程,包含 A–D 题的题意、思路分析与代码实现。' },
  { title: 'LLM成熟框架讲解', date: '2026-05-08', file: 'posts/LLM成熟框架讲解.html', category: '散记', summary: '现代 LLM 成熟架构的中文讲义,涵盖 pre-norm 与 RMSNorm、SwiGLU、RoPE、超参数默认值、稳定性技巧(z-loss、QK norm)以及 MQA/GQA 等注意力变体。' },
  { title: 'CF Round 1098 Div 2', date: '2026-05-17', file: 'posts/CF Round 1098 Div 2.html', category: 'Codeforces', summary: 'Codeforces Round 1098 (Div. 2) 参赛记录(最终排名 136/17259),包含 A–E1 题的题意、思路与代码。' },
  { title: '生成函数', date: '2026-05-19', file: 'posts/生成函数.html', category: '数学', summary: '生成函数学习笔记,系统讲解形式幂级数、普通/指数生成函数、整数分拆(含欧拉五边形数定理)、Catalan 数与生成函数复合等核心内容。' },
  { title: '集合论', date: '2026-05-19', file: 'posts/集合论.html', category: '数学', summary: '集合论学习笔记,系统讲解集合代数与容斥、二元关系及其闭包、等价与偏序、函数与基数(含 Cantor 定理与对角线法)。' },
  { title: 'CF Round 1099 Div 2', date: '2026-05-22', file: 'posts/CF Round 1099 Div 2.html', category: 'Codeforces', summary: 'Codeforces Round 1099 (Div. 2) 参赛记录(最终排名 544/17621),包含 A–D 题的题意、思路与代码。' },
  { title: 'DS 专项训练 Day1', date: '2026-09-23', file: 'posts/DS 专项训练 Day1.html', category: 'DS', summary: '数据结构专项训练 Day1,收录 Rocks Defenders、Range Update Point Query、MEX maximizing、Array Partition 四题,讲解如何抓住值得维护的量来优化复杂度。' },
  { title: 'ABC 477', date: '2026-09-28', file: 'posts/ABC 477.html', category: 'Atcoder', summary: 'AtCoder ABC 477 题解,包含 C–G 题(Range Search Query、Masking Tape、Wheel Distance、Count Cells in a Window、Frequency Query on Tree)的题意、思路与代码。' },
  { title: '国庆集训 Day2', date: '2026-10-03', file: 'posts/国庆集训 Day2.html', category: '散记', summary: '国庆集训 Day2 总结,记录 Square Jam(贪心递归切分)、Game(博弈 + 线性基判平局)、Error Permutation(计数)三道题的思路与心得。' },
  { title: '国庆训练随记 Day7', date: '2026-10-09', file: 'posts/国庆训练随记 Day7.html', category: '散记', summary: '国庆训练随记 Day7,记录 Range Update Point Query(线段树维护区间最大值避免无效访问)与 It All Went Sideways(后缀最小值)两题的思路与反思。' },
  { title: 'DS 专项训练 Day2', date: '2026-10-10', file: 'posts/DS 专项训练 Day2.html', category: 'DS', summary: '数据结构专项训练 Day2(2026.10.10),包含 Knife\'s Pill Farm、Falling Concrete、What a SauSaGe! It\'s All Meat 三道题的记录与题解。' },
  { title: 'CSP36 题解', date: '2026-10-11', file: 'posts/CSP36 题解.html', category: 'CSP', summary: 'CSP36 比赛题解,包含移动、梦境巡查、缓存模拟、跳房子、梦魇五道题的题意、思路与代码。' },
  { title: '字符串学习笔记 1', date: '2026-10-12', file: 'posts/字符串学习笔记 1.html', category: '字符串', summary: '字符串算法学习笔记第一篇,系统整理字符串 Hash(含碰撞分析与 Hack)、KMP 与 Z 函数、Trie、AC 自动机及后缀数组。' },
  { title: 'ABC 479', date: '2026-10-21', file: 'posts/ABC 479.html', category: 'Atcoder', summary: 'AtCoder ABC 479 题解,包含 C. Bento Packing、D. Back and Forth Distance、F. Narrow Passage 三道题的题意、思路与代码。' },
  { title: 'ABC 481', date: '2026-10-25', file: 'posts/ABC 481.html', category: 'Atcoder', summary: 'AtCoder ABC 481 题解,包含 B–G 六道题(Polyline、Bank Accounts、Autopilot、Most Brilliant Starry Sky、Evil Shortest Path、Half-Baked)的题意、思路与代码。' }
];
