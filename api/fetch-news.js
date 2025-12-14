// 引入一个专门解析RSS的工具包
const Parser = require('rss-parser');
const parser = new Parser();

// --- 已更新：更丰富、更稳定的新闻源列表 ---
const RSS_FEEDS = [
    { name: '澎湃新闻-推荐', url: 'https://www.thepaper.cn/rss_recommend.jsp', category: '综合' },
    { name: '知乎日报', url: 'https://daily.zhihu.com/rss', category: '精选' },
    { name: '36氪', url: 'https://36kr.com/feed', category: '科技' },
    { name: '虎嗅网', url: 'https://www.huxiu.com/rss/0.xml', category: '商业' },
    { name: '少数派', url: 'https://sspai.com/feed', category: '数码' },
    { name: 'FT中文网', url: 'http://www.ftchinese.com/rss/feed', category: '财经' }
];

// 这是Vercel云函数的入口点 (此部分逻辑不变)
module.exports = async (req, res) => {
    try {
        const feedPromises = RSS_FEEDS.map(feed => 
            parser.parseURL(feed.url).then(parsedFeed => ({
                ...parsedFeed,
                sourceName: feed.name,
                sourceCategory: feed.category // 将分类信息附加到结果上
            }))
        );

        const results = await Promise.all(feedPromises);

        let allArticles = [];
        results.forEach(feed => {
            feed.items.forEach(item => {
                // 为每篇文章添加来源和整理数据
                allArticles.push({
                    title: item.title,
                    link: item.link,
                    isoDate: item.isoDate, // 使用标准时间格式
                    contentSnippet: item.contentSnippet ? item.contentSnippet.substring(0, 150) + '...' : '',
                    categories: item.categories || [],
                    sourceName: feed.sourceName,
                    sourceCategory: feed.sourceCategory // 新增的分类字段
                });
            });
        });

        const uniqueArticles = Array.from(new Map(allArticles.map(item => [item.link, item])).values());
        uniqueArticles.sort((a, b) => new Date(b.isoDate) - new Date(a.isoDate));

        res.setHeader('Cache-Control', 's-maxage=600, stale-while-revalidate');
        res.status(200).json(uniqueArticles);

    } catch (error) {
        console.error("Error fetching or parsing RSS feeds:", error);
        res.status(500).json({ error: 'Failed to fetch news.' });
    }
};
