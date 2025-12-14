// 引入一个专门解析RSS的工具包
const Parser = require('rss-parser');
const parser = new Parser();

// 定义我们要抓取的新闻源
const RSS_FEEDS = [
{ name: '路透社-国际要闻', url: 'http://feeds.reuters.com/reuters/worldNews' },
];

// 这是Vercel云函数的入口点
module.exports = async (req, res) => {
    try {
        // 并发请求所有RSS源
        const feedPromises = RSS_FEEDS.map(feed => 
            parser.parseURL(feed.url).then(parsedFeed => ({
                ...parsedFeed,
                sourceName: feed.name // 将来源名称附加到解析结果上
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
                    sourceName: feed.sourceName
                });
            });
        });

        // 去重并按最新时间排序
        const uniqueArticles = Array.from(new Map(allArticles.map(item => [item.link, item])).values());
        uniqueArticles.sort((a, b) => new Date(b.isoDate) - new Date(a.isoDate));

        // 设置缓存，让API在10分钟内对相同请求返回相同结果，提高效率
        res.setHeader('Cache-Control', 's-maxage=600, stale-while-revalidate');
        
        // 成功时，返回JSON格式的新闻列表
        res.status(200).json(uniqueArticles);

    } catch (error) {
        console.error("Error fetching or parsing RSS feeds:", error);
        // 失败时，返回错误信息
        res.status(500).json({ error: 'Failed to fetch news.' });
    }
};
