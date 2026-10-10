'use strict';

// 生成 /search.json，供导航栏的站内搜索使用。
hexo.extend.generator.register('chiyu-search-index', function (locals) {
  const root = this.config.root || '/';
  const strip = html => String(html || '').replace(/<[^>]+>/g, ' ').replace(/&[a-z#0-9]+;/gi, ' ').replace(/\s+/g, ' ').trim();

  const data = locals.posts.sort('date', -1).map(post => ({
    title: post.title,
    url: root + post.path,
    date: post.date.format('YYYY-MM-DD'),
    tags: post.tags.map(t => t.name),
    text: strip(post.content).slice(0, 600)
  }));

  return { path: 'search.json', data: JSON.stringify(data) };
});
